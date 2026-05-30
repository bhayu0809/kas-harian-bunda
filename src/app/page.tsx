"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import {
  getBudgetStatus,
  getDailyAllowanceStatus,
  getWeeklySpendingStatus,
  monthlyExpenseByCategory,
} from "@/lib/budget";
import { getFinancialAdvice } from "@/lib/advice";

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
    dailySpendingLimit,
    weeklySpendingLimit,
    dailyRolloverEnabled,
    monthlyBudget,
    savedAmount,
    savingsTarget,
    categoryBudgets,
  } = useApp();
  const router = useRouter();

  const now = new Date();
  const dailyStatus = getDailyAllowanceStatus(transactions, dailySpendingLimit, dailyRolloverEnabled, now);
  const weeklyStatus = getWeeklySpendingStatus(transactions, weeklySpendingLimit, now);
  const showLimits = dailySpendingLimit > 0 || weeklySpendingLimit > 0;
  const monthTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  // Calculate totals
  const totalIncome = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentSaldo = totalIncome - totalExpense;

  // Monthly cash usage grows with recorded income.
  const usagePercent =
    totalIncome > 0
      ? Math.min(Math.round((totalExpense / totalIncome) * 100), 100)
      : 0;

  // Biggest expense category this month — drives the "pangkas/awasi" advice.
  const expenseByCategory = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
  const topCategory = Object.entries(expenseByCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)[0] ?? null;

  // Categories over their per-category monthly budget.
  const spentByCategory = monthlyExpenseByCategory(transactions, now);
  const overBudgetCategories = Object.entries(categoryBudgets)
    .filter(([name, budget]) => budget > 0 && (spentByCategory[name] ?? 0) > budget)
    .map(([name, budget]) => ({ name, spent: spentByCategory[name] ?? 0, budget }));

  // Rule-based financial advice (defensif saat minus/ketat, ofensif saat surplus).
  const advice = getFinancialAdvice({
    income: totalIncome,
    expense: totalExpense,
    topCategory,
    daily: dailySpendingLimit > 0 ? dailyStatus : null,
    weekly: weeklySpendingLimit > 0 ? weeklyStatus : null,
    monthly: monthlyBudget > 0 ? getBudgetStatus(transactions, monthlyBudget, now) : null,
    savedAmount,
    savingsTarget,
    overBudgetCategories,
  });

  const adviceTone = {
    defensive: { chip: "bg-error-container text-on-error-container", icon: "bg-error-container text-error" },
    offensive: { chip: "bg-secondary-container text-on-secondary-container", icon: "bg-secondary-container text-secondary" },
    neutral: { chip: "bg-surface-container text-on-surface-variant", icon: "bg-surface-container text-on-surface-variant" },
  } as const;

  // Get last 5 transactions
  const recentTransactions = transactions.slice(0, 5);

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
              </div>
              <h2 className="font-headline text-3xl lg:text-5xl text-on-surface mt-2 font-bold tracking-tight break-words tabular-nums amount">
                {formatRupiah(currentSaldo)}
              </h2>
              <p className="font-body text-xs text-on-surface-variant mt-2 font-medium">
                Sisa dana bulan ini
              </p>
            </div>

            {/* Monthly Cash Info */}
            <div className="mt-8 pt-6 border-t border-surface-variant flex flex-col sm:flex-row gap-4 sm:gap-8 relative z-10">
              <div className="shrink-0">
                <p className="font-body text-xs text-on-surface-variant mb-1">
                  Dana Bulan Ini
                </p>
                <p className="font-headline text-xl font-bold text-secondary amount">
                  {formatRupiah(totalIncome)}
                </p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="w-full bg-surface-container rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">
                    <span className="amount">{formatRupiah(totalExpense)}</span> terpakai
                  </span>
                  <span className="font-body text-xs font-semibold text-secondary">
                    {usagePercent}% Digunakan
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
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 bg-on-tertiary/20 rounded-full flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[32px] text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    remove_circle
                  </span>
                </div>
                <div className="text-left min-w-0">
                  <span className="font-headline text-lg md:text-xl font-bold block mb-0.5">
                    Catat Pengeluaran
                  </span>
                  <span className="font-body text-xs opacity-80 uppercase tracking-wider font-semibold">
                    Kurangi Saldo
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline material-symbols-outlined text-[32px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                arrow_forward
              </span>
            </button>

            {/* Record Income Button */}
            <button
              onClick={() => router.push("/tambah?type=income")}
              className="flex-1 bg-secondary-container hover:bg-secondary hover:text-on-secondary text-on-secondary-container rounded-3xl p-6 shadow-lux transition-all duration-200 active:scale-[0.98] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 bg-secondary/15 group-hover:bg-on-secondary/20 rounded-full flex items-center justify-center transition-colors">
                  <span
                    className="material-symbols-outlined text-[32px] text-secondary group-hover:text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    add_circle
                  </span>
                </div>
                <div className="text-left min-w-0">
                  <span className="font-headline text-lg md:text-xl font-bold block mb-0.5 group-hover:text-white">
                    Catat Pemasukan
                  </span>
                  <span className="font-body text-xs opacity-80 uppercase tracking-wider font-semibold group-hover:text-white">
                    Tambah Saldo
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline material-symbols-outlined text-[32px] opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
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

        {/* Batas Pengeluaran: jatah harian (akumulasi) + mingguan */}
        {showLimits && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {dailySpendingLimit > 0 && (
              <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="material-symbols-outlined text-secondary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      savings
                    </span>
                    <h3 className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider truncate">
                      Jatah Harian
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-body ${
                      dailyStatus.exceeded
                        ? "bg-error-container text-on-error-container"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    {dailyStatus.exceeded ? "Lewat batas" : "Sisa"}
                  </span>
                </div>
                <p
                  className={`font-headline text-2xl xl:text-3xl font-bold tabular-nums amount ${
                    dailyStatus.exceeded ? "text-error" : "text-on-surface"
                  }`}
                >
                  {formatRupiah(dailyStatus.remaining)}
                </p>
                <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">
                  Jatah hari ini <span className="amount">{formatRupiah(dailyStatus.effectiveToday)}</span>
                  {dailyRolloverEnabled && dailyStatus.rollover !== 0 && (
                    <>
                      {" "}• akumulasi{" "}
                      <span className={dailyStatus.rollover < 0 ? "text-error amount" : "text-secondary amount"}>
                        {dailyStatus.rollover > 0 ? "+" : ""}
                        {formatRupiah(dailyStatus.rollover)}
                      </span>
                    </>
                  )}
                </p>
                <div className="w-full bg-surface-container rounded-full h-2.5 mt-4 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dailyStatus.exceeded ? "bg-error" : "bg-secondary"
                    }`}
                    style={{
                      width: `${
                        dailyStatus.effectiveToday > 0
                          ? Math.min(Math.round((dailyStatus.spentToday / dailyStatus.effectiveToday) * 100), 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="font-body text-xs text-on-surface-variant font-medium">
                  Terpakai hari ini <span className="amount">{formatRupiah(dailyStatus.spentToday)}</span>
                </p>
              </div>
            )}

            {weeklySpendingLimit > 0 && (
              <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="material-symbols-outlined text-secondary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      date_range
                    </span>
                    <h3 className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider truncate">
                      Batas Mingguan
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-body ${
                      weeklyStatus.exceeded
                        ? "bg-error-container text-on-error-container"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    {weeklyStatus.exceeded ? "Lewat batas" : "Sisa"}
                  </span>
                </div>
                <p
                  className={`font-headline text-2xl xl:text-3xl font-bold tabular-nums amount ${
                    weeklyStatus.exceeded ? "text-error" : "text-on-surface"
                  }`}
                >
                  {formatRupiah(weeklyStatus.remaining)}
                </p>
                <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">
                  Batas minggu ini <span className="amount">{formatRupiah(weeklyStatus.budget)}</span>
                </p>
                <div className="w-full bg-surface-container rounded-full h-2.5 mt-4 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weeklyStatus.exceeded ? "bg-error" : "bg-secondary"
                    }`}
                    style={{
                      width: `${
                        weeklyStatus.budget > 0
                          ? Math.min(Math.round((weeklyStatus.spent / weeklyStatus.budget) * 100), 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="font-body text-xs text-on-surface-variant font-medium">
                  Terpakai minggu ini <span className="amount">{formatRupiah(weeklyStatus.spent)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Saran Keuangan (rule-based, sesuai kondisi) */}
        {advice.length > 0 && (
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-soft border border-surface-container-low">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  tips_and_updates
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-headline text-lg md:text-xl font-bold text-primary">Saran Keuangan</h3>
                <p className="font-body text-xs text-on-surface-variant mt-0.5 font-medium">
                  Menyesuaikan kondisi kas bulan ini
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {advice.map((item) => {
                const tone = adviceTone[item.tone];
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tone.icon}`}>
                      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-headline text-sm font-bold text-on-surface">{item.title}</h4>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-body ${tone.chip}`}>
                          {item.tone === "defensive" ? "Hemat" : item.tone === "offensive" ? "Tambah Income" : "Info"}
                        </span>
                      </div>
                      <p className="font-body text-xs text-on-surface-variant leading-relaxed">{item.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Section: Transactions */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-soft border border-surface-container-low">
          <div className="flex justify-between items-end gap-4 mb-6 pb-4 border-b border-surface-variant">
            <div className="min-w-0">
              <h3 className="font-headline text-lg md:text-xl font-bold text-primary">
                5 Transaksi Terakhir
              </h3>
              <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">
                Aktivitas pencatatan keuangan terbaru Bunda
              </p>
            </div>
            <Link
              href="/riwayat"
              className="shrink-0 font-body text-xs font-semibold text-secondary hover:text-on-secondary-container transition-colors py-2 px-3 sm:px-4 rounded-full hover:bg-secondary-container/50 cursor-pointer"
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
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tambah?duplicate=${tx.id}`);
                        }}
                        aria-label="Catat ulang"
                        title="Catat ulang"
                        className="hidden sm:flex h-9 w-9 rounded-full bg-surface-container text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container transition-colors cursor-pointer items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                      <div>
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
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
