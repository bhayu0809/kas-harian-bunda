import { getDb, persist } from "./sqlite";
import type {
  Category,
  CategoryBudgetMap,
  RecurringTransaction,
  Transaction,
  TransactionInput,
  TransactionTemplate,
} from "./types";

// Thin, typed repository over the SQLite database. Reads are synchronous;
// writes persist the database snapshot to IndexedDB before resolving.

function rows<T>(sql: string): T[] {
  const stmt = getDb().prepare(sql);
  const out: T[] = [];
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Transactions ----------------------------------------------------------

export function listTransactions(): Transaction[] {
  return rows<Transaction>("SELECT * FROM transactions ORDER BY date DESC");
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const tx: Transaction = { ...input, id: id("tx") };
  getDb().run(
    "INSERT INTO transactions (id, label, amount, type, category, date, notes, source) VALUES (?,?,?,?,?,?,?,?)",
    [tx.id, tx.label, tx.amount, tx.type, tx.category, tx.date, tx.notes ?? null, tx.source]
  );
  await persist();
  return tx;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  getDb().run(
    "UPDATE transactions SET label = ?, amount = ?, type = ?, category = ?, date = ?, notes = ?, source = ? WHERE id = ?",
    [input.label, input.amount, input.type, input.category, input.date, input.notes ?? null, input.source, id]
  );
  await persist();
  return { ...input, id };
}

export async function deleteTransaction(id: string): Promise<void> {
  getDb().run("DELETE FROM transactions WHERE id = ?", [id]);
  await persist();
}

export async function duplicateTransaction(id: string, date: string): Promise<Transaction | null> {
  const source = listTransactions().find((tx) => tx.id === id);
  if (!source) return null;
  return addTransaction({
    label: source.label,
    amount: source.amount,
    type: source.type,
    category: source.category,
    date,
    notes: source.notes,
    source: source.source,
  });
}

// --- Quick templates -------------------------------------------------------

export function listTransactionTemplates(): TransactionTemplate[] {
  return rows<TransactionTemplate>("SELECT * FROM transaction_templates ORDER BY rowid DESC");
}

export async function addTransactionTemplate(input: Omit<TransactionTemplate, "id">): Promise<TransactionTemplate> {
  const template: TransactionTemplate = { ...input, id: id("tpl") };
  getDb().run(
    "INSERT INTO transaction_templates (id, label, amount, type, category, notes, source) VALUES (?,?,?,?,?,?,?)",
    [template.id, template.label, template.amount, template.type, template.category, template.notes ?? null, template.source]
  );
  await persist();
  return template;
}

export async function deleteTransactionTemplate(id: string): Promise<void> {
  getDb().run("DELETE FROM transaction_templates WHERE id = ?", [id]);
  await persist();
}

// --- Monthly recurring transactions ---------------------------------------

function normalizeRecurring(row: RecurringTransaction): RecurringTransaction {
  return { ...row, active: Number(row.active) === 1 };
}

export function listRecurringTransactions(): RecurringTransaction[] {
  return rows<RecurringTransaction>("SELECT * FROM recurring_transactions ORDER BY rowid DESC").map(normalizeRecurring);
}

export async function addRecurringTransaction(input: Omit<RecurringTransaction, "id" | "active" | "lastRunMonth">): Promise<RecurringTransaction> {
  const recurring: RecurringTransaction = { ...input, id: id("rec"), active: true, lastRunMonth: undefined };
  getDb().run(
    "INSERT INTO recurring_transactions (id, label, amount, type, category, notes, source, dayOfMonth, active, lastRunMonth) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      recurring.id,
      recurring.label,
      recurring.amount,
      recurring.type,
      recurring.category,
      recurring.notes ?? null,
      recurring.source,
      recurring.dayOfMonth,
      1,
      null,
    ]
  );
  await persist();
  return recurring;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  getDb().run("DELETE FROM recurring_transactions WHERE id = ?", [id]);
  await persist();
}

export async function applyDueRecurringTransactions(now = new Date()): Promise<Transaction[]> {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const created: Transaction[] = [];

  for (const recurring of listRecurringTransactions()) {
    if (!recurring.active || recurring.lastRunMonth === monthKey) continue;
    const runDay = Math.min(recurring.dayOfMonth, daysInMonth);
    if (now.getDate() < runDay) continue;

    const date = new Date(now.getFullYear(), now.getMonth(), runDay, now.getHours(), now.getMinutes(), now.getSeconds());
    const tx = await addTransaction({
      label: recurring.label,
      amount: recurring.amount,
      type: recurring.type,
      category: recurring.category,
      date: date.toISOString(),
      notes: recurring.notes,
      source: recurring.source,
    });
    getDb().run("UPDATE recurring_transactions SET lastRunMonth = ? WHERE id = ?", [monthKey, recurring.id]);
    created.push(tx);
  }

  if (created.length > 0) await persist();
  return created;
}

// --- Categories ------------------------------------------------------------

export function listCategories(): Category[] {
  return rows<Category>("SELECT * FROM categories ORDER BY rowid ASC");
}

export async function addCategory(input: Omit<Category, "id">): Promise<Category> {
  const cat: Category = { ...input, id: id("cat") };
  getDb().run(
    "INSERT INTO categories (id, name, description, icon, colorType) VALUES (?,?,?,?,?)",
    [cat.id, cat.name, cat.description, cat.icon, cat.colorType]
  );
  await persist();
  return cat;
}

export async function updateCategory(id: string, input: Omit<Category, "id">): Promise<Category> {
  const database = getDb();
  const prev = listCategories().find((c) => c.id === id);
  database.run(
    "UPDATE categories SET name = ?, description = ?, icon = ?, colorType = ? WHERE id = ?",
    [input.name, input.description, input.icon, input.colorType, id]
  );
  // Transactions reference categories by name, so cascade a rename to keep
  // existing records linked to the renamed category.
  if (prev && prev.name !== input.name) {
    database.run("UPDATE transactions SET category = ? WHERE category = ?", [input.name, prev.name]);
    database.run("UPDATE transaction_templates SET category = ? WHERE category = ?", [input.name, prev.name]);
    database.run("UPDATE recurring_transactions SET category = ? WHERE category = ?", [input.name, prev.name]);
    database.run("UPDATE OR REPLACE category_budgets SET category = ? WHERE category = ?", [input.name, prev.name]);
  }
  await persist();
  return { ...input, id };
}

// --- Category budgets (monthly cap per category) ---------------------------

export function listCategoryBudgets(): CategoryBudgetMap {
  const out: CategoryBudgetMap = {};
  rows<{ category: string; amount: number }>("SELECT category, amount FROM category_budgets").forEach((r) => {
    out[r.category] = Number(r.amount);
  });
  return out;
}

export async function setCategoryBudget(category: string, amount: number): Promise<void> {
  if (amount > 0) {
    getDb().run("INSERT OR REPLACE INTO category_budgets (category, amount) VALUES (?, ?)", [category, amount]);
  } else {
    getDb().run("DELETE FROM category_budgets WHERE category = ?", [category]);
  }
  await persist();
}

// --- Settings (key/value) --------------------------------------------------

export function getSetting(key: string): string | null {
  const stmt = getDb().prepare("SELECT value FROM settings WHERE key = ?");
  stmt.bind([key]);
  const value = stmt.step() ? (stmt.getAsObject().value as string) : null;
  stmt.free();
  return value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  getDb().run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
  await persist();
}
