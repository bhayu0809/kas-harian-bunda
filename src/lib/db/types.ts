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
