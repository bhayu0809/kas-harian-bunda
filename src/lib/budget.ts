import type { Transaction } from "@/lib/db/types";

// Pure spending-limit logic — given the month's spending so far, project
// whether the configured monthly expense limit may be hit before month-end.

export interface BudgetStatus {
  key: string;
  title: string;
  budget: number;
  spent: number;
  remaining: number;
  daysElapsed?: number;
  daysInMonth?: number;
  projectedSpend?: number;
  shouldAlert: boolean;
  exceeded: boolean;
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

function dailyExpense(transactions: Transaction[], now: Date): number {
  return transactions
    .filter((t) => {
      const d = new Date(t.date);
      return (
        t.type === "expense" &&
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function dateKey(now: Date): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getDailySpendingStatus(
  transactions: Transaction[],
  limit: number,
  now: Date = new Date()
): BudgetStatus {
  const spent = dailyExpense(transactions, now);
  const remaining = limit - spent;
  const exceeded = limit > 0 && remaining <= 0;
  const message = exceeded
    ? `Batas pengeluaran harian sudah terlampaui — belanja hari ini ${formatRupiah(spent)} dari ${formatRupiah(limit)}.`
    : "";

  return {
    key: `daily-${dateKey(now)}`,
    title: "Batas Harian",
    budget: limit,
    spent,
    remaining,
    shouldAlert: exceeded,
    exceeded,
    message,
  };
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

  const exceeded = budget > 0 && remaining <= 0;
  // Require a few days of data so a single early purchase doesn't trip the alarm.
  const overPace = budget > 0 && daysElapsed >= 3 && projectedSpend > budget;
  const shouldAlert = exceeded || overPace;

  let message = "";
  if (exceeded) {
    message = `Batas pengeluaran bulanan sudah terlampaui — belanja ${formatRupiah(spent)} dari ${formatRupiah(budget)}.`;
  } else if (overPace) {
    message = `Belanja bulan ini ${formatRupiah(spent)} dari batas ${formatRupiah(
      budget
    )}. Dengan laju ini, batas pengeluaran bisa terlampaui sebelum akhir bulan.`;
  }

  return {
    key: `monthly-${monthKey(now)}`,
    title: "Batas Pengeluaran",
    budget,
    spent,
    remaining,
    daysElapsed,
    daysInMonth,
    projectedSpend,
    shouldAlert,
    exceeded,
    message,
  };
}
