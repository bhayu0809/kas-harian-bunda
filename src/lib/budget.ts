import type { Transaction } from "@/lib/db/types";

// Pure budget/pace logic — given the month's spending so far, project whether
// the monthly budget will be exhausted before the month ends.

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  daysElapsed: number;
  daysInMonth: number;
  projectedSpend: number;
  shouldAlert: boolean;
  exceeded: boolean;
  monthKey: string; // "YYYY-MM" — used to de-duplicate notifications per month
  message: string;
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace("Rp", "Rp ");

function monthlyExpense(transactions: Transaction[], now: Date): number {
  return transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getBudgetStatus(
  transactions: Transaction[],
  budget: number,
  now: Date = new Date()
): BudgetStatus {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const spent = monthlyExpense(transactions, now);
  const remaining = budget - spent;
  const projectedSpend = daysElapsed > 0 ? (spent * daysInMonth) / daysElapsed : spent;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const exceeded = budget > 0 && remaining <= 0;
  // Require a few days of data so a single early purchase doesn't trip the alarm.
  const overPace = budget > 0 && daysElapsed >= 3 && projectedSpend > budget;
  const shouldAlert = exceeded || overPace;

  let message = "";
  if (exceeded) {
    message = `Anggaran bulanan sudah terlampaui — belanja ${formatRupiah(spent)} dari ${formatRupiah(budget)}.`;
  } else if (overPace) {
    message = `Belanja bulan ini ${formatRupiah(spent)} dari anggaran ${formatRupiah(
      budget
    )}. Dengan laju ini, anggaran diperkirakan habis sebelum akhir bulan.`;
  }

  return { budget, spent, remaining, daysElapsed, daysInMonth, projectedSpend, shouldAlert, exceeded, monthKey, message };
}
