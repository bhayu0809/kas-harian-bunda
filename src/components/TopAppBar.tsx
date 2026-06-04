"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function TopAppBar() {
  const pathname = usePathname();
  const { hideAmounts, toggleHideAmounts, profileName, profilePhoto } = useApp();

  // Determine headers based on path
  let title = `Halo, ${profileName}`;
  let subtitle = "Ringkasan kas hari ini.";

  switch (pathname) {
    case "/tambah":
      title = "Tambah Transaksi";
      subtitle = "Catat aktivitas keuangan hari ini.";
      break;
    case "/riwayat":
      title = "Riwayat Transaksi";
      subtitle = "Pantau masuk dan keluarnya dana dengan mudah.";
      break;
    case "/kategori":
      title = "Kelola Kategori";
      subtitle = "Kelola pos pengeluaran dan pemasukan.";
      break;
    case "/ringkasan":
      title = "Ringkasan Bulanan";
      subtitle = "Analisis alokasi pengeluaran kas.";
      break;
    case "/pengaturan":
      title = "Pengaturan";
      subtitle = "Keamanan, target, dan cadangan data.";
      break;
  }

  return (
    <header className="w-full min-h-16 md:min-h-24 sticky top-0 z-40 bg-surface/95 backdrop-blur-sm flex justify-between items-center gap-3 px-4 md:px-12 py-3 md:py-6 ml-auto">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* App mark (mobile) */}
        <div className="md:hidden w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-on-secondary-container text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance_wallet
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="font-headline text-lg md:text-2xl font-bold text-primary leading-tight truncate">
            {title}
          </h2>
          <p className="hidden sm:block font-body text-xs md:text-sm text-on-surface-variant line-clamp-1">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <button
          aria-label={hideAmounts ? "Tampilkan nominal" : "Sembunyikan nominal"}
          title={hideAmounts ? "Tampilkan nominal" : "Sembunyikan nominal"}
          onClick={toggleHideAmounts}
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">
            {hideAmounts ? "visibility_off" : "visibility"}
          </span>
        </button>
        <button
          aria-label="Kalender"
          className="hidden sm:block p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">calendar_today</span>
        </button>
        <button
          aria-label="Notifikasi"
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors relative cursor-pointer"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
        </button>
        <div className="hidden md:block w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container ml-2">
          <img
            alt={`${profileName} Profile Avatar`}
            className="w-full h-full object-cover"
            src={profilePhoto}
          />
        </div>
      </div>
    </header>
  );
}
