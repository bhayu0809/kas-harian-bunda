"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import SideNavBar from "./SideNavBar";
import TopAppBar from "./TopAppBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded } = useApp();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoaded, router]);

  // Prevent flash of content during loading
  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface text-primary">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-[40px]">sync</span>
          <p className="font-body text-sm font-medium">Memuat catatan kas...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      {/* Desktop Sidebar (Left side, fixed width 80 (320px)) */}
      <aside className="hidden md:block w-80 shrink-0 h-full border-r border-surface-container shadow-[30px_0_60px_-15px_rgba(93,92,86,0.08)] z-30">
        <SideNavBar />
      </aside>

      {/* Mobile Drawer (Overlay backdrop & sliding nav) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-on-background/30 backdrop-blur-xs transition-opacity duration-300"
          />
          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] bg-surface-container-low h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="absolute top-6 right-6 z-50">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <SideNavBar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopAppBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
