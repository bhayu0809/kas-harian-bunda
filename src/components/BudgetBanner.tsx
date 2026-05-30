"use client";

import { useBudgetAlert } from "@/hooks/useBudgetAlert";

// In-app warning shown across dashboard pages when monthly spending is on pace
// to exhaust the budget before month-end (or has already exceeded it).
export default function BudgetBanner() {
  const { visible, message, exceeded, dismiss } = useBudgetAlert();
  if (!visible) return null;

  return (
    <div className="px-6 md:px-12 pt-4">
      <div
        className={`max-w-7xl mx-auto flex items-start gap-3 rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-soft ${
          exceeded
            ? "bg-error-container text-on-error-container"
            : "bg-tertiary-container text-on-tertiary-container"
        }`}
      >
        <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          {exceeded ? "error" : "warning"}
        </span>
        <p className="flex-1 font-body text-sm leading-snug">{message}</p>
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="shrink-0 -m-1 p-1 rounded-full hover:bg-on-tertiary-container/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}
