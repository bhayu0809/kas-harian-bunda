import { exportStoredBytes, replaceStoredBytes } from "@/lib/db/sqlite";
import { getSetting, setSetting } from "@/lib/db/repo";
import type { AutoBackupFrequency, AutoBackupSnapshot } from "@/lib/db/types";

const IDB_NAME = "kas-harian-auto-backups";
const IDB_STORE = "snapshots";

const ENABLED_KEY = "auto_backup_enabled";
const FREQUENCY_KEY = "auto_backup_frequency";
const LAST_RUN_KEY = "auto_backup_last_run";
const KEEP_KEY = "auto_backup_keep";

export const DEFAULT_AUTO_BACKUP_FREQUENCY: AutoBackupFrequency = "daily";
export const DEFAULT_AUTO_BACKUP_KEEP = 5;

type StoredAutoBackupSnapshot = AutoBackupSnapshot & { bytes: Uint8Array };

function id(): string {
  return `ab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putSnapshot(snapshot: StoredAutoBackupSnapshot): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSnapshot(id: string): Promise<StoredAutoBackupSnapshot | null> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const req = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve((req.result as StoredAutoBackupSnapshot | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function getAllSnapshots(): Promise<StoredAutoBackupSnapshot[]> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const req = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredAutoBackupSnapshot[]).sort(sortNewestFirst));
    req.onerror = () => reject(req.error);
  });
}

async function removeSnapshot(id: string): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearSnapshots(): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function sortNewestFirst(a: AutoBackupSnapshot, b: AutoBackupSnapshot): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function withoutBytes(snapshot: StoredAutoBackupSnapshot): AutoBackupSnapshot {
  return {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    reason: snapshot.reason,
    size: snapshot.size,
  };
}

function validFrequency(value: string | null): AutoBackupFrequency {
  return value === "weekly" || value === "monthly" || value === "daily" ? value : DEFAULT_AUTO_BACKUP_FREQUENCY;
}

function configuredKeep(): number {
  const value = Number(getSetting(KEEP_KEY) ?? DEFAULT_AUTO_BACKUP_KEEP);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_AUTO_BACKUP_KEEP;
}

function dateKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function isDue(lastRun: string | null, frequency: AutoBackupFrequency, now: Date): boolean {
  if (!lastRun) return true;
  const last = new Date(lastRun);
  if (Number.isNaN(last.getTime())) return true;

  if (frequency === "daily") return dateKey(last) !== dateKey(now);
  if (frequency === "weekly") return now.getTime() - last.getTime() >= 7 * 24 * 60 * 60 * 1000;
  return last.getFullYear() !== now.getFullYear() || last.getMonth() !== now.getMonth();
}

async function pruneSnapshots(keep = configuredKeep()): Promise<void> {
  const snapshots = await getAllSnapshots();
  await Promise.all(snapshots.slice(keep).map((snapshot) => removeSnapshot(snapshot.id)));
}

export function autoBackupEnabled(): boolean {
  return getSetting(ENABLED_KEY) === "true";
}

export function autoBackupFrequency(): AutoBackupFrequency {
  return validFrequency(getSetting(FREQUENCY_KEY));
}

export function autoBackupLastRun(): string | null {
  return getSetting(LAST_RUN_KEY);
}

export function autoBackupKeep(): number {
  return configuredKeep();
}

export async function setAutoBackupEnabled(enabled: boolean): Promise<void> {
  await setSetting(ENABLED_KEY, String(enabled));
}

export async function setAutoBackupFrequency(frequency: AutoBackupFrequency): Promise<void> {
  await setSetting(FREQUENCY_KEY, frequency);
}

export async function setAutoBackupKeep(keep: number): Promise<void> {
  await setSetting(KEEP_KEY, String(Math.max(1, Math.floor(keep))));
}

export async function listAutoBackups(): Promise<AutoBackupSnapshot[]> {
  return (await getAllSnapshots()).map(withoutBytes);
}

export async function createAutoBackup(reason = "manual"): Promise<AutoBackupSnapshot> {
  const bytes = await exportStoredBytes();
  const snapshot: StoredAutoBackupSnapshot = {
    id: id(),
    createdAt: new Date().toISOString(),
    reason,
    size: bytes.byteLength,
    bytes: new Uint8Array(bytes),
  };

  await putSnapshot(snapshot);
  await pruneSnapshots();
  await setSetting(LAST_RUN_KEY, snapshot.createdAt);
  return withoutBytes(snapshot);
}

export async function maybeRunAutoBackup(reason = "scheduled", now = new Date()): Promise<AutoBackupSnapshot | null> {
  if (!autoBackupEnabled()) return null;
  if (!isDue(autoBackupLastRun(), autoBackupFrequency(), now)) return null;
  return createAutoBackup(reason);
}

export async function restoreAutoBackup(id: string): Promise<void> {
  const snapshot = await getSnapshot(id);
  if (!snapshot) throw new Error("Backup otomatis tidak ditemukan.");
  await replaceStoredBytes(new Uint8Array(snapshot.bytes));
}

export async function deleteAutoBackup(id: string): Promise<void> {
  await removeSnapshot(id);
}

export async function clearAutoBackups(): Promise<void> {
  await clearSnapshots();
}
