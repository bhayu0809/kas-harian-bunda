"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Mobile-only bottom navigation. Replaces the hamburger drawer for the
// pages used most often day-to-day. "Tambah" sits in the middle as a
// prominent elevated button since logging a transaction is the core action.
export default function BottomNavBar() {
  const pathname = usePathname();

  const sideItems = [
    { name: "Beranda", icon: "home", path: "/" },
    { name: "Riwayat", icon: "history", path: "/riwayat" },
    { name: "Ringkasan", icon: "insights", path: "/ringkasan" },
    { name: "Pengaturan", icon: "settings", path: "/pengaturan" },
  ];

  const isAddActive = pathname === "/tambah";

  // The Tambah screen shows its own sticky Save/Batal action bar on mobile,
  // so the bottom nav would only get in the way there.
  if (isAddActive) return null;

  const renderItem = (item: { name: string; icon: string; path: string }) => {
    const isActive = pathname === item.path;
    return (
      <Link
        key={item.path}
        href={item.path}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 min-w-0"
      >
        <span
          className={`material-symbols-outlined text-[24px] transition-colors ${
            isActive ? "text-secondary" : "text-on-surface-variant"
          }`}
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
        >
          {item.icon}
        </span>
        <span
          className={`font-body text-[10px] leading-none truncate max-w-full transition-colors ${
            isActive ? "text-secondary font-bold" : "text-on-surface-variant font-medium"
          }`}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-surface-container shadow-[0_-8px_30px_-12px_rgba(93,92,86,0.18)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-end justify-around px-2 pt-1 pb-1 relative">
        {renderItem(sideItems[0])}
        {renderItem(sideItems[1])}

        {/* Center elevated Tambah button */}
        <div className="flex-1 flex justify-center min-w-0">
          <Link
            href="/tambah"
            aria-label="Tambah Transaksi"
            className="-mt-6 flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-full bg-secondary text-on-secondary shadow-lg active:scale-95 transition-all"
          >
            <span
              className="material-symbols-outlined text-[30px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add
            </span>
            <span className="font-body text-[9px] font-bold leading-none">Tambah</span>
          </Link>
        </div>

        {renderItem(sideItems[2])}
        {renderItem(sideItems[3])}
      </div>
    </nav>
  );
}
