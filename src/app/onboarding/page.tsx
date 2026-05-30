"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    icon: "account_balance_wallet",
    title: "Selamat datang di Kas Harian Rumah",
    desc: "Catat keuangan rumah tangga dengan cara yang hangat, sederhana, dan menenangkan.",
  },
  {
    icon: "sync_alt",
    title: "Catat Pemasukan & Pengeluaran",
    desc: "Tambah transaksi harian lengkap dengan kategori dan sumber dana hanya dalam beberapa ketukan.",
  },
  {
    icon: "insights",
    title: "Pantau Lewat Ringkasan",
    desc: "Lihat riwayat, alokasi pengeluaran terbesar, dan sisa uang Anda setiap bulan.",
  },
  {
    icon: "shield_lock",
    title: "Aman & Bisa Offline",
    desc: "Data tersimpan di perangkat Anda, dikunci dengan PIN atau biometrik, dan bisa dicadangkan kapan saja.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = () => {
    localStorage.setItem("kasharian_onboarded", "true");
    router.replace("/login");
  };

  const next = () => (isLast ? finish() : setIndex((i) => i + 1));

  return (
    <main className="flex-grow flex flex-col min-h-screen bg-background p-6 md:p-12">
      {/* Skip */}
      <div className="w-full max-w-[480px] mx-auto flex justify-end">
        <button
          onClick={finish}
          className="font-body text-sm text-on-surface-variant hover:text-on-surface py-2 px-3 rounded-lg transition-colors cursor-pointer"
        >
          Lewati
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-[480px] mx-auto">
        <div
          key={index}
          className="w-32 h-32 md:w-40 md:h-40 rounded-[36px] bg-secondary-container flex items-center justify-center mb-12 shadow-soft animate-scale-up"
        >
          <span
            className="material-symbols-outlined text-[64px] md:text-[72px] text-on-secondary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {slide.icon}
          </span>
        </div>
        <h1 key={`t-${index}`} className="font-headline text-2xl md:text-3xl font-bold text-primary mb-4 animate-fade-in">
          {slide.title}
        </h1>
        <p key={`d-${index}`} className="font-body text-base text-on-surface-variant max-w-[360px] animate-fade-in">
          {slide.desc}
        </p>
      </div>

      {/* Dots + actions */}
      <div className="w-full max-w-[480px] mx-auto flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === index ? "w-8 bg-secondary" : "w-2 bg-outline-variant hover:bg-outline"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full max-w-xs h-16 bg-primary text-on-primary font-body text-base font-semibold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
        >
          {isLast ? "Mulai Sekarang" : "Lanjut"}
          <span className="material-symbols-outlined">{isLast ? "check_circle" : "arrow_forward"}</span>
        </button>
      </div>
    </main>
  );
}
