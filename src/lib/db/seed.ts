import type { Category, Transaction } from "./types";

// Default data used the first time the database is created (empty IndexedDB).
// Transactions start empty and savings start at zero so the app opens as a
// clean slate — only a set of ready-to-use categories is provided.

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Belanja Dapur", description: "Kebutuhan pokok", icon: "shopping_cart", colorType: "secondary" },
  { id: "cat-2", name: "Makan Luar", description: "Restoran & Cafe", icon: "restaurant", colorType: "tertiary" },
  { id: "cat-3", name: "Transportasi", description: "Bensin & Tol", icon: "directions_car", colorType: "primary" },
  { id: "cat-4", name: "Tagihan", description: "Listrik, Air, Internet", icon: "electric_bolt", colorType: "error" },
  { id: "cat-5", name: "Kesehatan", description: "Obat & Dokter", icon: "medical_services", colorType: "secondary-fixed" },
  { id: "cat-6", name: "Pendidikan", description: "SPP & Buku", icon: "school", colorType: "primary-fixed" },
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [];

export const DEFAULT_SAVINGS_TARGET = 0;
export const DEFAULT_SAVED_AMOUNT = 0;
export const DEFAULT_MONTHLY_BUDGET = 0; // 0 = pengingat batas pengeluaran mati
export const DEFAULT_DAILY_SPENDING_LIMIT = 0; // 0 = pengingat batas harian mati
export const DEFAULT_PIN = "123456";
