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

/** Total expense per category for the current month. */
export function monthlyExpenseByCategory(transactions: Transaction[], now: Date = new Date()): Record<string, number> {
  const out: Record<string, number> = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (t.type !== "expense" || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
    out[t.category] = (out[t.category] ?? 0) + t.amount;
  });
  return out;
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

/** Monday 00:00 of the week containing `now`. */
function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return d;
}

function weeklyExpense(transactions: Transaction[], now: Date): number {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d >= start && d < end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Expenses in the current month split into "before today" and "today". Used to
 *  accumulate the daily allowance (rollover) from the start of the month. */
function monthlyExpenseSplit(transactions: Transaction[], now: Date): { before: number; today: number } {
  let before = 0;
  let today = 0;
  transactions.forEach((t) => {
    if (t.type !== "expense") return;
    const d = new Date(t.date);
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
    if (d.getDate() < now.getDate()) before += t.amount;
    else if (d.getDate() === now.getDate()) today += t.amount;
  });
  return { before, today };
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

export interface DailyAllowanceStatus extends BudgetStatus {
  /** Accumulated surplus (+) or deficit (−) carried in from earlier days this
   *  month. Zero when rollover is disabled. */
  rollover: number;
  /** Daily limit plus rollover — the allowance actually available today. */
  effectiveToday: number;
  /** Spent today only. */
  spentToday: number;
}

/** Daily spending limit with optional rollover: each day grants `limit`, and any
 *  unused (or overspent) amount accumulates across the current month. The
 *  reference is the daily limit; the window resets at the start of each month. */
export function getDailyAllowanceStatus(
  transactions: Transaction[],
  limit: number,
  rolloverEnabled = true,
  now: Date = new Date()
): DailyAllowanceStatus {
  const daysElapsed = now.getDate(); // 1-based, includes today
  const { before, today: spentToday } = monthlyExpenseSplit(transactions, now);

  // Pool granted before today minus what was already spent before today.
  const rollover = rolloverEnabled ? limit * (daysElapsed - 1) - before : 0;
  const effectiveToday = limit + rollover;
  const remaining = effectiveToday - spentToday;
  const exceeded = limit > 0 && remaining < 0;

  let message = "";
  if (exceeded) {
    message = rolloverEnabled
      ? `Jatah harian terkumpul terlampaui — belanja hari ini ${formatRupiah(spentToday)}, jatah tersisa ${formatRupiah(remaining)}.`
      : `Batas pengeluaran harian sudah terlampaui — belanja hari ini ${formatRupiah(spentToday)} dari ${formatRupiah(limit)}.`;
  }

  return {
    key: `daily-${dateKey(now)}`,
    title: "Jatah Harian",
    budget: limit,
    spent: spentToday,
    remaining,
    rollover,
    effectiveToday,
    spentToday,
    shouldAlert: exceeded,
    exceeded,
    message,
  };
}

export function getWeeklySpendingStatus(
  transactions: Transaction[],
  limit: number,
  now: Date = new Date()
): BudgetStatus {
  const spent = weeklyExpense(transactions, now);
  const remaining = limit - spent;
  const exceeded = limit > 0 && remaining <= 0;
  const message = exceeded
    ? `Batas pengeluaran mingguan sudah terlampaui — belanja minggu ini ${formatRupiah(spent)} dari ${formatRupiah(limit)}.`
    : "";

  return {
    key: `weekly-${dateKey(startOfWeek(now))}`,
    title: "Batas Mingguan",
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
