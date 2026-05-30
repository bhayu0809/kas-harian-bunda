"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

interface SideNavBarProps {
  onCloseMobile?: () => void;
}

export default function SideNavBar({ onCloseMobile }: SideNavBarProps) {
  const pathname = usePathname();
  const { logout, profileName, profilePhoto } = useApp();

  const menuItems = [
    { name: "Beranda", icon: "home", path: "/" },
    { name: "Tambah", icon: "add_circle", path: "/tambah" },
    { name: "Riwayat", icon: "history", path: "/riwayat" },
    { name: "Kategori", icon: "category", path: "/kategori" },
    { name: "Ringkasan", icon: "insights", path: "/ringkasan" },
    { name: "Pengaturan", icon: "settings", path: "/pengaturan" },
  ];

  return (
    <aside className="bg-surface-container-low h-full w-full flex flex-col py-8 space-y-6">
      {/* Brand Header */}
      <div className="px-6 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-on-secondary-container text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance_wallet
          </span>
        </div>
        <div>
          <h1 className="font-headline text-xl font-bold text-secondary leading-tight">
            Kas Harian Rumah
          </h1>
          <p className="font-body text-xs text-on-surface-variant">
            Kesejahteraan Finansial
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onCloseMobile}
              className={`flex items-center gap-4 px-6 py-4 mx-4 transition-all duration-200 rounded-xl font-body text-sm ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-semibold scale-95 shadow-sm"
                  : "text-on-surface-variant hover:text-secondary hover:bg-surface-container-high"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile / Logout Action */}
      <div className="px-6 mt-auto">
        <div 
          onClick={logout}
          title="Klik untuk Logout"
          className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-high hover:bg-red-50 hover:text-red-700 transition-all duration-200 cursor-pointer group"
        >
          <img
            alt={`${profileName} Profile Avatar`}
            className="w-10 h-10 rounded-full object-cover border-2 border-surface group-hover:border-red-200 transition-colors"
            src={profilePhoto}
          />
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-on-surface group-hover:text-red-700 truncate">
              {profileName}
            </p>
            <p className="font-body text-xs text-on-surface-variant group-hover:text-red-600 truncate">
              Keluar Sesi
            </p>
          </div>
          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            logout
          </span>
        </div>
      </div>
    </aside>
  );
}
