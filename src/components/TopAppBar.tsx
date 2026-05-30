"use client";

import React from "react";
import { usePathname } from "next/navigation";

interface TopAppBarProps {
  onMenuClick: () => void;
}

export default function TopAppBar({ onMenuClick }: TopAppBarProps) {
  const pathname = usePathname();

  // Determine headers based on path
  let title = "Halo, Bunda";
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
    <header className="w-full h-24 sticky top-0 z-40 bg-surface flex justify-between items-center px-6 md:px-12 py-6 ml-auto">
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          aria-label="Menu"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-full hover:bg-surface-container text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[28px]">menu</span>
        </button>
        <div>
          <h2 className="font-headline text-2xl font-bold text-primary leading-tight">
            {title}
          </h2>
          <p className="font-body text-sm text-on-surface-variant">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Kalender"
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
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
            alt="Bunda Profile Avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwfnRzzCqobbQUUBTDt4SUidJGSygI3y1bJcoI4lDQhvp3R81mk-5Zuw7I6Q8eCp-qJgCjtKMD64al35FYraT_uXWzKlfNt3WK78l5klplDRQj-_-R2-jGKcJIk0hozbIOhSnwxsD_mtXaWoYekYf2lR2IGtLSse0Ly7nZbjGrhk9C5VwLrGXklY6gzByJuolHRWjkJk1XNMc8o9IkGOnBvdqmD1MJUFeR-TGbyOY8ZgvpRJdvCDgvJKvkEKwQKzBiIV-mt26Xg6r_"
          />
        </div>
      </div>
    </header>
  );
}
