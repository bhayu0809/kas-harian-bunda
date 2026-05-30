"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";

// Format Currency Utility Helper
const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace("Rp", "Rp ");
};

// Format Date Utility Helper
const formatTxDate = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `Hari ini, ${hours}:${minutes}`;
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `Kemarin, ${hours}:${minutes}`;
  }

  // Otherwise standard date format
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export default function DashboardPage() {
  const { 
    transactions, 
    categories, 
    savingsTarget, 
    savedAmount, 
    setSavingsTarget, 
    setSavedAmount 
  } = useApp();
  const router = useRouter();

  // Dialog state for editing savings goal
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempTarget, setTempTarget] = useState(savingsTarget);
  const [tempSaved, setTempSaved] = useState(savedAmount);

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentSaldo = totalIncome - totalExpense;

  // Savings progress calculations (guard against an unset / zero target)
  const progressPercent =
    savingsTarget > 0
      ? Math.min(Math.round((savedAmount / savingsTarget) * 100), 100)
      : 0;

  // Get last 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingsTarget(tempTarget);
    setSavedAmount(tempSaved);
    setIsEditingGoal(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-12 max-w-7xl mx-auto w-full space-y-10">
        
        {/* Top Section: Saldo & Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Saldo Card */}
          <div className="xl:col-span-7 bg-surface-container-lowest rounded-3xl p-8 shadow-lux flex flex-col justify-between relative overflow-hidden group">
            {/* Decorative background glow */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary-container rounded-full blur-3xl opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    account_balance_wallet
                  </span>
                  <h3 className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Saldo Hari Ini
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setTempTarget(savingsTarget);
                    setTempSaved(savedAmount);
                    setIsEditingGoal(true);
                  }}
                  className="text-xs text-secondary hover:underline flex items-center gap-1 font-body font-medium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  Atur Target
                </button>
              </div>
              <h2 className="font-headline text-3xl lg:text-5xl text-on-surface mt-2 font-bold tracking-tight break-words tabular-nums amount">
                {formatRupiah(currentSaldo)}
              </h2>
              <p className="font-body text-xs text-on-surface-variant mt-2 font-medium">
                Catatan Kas Aktif
              </p>
            </div>

            {/* Savings Goal Info */}
            <div className="mt-8 pt-6 border-t border-surface-variant flex flex-col sm:flex-row gap-4 sm:gap-8 relative z-10">
              <div className="shrink-0">
                <p className="font-body text-xs text-on-surface-variant mb-1">
                  Target Tabungan
                </p>
                <p className="font-headline text-xl font-bold text-secondary amount">
                  {formatRupiah(savingsTarget)}
                </p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="w-full bg-surface-container rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">
                    <span className="amount">{formatRupiah(savedAmount)}</span> terkumpul
                  </span>
                  <span className="font-body text-xs font-semibold text-secondary">
                    {progressPercent}% Tercapai
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions (Add transactions) */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            
            {/* Record Expense Button */}
            <button
              onClick={() => router.push("/tambah?type=expense")}
              className="flex-1 bg-tertiary-container hover:bg-tertiary text-on-tertiary rounded-3xl p-6 shadow-lux transition-all duration-200 active:scale-[0.98] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-on-tertiary/20 rounded-full flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[32px] text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    remove_circle
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-headline text-lg md:text-xl font-bold block mb-0.5">
                    Catat Pengeluaran
                  </span>
                  <span className="font-body text-xs opacity-80 uppercase tracking-wider font-semibold">
                    Kurangi Saldo
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[32px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                arrow_forward
              </span>
            </button>

            {/* Record Income Button */}
            <button
              onClick={() => router.push("/tambah?type=income")}
              className="flex-1 bg-secondary-container hover:bg-secondary hover:text-on-secondary text-on-secondary-container rounded-3xl p-6 shadow-lux transition-all duration-200 active:scale-[0.98] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-secondary/15 group-hover:bg-on-secondary/20 rounded-full flex items-center justify-center transition-colors">
                  <span
                    className="material-symbols-outlined text-[32px] text-secondary group-hover:text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    add_circle
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-headline text-lg md:text-xl font-bold block mb-0.5 group-hover:text-white">
                    Catat Pemasukan
                  </span>
                  <span className="font-body text-xs opacity-80 uppercase tracking-wider font-semibold group-hover:text-white">
                    Tambah Saldo
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[32px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Middle Section: Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Uang Masuk Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-soft flex items-start gap-4 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_downward
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-semibold text-on-surface-variant mb-1">
                Uang Masuk
              </p>
              <p className="font-headline text-xl xl:text-2xl font-bold text-on-surface break-words leading-tight tabular-nums amount">
                {formatRupiah(totalIncome)}
              </p>
            </div>
          </div>

          {/* Uang Keluar Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-soft flex items-start gap-4 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_upward
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-semibold text-on-surface-variant mb-1">
                Uang Keluar
              </p>
              <p className="font-headline text-xl xl:text-2xl font-bold text-on-surface break-words leading-tight tabular-nums amount">
                {formatRupiah(totalExpense)}
              </p>
            </div>
          </div>

          {/* Sisa Uang Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-soft flex items-start gap-4 hover:-translate-y-1 transition-transform duration-200">
            <div className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                savings
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-xs font-semibold text-on-surface-variant mb-1">
                Sisa Uang
              </p>
              <p className="font-headline text-xl xl:text-2xl font-bold text-secondary break-words leading-tight tabular-nums amount">
                {formatRupiah(currentSaldo)}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section: Transactions */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-soft border border-surface-container-low">
          <div className="flex justify-between items-end mb-6 pb-4 border-b border-surface-variant">
            <div>
              <h3 className="font-headline text-lg md:text-xl font-bold text-primary">
                5 Transaksi Terakhir
              </h3>
              <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">
                Aktivitas pencatatan keuangan terbaru Bunda
              </p>
            </div>
            <Link
              href="/riwayat"
              className="font-body text-xs font-semibold text-secondary hover:text-on-secondary-container transition-colors py-2 px-4 rounded-full hover:bg-secondary-container/50 cursor-pointer"
            >
              Lihat Semua
            </Link>
          </div>

          {/* Transaction list */}
          <div className="space-y-1">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-outline-variant text-[48px]">receipt_long</span>
                <p className="font-body text-sm text-on-surface-variant font-medium">Belum ada transaksi dicatat.</p>
              </div>
            ) : (
              recentTransactions.map((tx) => {
                // Find matching category color/icon
                const catObj = categories.find((c) => c.name === tx.category);
                const isExpense = tx.type === "expense";
                
                // Color formatting classes
                let catBg = "bg-surface-container text-on-surface-variant";
                if (catObj) {
                  if (catObj.colorType === "secondary") catBg = "bg-secondary-container/50 text-secondary";
                  else if (catObj.colorType === "tertiary") catBg = "bg-tertiary-container/30 text-tertiary-container";
                  else if (catObj.colorType === "primary") catBg = "bg-primary-container/20 text-primary-container";
                  else if (catObj.colorType === "error") catBg = "bg-error-container/30 text-error";
                  else if (catObj.colorType === "secondary-fixed") catBg = "bg-secondary-fixed-dim/30 text-on-secondary-fixed-variant";
                  else if (catObj.colorType === "primary-fixed") catBg = "bg-primary-fixed-dim/30 text-on-primary-fixed-variant";
                }

                // Fallback icon for incomes if no matching category
                const icon = catObj?.icon || (isExpense ? "shopping_bag" : "account_balance");

                return (
                  <div
                    key={tx.id}
                    onClick={() => router.push(`/riwayat?search=${tx.label}`)}
                    className="flex items-center justify-between p-4 hover:bg-surface-container-low rounded-2xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 md:gap-6 min-w-0">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0 transition-colors ${catBg}`}>
                        <span
                          className="material-symbols-outlined text-[24px] md:text-[28px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-headline text-sm md:text-base text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                          {tx.label}
                        </p>
                        <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">
                          {formatTxDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-headline text-sm md:text-base font-bold amount ${
                          isExpense ? "text-on-surface" : "text-secondary"
                        }`}
                      >
                        {isExpense ? "-" : "+"}
                        {formatRupiah(tx.amount)}
                      </p>
                      <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">
                        {tx.category}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Goal Setter Modal Dialog */}
      {isEditingGoal && (
        <div className="fixed inset-0 z-50 bg-on-background/25 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-[24px] p-8 w-full max-w-[400px] shadow-lux flex flex-col">
            <h3 className="font-headline text-lg font-bold text-primary mb-6">
              Pengaturan Target Tabungan
            </h3>
            <form onSubmit={handleSaveGoal} className="space-y-5">
              <div>
                <label className="block font-body text-xs font-semibold text-on-surface-variant mb-2">
                  Target Tabungan (Rupiah)
                </label>
                <input
                  type="number"
                  value={tempTarget}
                  onChange={(e) => setTempTarget(Number(e.target.value))}
                  className="w-full rounded-xl border border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-0 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-on-surface-variant mb-2">
                  Dana Terkumpul (Rupiah)
                </label>
                <input
                  type="number"
                  value={tempSaved}
                  onChange={(e) => setTempSaved(Number(e.target.value))}
                  className="w-full rounded-xl border border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-0 transition-colors"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(false)}
                  className="flex-1 h-12 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl font-body text-sm font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-primary text-on-primary hover:opacity-90 rounded-xl font-body text-sm font-semibold transition-opacity cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
