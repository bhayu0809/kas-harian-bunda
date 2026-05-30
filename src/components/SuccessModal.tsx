"use client";

import React from "react";

interface SuccessModalProps {
  isOpen: boolean;
  onGoHome: () => void;
  onRecordAgain: () => void;
  title?: string;
  message?: string;
  primaryLabel?: string;
  showRecordAgain?: boolean;
}

export default function SuccessModal({
  isOpen,
  onGoHome,
  onRecordAgain,
  title = "Berhasil dicatat",
  message = "Transaksi Anda telah berhasil ditambahkan ke dalam jurnal harian.",
  primaryLabel = "Kembali ke Beranda",
  showRecordAgain = true,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-on-background/25 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      {/* Modal Card */}
      <div className="bg-surface-container-lowest rounded-[32px] p-8 md:p-12 w-full max-w-[480px] shadow-[0_40px_80px_-20px_rgba(93,92,86,0.15)] flex flex-col items-center text-center animate-scale-up">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-secondary-container rounded-full flex items-center justify-center mb-8 shadow-[0_10px_30px_-10px_rgba(44,105,86,0.3)]">
          <span
            className="material-symbols-outlined text-[48px] text-on-secondary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>

        {/* Content */}
        <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-3">
          {title}
        </h2>
        <p className="font-body text-sm md:text-base text-on-surface-variant mb-8 max-w-[90%]">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onGoHome}
            className="w-full h-16 bg-primary text-on-primary rounded-xl font-body text-sm font-semibold flex items-center justify-center hover:bg-inverse-surface transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            {primaryLabel}
          </button>
          {showRecordAgain && (
            <button
              onClick={onRecordAgain}
              className="w-full h-16 bg-surface-container-high text-on-surface rounded-xl font-body text-sm font-semibold flex items-center justify-center hover:bg-surface-container-highest transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              Catat lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
