"use client";

import React, { useState } from "react";
import { useApp, Transaction } from "@/context/AppContext";
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

// Map color type to actual Hex code for doughnut chart representation
const getColorHex = (colorType: string) => {
  switch (colorType) {
    case "secondary":
      return "#2c6956"; // Forest green
    case "tertiary":
      return "#7c2531"; // Crimson
    case "primary":
      return "#45453f"; // Charcoal
    case "error":
      return "#ba1a1a"; // Bright red
    case "secondary-fixed":
      return "#96d3bd"; // Soft green
    case "primary-fixed":
      return "#c9c6bf"; // Cream gray
    default:
      return "#c9c6bd";
  }
};

export default function RingkasanPage() {
  const { transactions, categories } = useApp();

  // Selected month state — defaults to the current month so seeded data is visible
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const currentMonthName = monthNames[selectedDate.getMonth()];
  const currentYear = selectedDate.getFullYear();

  // Filter transactions by selected month/year
  const monthlyTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return (
      txDate.getMonth() === selectedDate.getMonth() &&
      txDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // Calculate stats
  const totalIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentSisa = totalIncome - totalExpense;

  // Calculate expenses per category
  const expenseTransactions = monthlyTransactions.filter((tx) => tx.type === "expense");
  const categorySummaryMap: { [categoryName: string]: number } = {};

  // Seed with 0 for all categories to display them
  categories.forEach((cat) => {
    if (cat.name !== "Pendapatan") {
      categorySummaryMap[cat.name] = 0;
    }
  });

  expenseTransactions.forEach((tx) => {
    if (categorySummaryMap[tx.category] !== undefined) {
      categorySummaryMap[tx.category] += tx.amount;
    } else {
      categorySummaryMap[tx.category] = tx.amount;
    }
  });

  // Format into array and compute percentages
  const categorySummaryList = Object.keys(categorySummaryMap)
    .map((name) => {
      const catObj = categories.find((c) => c.name === name);
      const amount = categorySummaryMap[name];
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      
      return {
        name,
        amount,
        percentage,
        icon: catObj?.icon || "shopping_bag",
        colorType: catObj?.colorType || "primary",
        colorHex: getColorHex(catObj?.colorType || "primary"),
      };
    })
    .filter((item) => item.amount > 0) // Only display active expenses
    .sort((a, b) => b.amount - a.amount); // Order by highest amount

  // Calculate largest expense category for insight
  const largestExpenseCategory = categorySummaryList.length > 0 ? categorySummaryList[0].name : null;

  // Generate Conic Gradient string for CSS Doughnut Chart representation
  let conicGradientStyle = "conic-gradient(#e6e2dd 0% 100%)";
  if (totalExpense > 0 && categorySummaryList.length > 0) {
    let accumulatedPercent = 0;
    const gradientSlices = categorySummaryList.map((item) => {
      const start = accumulatedPercent;
      accumulatedPercent += item.percentage;
      // Cap at 100%
      const end = Math.min(accumulatedPercent, 100);
      return `${item.colorHex} ${start}% ${end}%`;
    });
    
    // Add gray slice for any remaining percentage rounding gaps
    if (accumulatedPercent < 100) {
      gradientSlices.push(`#e6e2dd ${accumulatedPercent}% 100%`);
    }

    conicGradientStyle = `conic-gradient(${gradientSlices.join(", ")})`;
  }

  return (
    <DashboardLayout>
      <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto w-full space-y-10 pb-24">
        
        {/* Month Selector & Insight */}
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-end">
          <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl w-fit border border-surface-container-high shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-headline text-lg md:text-xl font-bold text-primary px-4">
              {currentMonthName} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {largestExpenseCategory ? (
            <div className="bg-tertiary-container text-on-tertiary-container px-6 py-4 rounded-xl flex items-center gap-3 shadow-[0_4px_20px_-4px_rgba(155,61,71,0.2)] animate-fade-in">
              <span className="material-symbols-outlined">lightbulb</span>
              <p className="font-body text-xs md:text-sm font-medium">
                Pengeluaran terbesar ada di <strong>{largestExpenseCategory}</strong>
              </p>
            </div>
          ) : (
            <div className="bg-secondary-container text-on-secondary-container px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm">
              <span className="material-symbols-outlined">info</span>
              <p className="font-body text-xs md:text-sm font-medium">
                Belum ada data pengeluaran pada bulan ini.
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pemasukan */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-lux flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
              </div>
              <span className="font-body text-xs font-bold uppercase tracking-wider">
                Total Pemasukan
              </span>
            </div>
            <p className="font-headline text-2xl md:text-3xl font-bold text-primary">
              {formatRupiah(totalIncome)}
            </p>
          </div>

          {/* Pengeluaran */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-lux flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">arrow_upward</span>
              </div>
              <span className="font-body text-xs font-bold uppercase tracking-wider">
                Total Pengeluaran
              </span>
            </div>
            <p className="font-headline text-2xl md:text-3xl font-bold text-primary">
              {formatRupiah(totalExpense)}
            </p>
          </div>

          {/* Sisa Uang */}
          <div className="bg-secondary p-6 rounded-2xl shadow-[30px_0_60px_-15px_rgba(44,105,86,0.2)] flex flex-col gap-3 text-on-secondary">
            <div className="flex items-center gap-2 text-secondary-fixed">
              <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              </div>
              <span className="font-body text-xs font-bold uppercase tracking-wider">
                Sisa Uang
              </span>
            </div>
            <p className="font-headline text-2xl md:text-3xl font-bold">
              {formatRupiah(currentSisa)}
            </p>
          </div>
        </div>

        {/* Details Section (Chart & List) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Chart Area */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-lux flex flex-col items-center justify-center min-h-[400px]">
            <h3 className="font-headline text-lg font-bold text-primary w-full text-left mb-8">
              Alokasi Pengeluaran
            </h3>
            
            {totalExpense > 0 && categorySummaryList.length > 0 ? (
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* CSS Conic Doughnut Circle */}
                <div
                  className="w-full h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ background: conicGradientStyle }}
                />
                {/* Inner cutout hole to complete doughnut look */}
                <div className="absolute inset-5 bg-surface-container-lowest rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Total
                  </span>
                  <span className="font-headline text-xl md:text-2xl font-bold text-primary">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
                <span className="material-symbols-outlined text-outline-variant text-[64px]">donut_large</span>
                <p className="font-body text-sm text-on-surface-variant font-medium">
                  Belum ada transaksi pengeluaran pada bulan ini.
                </p>
              </div>
            )}
          </div>

          {/* Top Categories List */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-lux flex flex-col justify-between">
            <div className="w-full">
              <h3 className="font-headline text-lg font-bold text-primary mb-6 pb-2 border-b border-surface-container">
                Pengeluaran Terbesar
              </h3>
              
              <div className="flex flex-col gap-4">
                {categorySummaryList.length === 0 ? (
                  <div className="text-center py-20 text-on-surface-variant font-body text-sm font-medium">
                    Tidak ada aktivitas pengeluaran.
                  </div>
                ) : (
                  categorySummaryList.map((item) => {
                    // Accent containers mappings
                    let catBg = "bg-surface-container text-on-surface-variant";
                    if (item.colorType === "secondary") catBg = "bg-secondary-container/50 text-secondary";
                    else if (item.colorType === "tertiary") catBg = "bg-tertiary-container/30 text-tertiary-container";
                    else if (item.colorType === "primary") catBg = "bg-primary-container/20 text-primary-container";
                    else if (item.colorType === "error") catBg = "bg-error-container/30 text-error";
                    else if (item.colorType === "secondary-fixed") catBg = "bg-secondary-fixed-dim/30 text-on-secondary-fixed-variant";
                    else if (item.colorType === "primary-fixed") catBg = "bg-primary-fixed-dim/30 text-on-primary-fixed-variant";

                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${catBg}`}>
                            <span
                              className="material-symbols-outlined text-[24px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {item.icon}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-headline text-sm md:text-base text-primary font-bold truncate">
                              {item.name}
                            </span>
                            <span className="font-body text-xs text-on-surface-variant font-medium mt-0.5">
                              {item.percentage}% dari seluruh pengeluaran
                            </span>
                          </div>
                        </div>
                        <span className="font-headline text-base md:text-lg font-bold text-on-surface shrink-0">
                          {formatRupiah(item.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
