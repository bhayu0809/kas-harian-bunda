import type { Database, SqlJsStatic } from "sql.js";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SAVED_AMOUNT,
  DEFAULT_SAVINGS_TARGET,
  DEFAULT_TRANSACTIONS,
} from "./seed";

// ---------------------------------------------------------------------------
// Browser-only SQLite (sql.js / WASM) with the whole database persisted as a
// single blob in IndexedDB. The dataset for a household cash book is tiny, so
// re-exporting the full DB on each write is more than fast enough and keeps the
// persistence model trivial and reliable across devices (incl. iOS Safari).
// ---------------------------------------------------------------------------

// Bumped from "kas-harian" to drop the old dummy-seeded database so existing
// installs start fresh with the clean seed.
const IDB_NAME = "kas-harian-v2";
const IDB_STORE = "sqlite";
const IDB_KEY = "db";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    source TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    colorType TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBytes(): Promise<Uint8Array | null> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const req = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function seedDefaults(database: Database) {
  const cat = database.prepare(
    "INSERT INTO categories (id, name, description, icon, colorType) VALUES (?,?,?,?,?)"
  );
  DEFAULT_CATEGORIES.forEach((c) => cat.run([c.id, c.name, c.description, c.icon, c.colorType]));
  cat.free();

  const tx = database.prepare(
    "INSERT INTO transactions (id, label, amount, type, category, date, notes, source) VALUES (?,?,?,?,?,?,?,?)"
  );
  DEFAULT_TRANSACTIONS.forEach((t) =>
    tx.run([t.id, t.label, t.amount, t.type, t.category, t.date, t.notes ?? null, t.source])
  );
  tx.free();

  // INSERT OR REPLACE so this is safe to call again during a reset.
  database.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?), (?,?)", [
    "savings_target",
    String(DEFAULT_SAVINGS_TARGET),
    "saved_amount",
    String(DEFAULT_SAVED_AMOUNT),
  ]);
}

/** Initialise the engine + database once. Loads existing data from IndexedDB
 *  or creates a freshly seeded database on first run. */
export async function initDb(): Promise<Database> {
  if (db) return db;

  if (!SQL) {
    const initSqlJs = (await import("sql.js")).default;
    SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  }

  const existing = await loadBytes();
  if (existing) {
    db = new SQL.Database(existing);
    db.run(SCHEMA); // ensure tables exist for older blobs
  } else {
    db = new SQL.Database();
    db.run(SCHEMA);
    seedDefaults(db);
    await saveBytes(db.export());
  }
  return db;
}

/** Wipe all transactions & categories and restore defaults (keeps PIN/biometric
 *  settings). Savings figures are reset to zero. */
export async function resetToDefaults(): Promise<void> {
  const database = getDb();
  database.run("DELETE FROM transactions");
  database.run("DELETE FROM categories");
  seedDefaults(database);
  await saveBytes(database.export());
}

/** Current database handle (throws if used before initDb resolves). */
export function getDb(): Database {
  if (!db) throw new Error("Database belum diinisialisasi. Panggil initDb() lebih dulu.");
  return db;
}

/** Replace the active database (used by import / restore) and persist it. */
export async function replaceDb(bytes: Uint8Array): Promise<Database> {
  if (!SQL) throw new Error("SQL engine belum siap.");
  db = new SQL.Database(bytes);
  db.run(SCHEMA);
  await saveBytes(db.export());
  return db;
}

/** Snapshot the whole database to IndexedDB. Call after every write. */
export async function persist(): Promise<void> {
  if (db) await saveBytes(db.export());
}

/** Raw bytes of the current database (used for .db export). */
export function exportBytes(): Uint8Array {
  return getDb().export();
}
