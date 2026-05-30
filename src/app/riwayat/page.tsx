"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

// Format Date for Header display
const formatGroupDateHeader = (dateStr: string) => {
  const dateObj = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
  ];
  
  const formattedDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  if (dateObj.toDateString() === today.toDateString()) {
    return (
      <span className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
        Hari Ini <span className="font-body text-sm text-on-surface-variant font-normal">• {formattedDate}</span>
      </span>
    );
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    return (
      <span className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
        Kemarin <span className="font-body text-sm text-on-surface-variant font-normal">• {formattedDate}</span>
      </span>
    );
  } else {
    return (
      <span className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
        {formattedDate}
      </span>
    );
  }
};

function RiwayatForm() {
  const { transactions, categories } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load initial search query from URL if it exists
  const initialQuery = searchParams.get("search") || "";

  // Search & Filter state
  const [search, setSearch] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [limit, setLimit] = useState(10);

  // Sync state if URL query param changes
  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  // Filter logic
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Text Search matching
    const matchesSearch =
      tx.label.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(search.toLowerCase())) ||
      tx.amount.toString().includes(search) ||
      tx.source.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Date Filter matching
    const txDate = new Date(tx.date);
    const now = new Date();
    
    if (activeFilter === "today") {
      return txDate.toDateString() === now.toDateString();
    } else if (activeFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return txDate >= oneWeekAgo;
    } else if (activeFilter === "month") {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  });

  // Group by Date (YYYY-MM-DD)
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filteredTransactions.slice(0, limit).forEach((tx) => {
    const dateKey = tx.date.substring(0, 10); // extract YYYY-MM-DD
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(tx);
  });

  // Sorted date keys (descending order)
  const sortedDateKeys = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const hasMore = filteredTransactions.length > limit;

  return (
    <div className="px-6 md:px-12 py-8 max-w-6xl mx-auto w-full space-y-8 pb-24">
      
      {/* Search Bar */}
      <div className="flex justify-end">
        <div className="w-full lg:w-96 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant text-[24px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border-2 border-surface-variant rounded-full py-4 pl-14 pr-6 font-body text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-0 transition-colors shadow-sm placeholder:text-outline-variant"
            placeholder="Cari catatan, nominal, atau kategori..."
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        <button
          onClick={() => setActiveFilter("today")}
          className={`px-8 py-3 rounded-full font-body text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeFilter === "today"
              ? "bg-secondary text-on-secondary shadow-md scale-95"
              : "bg-surface-container-lowest text-on-surface-variant border border-surface-variant hover:bg-surface-container"
          }`}
        >
          Hari Ini
        </button>
        <button
          onClick={() => setActiveFilter("week")}
          className={`px-8 py-3 rounded-full font-body text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeFilter === "week"
              ? "bg-secondary text-on-secondary shadow-md scale-95"
              : "bg-surface-container-lowest text-on-surface-variant border border-surface-variant hover:bg-surface-container"
          }`}
        >
          Minggu Ini
        </button>
        <button
          onClick={() => setActiveFilter("month")}
          className={`px-8 py-3 rounded-full font-body text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeFilter === "month"
              ? "bg-secondary text-on-secondary shadow-md scale-95"
              : "bg-surface-container-lowest text-on-surface-variant border border-surface-variant hover:bg-surface-container"
          }`}
        >
          Bulan Ini
        </button>
        <button
          onClick={() => {
            setActiveFilter("all");
            setSearch("");
          }}
          className={`px-8 py-3 rounded-full font-body text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeFilter === "all" && search === ""
              ? "bg-secondary text-on-secondary shadow-md scale-95"
              : "bg-surface-container-lowest text-on-surface-variant border border-surface-variant hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
          Semua Filter
        </button>
      </div>

      {/* Transaction Groups */}
      <div className="space-y-10">
        {sortedDateKeys.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-4 bg-surface-container-lowest rounded-3xl p-8 shadow-soft">
            <span className="material-symbols-outlined text-outline-variant text-[56px]">search_off</span>
            <div className="space-y-1">
              <p className="font-headline text-lg font-bold text-primary">Tidak ada transaksi ditemukan</p>
              <p className="font-body text-sm text-on-surface-variant max-w-[280px]">
                Silakan ubah filter atau kata kunci pencarian Anda.
              </p>
            </div>
          </div>
        ) : (
          sortedDateKeys.map((dateKey) => (
            <section key={dateKey} className="space-y-4">
              <h3 className="pl-2">
                {formatGroupDateHeader(dateKey)}
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {groupedTransactions[dateKey].map((tx) => {
                  const catObj = categories.find((c) => c.name === tx.category);
                  const isExpense = tx.type === "expense";
                  
                  // Color configuration classes
                  let catBg = "bg-surface-container text-on-surface-variant";
                  if (catObj) {
                    if (catObj.colorType === "secondary") catBg = "bg-secondary-container/50 text-secondary";
                    else if (catObj.colorType === "tertiary") catBg = "bg-tertiary-container/30 text-tertiary-container";
                    else if (catObj.colorType === "primary") catBg = "bg-primary-container/20 text-primary-container";
                    else if (catObj.colorType === "error") catBg = "bg-error-container/30 text-error";
                    else if (catObj.colorType === "secondary-fixed") catBg = "bg-secondary-fixed-dim/30 text-on-secondary-fixed-variant";
                    else if (catObj.colorType === "primary-fixed") catBg = "bg-primary-fixed-dim/30 text-on-primary-fixed-variant";
                  }

                  const icon = catObj?.icon || (isExpense ? "shopping_bag" : "payments");

                  return (
                    <div
                      key={tx.id}
                      className="bg-surface-container-lowest rounded-2xl shadow-lux p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group border border-transparent hover:border-surface-variant/30"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${catBg}`}>
                          <span
                            className="material-symbols-outlined text-[28px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {icon}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-headline text-base font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                            {tx.label}
                          </span>
                          <span className="font-body text-xs text-on-surface-variant flex flex-wrap items-center gap-2 font-medium">
                            {tx.notes || "Tanpa catatan"}
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                            {tx.source}
                          </span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                        <span
                          className={`font-headline text-lg font-bold ${
                            isExpense ? "text-error" : "text-secondary"
                          }`}
                        >
                          {isExpense ? "-" : "+"}
                          {formatRupiah(tx.amount)}
                        </span>
                        <div className="text-xs font-semibold text-on-surface-variant px-3 py-1 rounded-full bg-surface-container font-body">
                          {tx.category}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center py-6">
            <button
              onClick={() => setLimit(limit + 10)}
              className="bg-surface-container text-on-surface px-8 py-4 rounded-xl font-body text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center gap-2 cursor-pointer border border-surface-container-high"
            >
              <span className="material-symbols-outlined">expand_more</span>
              Tampilkan Lebih Banyak
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export default function RiwayatPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center p-12">
            <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
          </div>
        }
      >
        <RiwayatForm />
      </Suspense>
    </DashboardLayout>
  );
}
