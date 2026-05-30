import type { Category, Transaction } from "./types";

// Default data used the first time the database is created (empty IndexedDB).
// The dates are relative to "now" so the dashboard / ringkasan always show
// fresh-looking activity for the current month.

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Belanja Dapur", description: "Kebutuhan pokok", icon: "shopping_cart", colorType: "secondary" },
  { id: "cat-2", name: "Makan Luar", description: "Restoran & Cafe", icon: "restaurant", colorType: "tertiary" },
  { id: "cat-3", name: "Transportasi", description: "Bensin & Tol", icon: "directions_car", colorType: "primary" },
  { id: "cat-4", name: "Tagihan", description: "Listrik, Air, Internet", icon: "electric_bolt", colorType: "error" },
  { id: "cat-5", name: "Kesehatan", description: "Obat & Dokter", icon: "medical_services", colorType: "secondary-fixed" },
  { id: "cat-6", name: "Pendidikan", description: "SPP & Buku", icon: "school", colorType: "primary-fixed" },
];

const daysAgo = (days: number, hours = 9, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: "tx-1", label: "Belanja Mingguan", amount: 350000, type: "expense", category: "Belanja Dapur", date: daysAgo(0, 9, 41), notes: "Supermarket", source: "Tunai" },
  { id: "tx-2", label: "Makan Malam Keluarga", amount: 250000, type: "expense", category: "Makan Luar", date: daysAgo(1, 19, 30), notes: "Restoran", source: "Tunai" },
  { id: "tx-3", label: "Gaji Bulanan", amount: 8500000, type: "income", category: "Pendapatan", date: daysAgo(5, 8, 0), notes: "Gaji bulanan kantor", source: "Transfer" },
  { id: "tx-4", label: "Isi Bensin Mobil", amount: 400000, type: "expense", category: "Transportasi", date: daysAgo(6, 16, 15), notes: "Pertamax", source: "Transfer" },
  { id: "tx-5", label: "Tagihan Listrik", amount: 750000, type: "expense", category: "Tagihan", date: daysAgo(10, 10, 0), notes: "PLN Pascabayar", source: "E-Wallet" },
];

export const DEFAULT_SAVINGS_TARGET = 1000000;
export const DEFAULT_SAVED_AMOUNT = 750000;
export const DEFAULT_PIN = "1234";
