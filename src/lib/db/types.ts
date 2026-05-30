// Shared domain types for the cash-record app.
// Kept in the db layer so both the repository and the React context can import
// them without creating a circular dependency.

export interface Transaction {
  id: string;
  label: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // ISO String
  notes?: string;
  source: "Tunai" | "Transfer" | "E-Wallet";
}

export type TransactionInput = Omit<Transaction, "id">;
export type TransactionSource = Transaction["source"];
export type TransactionType = Transaction["type"];

export interface TransactionTemplate {
  id: string;
  label: string;
  amount: number;
  type: TransactionType;
  category: string;
  notes?: string;
  source: TransactionSource;
}

export interface RecurringTransaction extends TransactionTemplate {
  dayOfMonth: number;
  active: boolean;
  lastRunMonth?: string;
}

export type AutoBackupFrequency = "daily" | "weekly" | "monthly";

export interface AutoBackupSnapshot {
  id: string;
  createdAt: string;
  reason: string;
  size: number;
}

export type CategoryColor =
  | "secondary"
  | "tertiary"
  | "primary"
  | "error"
  | "secondary-fixed"
  | "primary-fixed";

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorType: CategoryColor;
}

/** Monthly spending cap for a single category (keyed by category name). */
export type CategoryBudgetMap = Record<string, number>;

/** Money moved between wallets (does not affect income/expense totals). */
export interface Transfer {
  id: string;
  amount: number;
  fromSource: TransactionSource;
  toSource: TransactionSource;
  date: string; // ISO string
  notes?: string;
}

export type DebtKind = "utang" | "piutang"; // utang = kita berhutang; piutang = orang berhutang ke kita

export interface Debt {
  id: string;
  kind: DebtKind;
  person: string;
  label: string;
  amount: number;
  paidAmount: number;
  dueDate?: string; // ISO string (date only)
  settled: boolean;
  createdAt: string; // ISO string
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  icon: string;
  createdAt: string; // ISO string
}
