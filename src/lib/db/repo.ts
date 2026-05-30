import { getDb, persist } from "./sqlite";
import type { Category, Transaction } from "./types";

// Thin, typed repository over the SQLite database. Reads are synchronous;
// writes persist the database snapshot to IndexedDB before resolving.

function rows<T>(sql: string): T[] {
  const stmt = getDb().prepare(sql);
  const out: T[] = [];
  while (stmt.step()) out.push(stmt.getAsObject() as T);
  stmt.free();
  return out;
}

// --- Transactions ----------------------------------------------------------

export function listTransactions(): Transaction[] {
  return rows<Transaction>("SELECT * FROM transactions ORDER BY date DESC");
}

export async function addTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  const tx: Transaction = { ...input, id: `tx-${Date.now()}` };
  getDb().run(
    "INSERT INTO transactions (id, label, amount, type, category, date, notes, source) VALUES (?,?,?,?,?,?,?,?)",
    [tx.id, tx.label, tx.amount, tx.type, tx.category, tx.date, tx.notes ?? null, tx.source]
  );
  await persist();
  return tx;
}

// --- Categories ------------------------------------------------------------

export function listCategories(): Category[] {
  return rows<Category>("SELECT * FROM categories ORDER BY rowid ASC");
}

export async function addCategory(input: Omit<Category, "id">): Promise<Category> {
  const cat: Category = { ...input, id: `cat-${Date.now()}` };
  getDb().run(
    "INSERT INTO categories (id, name, description, icon, colorType) VALUES (?,?,?,?,?)",
    [cat.id, cat.name, cat.description, cat.icon, cat.colorType]
  );
  await persist();
  return cat;
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
