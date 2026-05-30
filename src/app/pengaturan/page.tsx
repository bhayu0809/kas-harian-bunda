"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace("Rp", "Rp ");

export default function PengaturanPage() {
  const {
    savingsTarget,
    savedAmount,
    setSavingsTarget,
    setSavedAmount,
    pinIsDefault,
    changePin,
    biometricAvailable,
    biometricEnrolled,
    enrollBiometric,
    disableBiometric,
    exportDb,
    exportCsvData,
    importDb,
    resetData,
  } = useApp();
  const router = useRouter();

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [target, setTarget] = useState(savingsTarget);
  const [saved, setSaved] = useState(savedAmount);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(newPin)) return notify("PIN harus 4–6 digit angka.");
    if (newPin !== confirmPin) return notify("Konfirmasi PIN tidak cocok.");
    await changePin(newPin);
    setNewPin("");
    setConfirmPin("");
    notify("PIN berhasil diperbarui.");
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingsTarget(target);
    setSavedAmount(saved);
    notify("Target tabungan disimpan.");
  };

  const handleBiometricToggle = async () => {
    if (biometricEnrolled) {
      await disableBiometric();
      notify("Biometrik dinonaktifkan.");
    } else {
      const ok = await enrollBiometric();
      notify(ok ? "Biometrik diaktifkan." : "Pendaftaran biometrik dibatalkan/gagal.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Restore akan menimpa seluruh data saat ini. Lanjutkan?")) return;
    try {
      await importDb(file);
      notify("Data berhasil dipulihkan.");
    } catch {
      notify("Gagal memuat file. Pastikan file .db valid.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReset = async () => {
    if (!confirm("Hapus SEMUA transaksi dan kembalikan kategori ke awal? Tindakan ini tidak bisa dibatalkan.")) return;
    await resetData();
    notify("Semua data berhasil dihapus.");
  };

  const handleShowIntro = () => {
    localStorage.removeItem("kasharian_onboarded");
    router.push("/onboarding");
  };

  const cardClass = "bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-soft";
  const inputClass =
    "w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-0 transition-colors";
  const primaryBtn =
    "h-12 px-6 bg-primary text-on-primary rounded-xl font-body text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer";

  return (
    <DashboardLayout>
      <div className="px-6 md:px-12 py-8 max-w-5xl mx-auto w-full space-y-8 pb-24">
        {/* Keamanan */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Keamanan</h3>
          </div>

          {pinIsDefault && (
            <div className="mb-6 flex items-center gap-3 bg-tertiary-container text-on-tertiary-container rounded-2xl px-4 py-3">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <p className="font-body text-xs font-medium">
                Anda masih memakai PIN default (1234). Sebaiknya ganti sekarang.
              </p>
            </div>
          )}

          <form onSubmit={handleChangePin} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-1">PIN Baru</label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="4–6 digit"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-1">Konfirmasi PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Ulangi PIN"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={primaryBtn}>
                Simpan PIN
              </button>
            </div>
          </form>

          {/* Biometrik */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-surface-container">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-secondary text-[28px]">fingerprint</span>
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-on-surface">Buka dengan Biometrik</p>
                <p className="font-body text-xs text-on-surface-variant">
                  {biometricAvailable
                    ? "Sidik jari / Face ID dari perangkat ini."
                    : "Perangkat/koneksi ini tidak mendukung biometrik (butuh HTTPS)."}
                </p>
              </div>
            </div>
            <button
              onClick={handleBiometricToggle}
              disabled={!biometricAvailable}
              className={`shrink-0 h-11 px-5 rounded-xl font-body text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                biometricEnrolled
                  ? "bg-error-container text-on-error-container hover:opacity-90"
                  : "bg-secondary-container text-on-secondary-container hover:opacity-90"
              }`}
            >
              {biometricEnrolled ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </section>

        {/* Target Tabungan */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">savings</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Target Tabungan</h3>
          </div>
          <form onSubmit={handleSaveGoal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-1">Target ({formatRupiah(target)})</label>
              <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-1">Terkumpul ({formatRupiah(saved)})</label>
              <input type="number" value={saved} onChange={(e) => setSaved(Number(e.target.value))} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={primaryBtn}>
                Simpan Target
              </button>
            </div>
          </form>
        </section>

        {/* Cadangan & Data */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">database</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Cadangan & Ekspor Data</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Semua data tersimpan secara lokal (offline) di perangkat ini menggunakan SQLite.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportDb} className="h-12 px-6 bg-secondary text-on-secondary rounded-xl font-body text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">download</span>
              Export Backup (.db)
            </button>
            <button onClick={exportCsvData} className="h-12 px-6 bg-surface-container-high text-on-surface rounded-xl font-body text-sm font-semibold hover:bg-surface-container-highest active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">table_view</span>
              Export CSV / Excel
            </button>
            <button onClick={() => fileRef.current?.click()} className="h-12 px-6 bg-surface-container-high text-on-surface rounded-xl font-body text-sm font-semibold hover:bg-surface-container-highest active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">upload</span>
              Import / Restore (.db)
            </button>
            <input ref={fileRef} type="file" accept=".db,.sqlite,application/x-sqlite3" onChange={handleImport} className="hidden" />
            <button onClick={handleShowIntro} className="h-12 px-6 bg-surface-container-high text-on-surface rounded-xl font-body text-sm font-semibold hover:bg-surface-container-highest active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">slideshow</span>
              Lihat Intro Lagi
            </button>
          </div>
        </section>

        {/* Zona Berbahaya */}
        <section className="bg-error-container/30 border border-error/20 rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-error">Zona Berbahaya</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Menghapus seluruh transaksi dan mengembalikan kategori ke setelan awal. PIN &amp; biometrik tetap aman.
          </p>
          <button onClick={handleReset} className="h-12 px-6 bg-error text-on-error rounded-xl font-body text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            Hapus Semua Data
          </button>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-lg font-body text-sm animate-fade-in">
          {toast}
        </div>
      )}
    </DashboardLayout>
  );
}
