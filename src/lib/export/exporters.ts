import { exportBytes, replaceDb } from "@/lib/db/sqlite";
import type { Transaction } from "@/lib/db/types";

// Backup / restore helpers. Two export shapes:
//  - full .db snapshot (re-importable backup)
//  - CSV of transactions (opens in Excel / Google Sheets)

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (value: string | number) => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Download the entire database as a re-importable .db file. */
export function exportDbFile(): void {
  const bytes = exportBytes();
  // Copy into a plain ArrayBuffer so the Blob typing is unambiguous.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  download(new Blob([buffer], { type: "application/x-sqlite3" }), `kas-harian-backup-${stamp()}.db`);
}

/** Download all transactions as a UTF-8 CSV (BOM included for Excel). */
export function exportCsv(transactions: Transaction[]): void {
  const header = ["Tanggal", "Tipe", "Label", "Kategori", "Nominal", "Sumber", "Catatan"];
  const lines = transactions.map((t) =>
    [
      new Date(t.date).toLocaleString("id-ID"),
      t.type === "income" ? "Pemasukan" : "Pengeluaran",
      t.label,
      t.category,
      t.amount,
      t.source,
      t.notes ?? "",
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `kas-harian-${stamp()}.csv`);
}

/** Restore the database from a previously exported .db file. */
export async function importDbFile(file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  await replaceDb(new Uint8Array(buffer));
}
