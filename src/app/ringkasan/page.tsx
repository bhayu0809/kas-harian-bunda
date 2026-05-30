"use client";

import React, { useState } from "react";
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
  const { transactions, categories, categoryBudgets } = useApp();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

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

  const shortMonthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  const currentMonthName = monthNames[selectedDate.getMonth()];
  const currentYear = selectedDate.getFullYear();

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedDate(new Date(currentYear, monthIndex, 1));
    setMonthPickerOpen(false);
  };

  const handleChangeYear = (direction: -1 | 1) => {
    setSelectedDate(new Date(currentYear + direction, selectedDate.getMonth(), 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setMonthPickerOpen(false);
  };

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
      
      const budget = categoryBudgets[name] ?? 0;

      return {
        name,
        amount,
        percentage,
        budget,
        budgetPercent: budget > 0 ? Math.min(Math.round((amount / budget) * 100), 100) : 0,
        overBudget: budget > 0 && amount > budget,
        icon: catObj?.icon || "shopping_bag",
        colorType: catObj?.colorType || "primary",
        colorHex: getColorHex(catObj?.colorType || "primary"),
      };
    })
    .filter((item) => item.amount > 0) // Only display active expenses
    .sort((a, b) => b.amount - a.amount); // Order by highest amount

  // Calculate largest expense category for insight
  const largestExpenseCategory = categorySummaryList.length > 0 ? categorySummaryList[0].name : null;

  // 6-month trend ending at the selected month (income vs expense per month).
  const trendMonths = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - (5 - i), 1);
    const inMonth = transactions.filter((t) => {
      const td = new Date(t.date);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: shortMonthNames[d.getMonth()],
      year: d.getFullYear(),
      income: inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });
  const trendMax = Math.max(1, ...trendMonths.map((m) => Math.max(m.income, m.expense)));
  const prevExpense = trendMonths[4].expense;
  const expenseDelta = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : totalExpense > 0 ? 100 : 0;

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
          <div className="relative w-full lg:w-auto">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl w-full sm:w-fit border border-surface-container-high shadow-xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Bulan sebelumnya"
                  className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthPickerOpen((open) => !open)}
                  className="flex-1 sm:flex-none min-h-10 text-center font-headline text-base md:text-xl font-bold text-primary px-2 sm:px-4 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer truncate"
                >
                  {currentMonthName} {currentYear}
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Bulan berikutnya"
                  className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMonthPickerOpen((open) => !open)}
                className="min-h-12 w-full sm:w-auto px-5 rounded-xl bg-secondary text-on-secondary font-body text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                Pilih Bulan
              </button>
            </div>

            {monthPickerOpen && (
              <div className="absolute left-0 top-full mt-3 z-30 w-full sm:w-[420px] bg-surface-container-lowest rounded-3xl p-4 shadow-lux border border-surface-container-high animate-fade-in">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => handleChangeYear(-1)}
                    aria-label="Tahun sebelumnya"
                    className="h-11 w-11 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <div className="text-center">
                    <p className="font-body text-xs font-semibold text-on-surface-variant">Pilih tahun</p>
                    <p className="font-headline text-2xl font-bold text-primary">{currentYear}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChangeYear(1)}
                    aria-label="Tahun berikutnya"
                    className="h-11 w-11 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {monthNames.map((name, index) => {
                    const selected = selectedDate.getMonth() === index;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelectMonth(index)}
                        className={`min-h-14 rounded-2xl px-2 font-body text-sm font-bold transition-all cursor-pointer ${
                          selected
                            ? "bg-secondary text-on-secondary shadow-sm"
                            : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                        }`}
                      >
                        <span className="hidden sm:inline">{name}</span>
                        <span className="sm:hidden">{shortMonthNames[index]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleCurrentMonth}
                    className="min-h-11 flex-1 rounded-xl bg-secondary-container text-on-secondary-container font-body text-sm font-bold hover:opacity-90 cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthPickerOpen(false)}
                    className="min-h-11 flex-1 rounded-xl bg-surface-container-high text-on-surface font-body text-sm font-bold hover:bg-surface-container-highest cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
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
            <p className="font-headline text-2xl md:text-3xl font-bold text-primary amount">
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
            <p className="font-headline text-2xl md:text-3xl font-bold text-primary amount">
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
            <p className="font-headline text-2xl md:text-3xl font-bold amount">
              {formatRupiah(currentSisa)}
            </p>
          </div>
        </div>

        {/* Tren 6 Bulan + perbandingan */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-lux">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div>
              <h3 className="font-headline text-lg font-bold text-primary">Tren 6 Bulan</h3>
              <p className="font-body text-xs text-on-surface-variant mt-1 font-medium">Pemasukan vs pengeluaran per bulan</p>
            </div>
            <div className="flex items-center gap-2 font-body text-xs">
              <span className="text-on-surface-variant">vs bulan lalu</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
                  expenseDelta > 0
                    ? "bg-error-container text-on-error-container"
                    : expenseDelta < 0
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {expenseDelta > 0 ? "trending_up" : expenseDelta < 0 ? "trending_down" : "trending_flat"}
                </span>
                {expenseDelta > 0 ? "+" : ""}{expenseDelta}% belanja
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 sm:gap-4 h-44">
            {trendMonths.map((m) => {
              const isCurrent = m.key === `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div
                      className="w-1/2 max-w-[18px] rounded-t-md bg-secondary/80 transition-all duration-500"
                      style={{ height: `${Math.max((m.income / trendMax) * 100, m.income > 0 ? 4 : 0)}%` }}
                      title={`Masuk ${formatRupiah(m.income)}`}
                    />
                    <div
                      className="w-1/2 max-w-[18px] rounded-t-md bg-error/70 transition-all duration-500"
                      style={{ height: `${Math.max((m.expense / trendMax) * 100, m.expense > 0 ? 4 : 0)}%` }}
                      title={`Keluar ${formatRupiah(m.expense)}`}
                    />
                  </div>
                  <span className={`font-body text-[11px] truncate ${isCurrent ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 font-body text-xs text-on-surface-variant">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-secondary/80" /> Pemasukan</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-error/70" /> Pengeluaran</span>
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
                  <span className="font-headline text-xl md:text-2xl font-bold text-primary amount">
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
                        className="p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors group"
                      >
                        <div className="flex items-center justify-between">
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
                          <span className="font-headline text-sm md:text-lg font-bold text-on-surface shrink-0 amount text-right">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>

                        {item.budget > 0 && (
                          <div className="mt-3 pl-16">
                            <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${item.overBudget ? "bg-error" : "bg-secondary"}`}
                                style={{ width: `${item.budgetPercent}%` }}
                              />
                            </div>
                            <p className={`font-body text-[11px] mt-1 font-medium ${item.overBudget ? "text-error" : "text-on-surface-variant"}`}>
                              {item.overBudget ? "Lewat budget " : "Budget "}
                              <span className="amount">{formatRupiah(item.amount)}</span> / <span className="amount">{formatRupiah(item.budget)}</span>
                            </p>
                          </div>
                        )}
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
