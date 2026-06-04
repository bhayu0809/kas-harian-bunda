"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import SideNavBar from "./SideNavBar";
import TopAppBar from "./TopAppBar";
import BottomNavBar from "./BottomNavBar";
import BudgetBanner from "./BudgetBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded } = useApp();
  const router = useRouter();

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

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopAppBar />
        <main className="flex-1 overflow-y-auto min-h-0 pb-24 md:pb-0">
          <BudgetBanner />
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNavBar />
    </div>
  );
}
