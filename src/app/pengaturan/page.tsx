"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AutoBackupFrequency, DEFAULT_PROFILE_PHOTO, useApp } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace("Rp", "Rp ");

const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Belum pernah";

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
};

export default function PengaturanPage() {
  const {
    pinIsDefault,
    changePin,
    biometricAvailable,
    biometricEnrolled,
    enrollBiometric,
    disableBiometric,
    exportDb,
    exportCsvData,
    importDb,
    autoBackups,
    autoBackupEnabled,
    autoBackupFrequency,
    autoBackupLastRun,
    setAutoBackupEnabled,
    setAutoBackupFrequency,
    createAutoBackup,
    restoreAutoBackup,
    deleteAutoBackup,
    resetData,
    templates,
    recurringTransactions,
    deleteTransactionTemplate,
    deleteRecurringTransaction,
    profileName,
    profilePhoto,
    setProfile,
    monthlyBudget,
    setMonthlyBudget,
    dailySpendingLimit,
    setDailySpendingLimit,
    notifPermission,
    enableBudgetAlerts,
  } = useApp();
  const router = useRouter();

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [budget, setBudget] = useState(monthlyBudget);
  const [dailyLimit, setDailyLimit] = useState(dailySpendingLimit);
  const [profileNameInput, setProfileNameInput] = useState(profileName);
  const [profilePhotoInput, setProfilePhotoInput] = useState(profilePhoto);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileNameInput(profileName);
    setProfilePhotoInput(profilePhoto);
  }, [profileName, profilePhoto]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await setProfile(profileNameInput, profilePhotoInput);
    notify("Profil berhasil diperbarui.");
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Pilih file gambar untuk foto profil.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("Ukuran foto maksimal 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfilePhotoInput(reader.result);
    };
    reader.onerror = () => notify("Gagal membaca foto profil.");
    reader.readAsDataURL(file);
  };

  const handleResetProfilePhoto = () => {
    setProfilePhotoInput(DEFAULT_PROFILE_PHOTO);
    if (profilePhotoRef.current) profilePhotoRef.current.value = "";
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    await setMonthlyBudget(budget);
    await setDailySpendingLimit(dailyLimit);
    notify(budget > 0 || dailyLimit > 0 ? "Batas pengeluaran disimpan." : "Pengingat pengeluaran dimatikan.");
  };

  const handleEnableAlerts = async () => {
    const ok = await enableBudgetAlerts();
    notify(ok ? "Notifikasi batas pengeluaran diaktifkan." : "Izin notifikasi ditolak/tidak didukung.");
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

  const handleToggleAutoBackup = async () => {
    const next = !autoBackupEnabled;
    await setAutoBackupEnabled(next);
    notify(next ? "Auto backup lokal diaktifkan." : "Auto backup lokal dimatikan.");
  };

  const handleAutoBackupFrequency = async (frequency: AutoBackupFrequency) => {
    await setAutoBackupFrequency(frequency);
    notify("Frekuensi auto backup disimpan.");
  };

  const handleCreateAutoBackup = async () => {
    await createAutoBackup();
    notify("Backup lokal dibuat.");
  };

  const handleRestoreAutoBackup = async (id: string) => {
    if (!confirm("Pulihkan data dari auto backup ini? Data saat ini akan ditimpa.")) return;
    try {
      await restoreAutoBackup(id);
      notify("Data berhasil dipulihkan dari auto backup.");
    } catch {
      notify("Auto backup tidak ditemukan atau gagal dipulihkan.");
    }
  };

  const handleDeleteAutoBackup = async (id: string) => {
    if (!confirm("Hapus snapshot auto backup ini?")) return;
    await deleteAutoBackup(id);
    notify("Auto backup dihapus.");
  };

  const handleReset = async () => {
    if (!confirm("Hapus SEMUA transaksi dan kembalikan kategori ke awal? Tindakan ini tidak bisa dibatalkan.")) return;
    await resetData();
    notify("Semua data berhasil dihapus.");
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteTransactionTemplate(id);
    notify("Template dihapus.");
  };

  const handleDeleteRecurring = async (id: string) => {
    await deleteRecurringTransaction(id);
    notify("Transaksi berulang dihapus.");
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
  const secondaryActionBtn =
    "min-h-12 w-full sm:w-auto px-5 bg-surface-container-high text-on-surface rounded-xl font-body text-sm font-semibold hover:bg-surface-container-highest active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-center";

  return (
    <DashboardLayout>
      <div className="px-6 md:px-12 py-8 max-w-5xl mx-auto w-full space-y-8 pb-24">
        {/* Profil */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">account_circle</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Profil Pengguna</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Nama dan foto ini muncul di header dan menu samping. Data disimpan lokal dan ikut masuk ke backup.
          </p>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 items-start">
            <div className="flex flex-col items-start gap-3">
              <img
                alt="Foto profil"
                src={profilePhotoInput}
                className="w-24 h-24 rounded-3xl object-cover border-2 border-surface-container-highest bg-surface-container-low"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => profilePhotoRef.current?.click()}
                  className="h-10 w-10 rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Pilih foto profil"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetProfilePhoto}
                  className="h-10 w-10 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Reset foto profil"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                </button>
              </div>
              <input ref={profilePhotoRef} type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-1">Nama Pengguna</label>
                <input
                  type="text"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  placeholder="Bunda"
                  className={inputClass}
                />
              </div>
              <button type="submit" className={primaryBtn}>
                Simpan Profil
              </button>
            </div>
          </form>
        </section>

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-surface-container">
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
              className={`w-full sm:w-auto shrink-0 h-11 px-5 rounded-xl font-body text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                biometricEnrolled
                  ? "bg-error-container text-on-error-container hover:opacity-90"
                  : "bg-secondary-container text-on-secondary-container hover:opacity-90"
              }`}
            >
              {biometricEnrolled ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </section>

        {/* Batas Pengeluaran + Notifikasi */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">notifications_active</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Batas Pengeluaran</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Tetapkan batas belanja harian dan bulanan untuk pengingat. Dana bulan ini tetap mengikuti pemasukan yang dicatat, sedangkan batas ini hanya dipakai untuk alarm. Setel 0 untuk mematikan batas terkait.
          </p>
          <form onSubmit={handleSaveBudget} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-end mb-6">
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-1">
                Batas Harian ({formatRupiah(dailyLimit)})
              </label>
              <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-1">
                Batas Bulanan ({formatRupiah(budget)})
              </label>
              <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={primaryBtn}>Simpan Batas</button>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-surface-container">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-secondary text-[28px]">notifications</span>
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-on-surface">Notifikasi Pengingat</p>
                <p className="font-body text-xs text-on-surface-variant">
                  {notifPermission === "granted"
                    ? "Aktif. Paling andal saat aplikasi dibuka."
                    : notifPermission === "unsupported"
                    ? "Perangkat/browser ini tidak mendukung notifikasi."
                    : notifPermission === "denied"
                    ? "Diblokir — aktifkan lewat pengaturan browser."
                    : "Izinkan agar pengingat muncul sebagai notifikasi."}
                </p>
              </div>
            </div>
            <button
              onClick={handleEnableAlerts}
              disabled={notifPermission === "granted" || notifPermission === "unsupported" || notifPermission === "denied"}
              className="w-full sm:w-auto shrink-0 h-11 px-5 rounded-xl font-body text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-secondary-container text-on-secondary-container hover:opacity-90"
            >
              {notifPermission === "granted" ? "Aktif" : "Aktifkan"}
            </button>
          </div>
        </section>

        {/* Template & Transaksi Berulang */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Pencatatan Cepat</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Template muncul di halaman Tambah. Transaksi berulang dibuat otomatis saat app dibuka pada bulan berjalan.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Template</h4>
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <p className="rounded-2xl bg-surface-container-low p-4 font-body text-xs text-on-surface-variant">
                    Belum ada template. Simpan dari halaman Tambah.
                  </p>
                ) : (
                  templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-on-surface truncate">{template.label}</p>
                        <p className="font-body text-xs text-on-surface-variant">{formatRupiah(template.amount)} • {template.category}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTemplate(template.id)}
                        className="h-9 w-9 rounded-full bg-error-container/60 text-error hover:bg-error hover:text-on-error transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Hapus template"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Berulang Bulanan</h4>
              <div className="space-y-2">
                {recurringTransactions.length === 0 ? (
                  <p className="rounded-2xl bg-surface-container-low p-4 font-body text-xs text-on-surface-variant">
                    Belum ada transaksi berulang. Aktifkan dari halaman Tambah.
                  </p>
                ) : (
                  recurringTransactions.map((recurring) => (
                    <div key={recurring.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-on-surface truncate">{recurring.label}</p>
                        <p className="font-body text-xs text-on-surface-variant">
                          Tanggal {recurring.dayOfMonth} • {formatRupiah(recurring.amount)} • {recurring.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRecurring(recurring.id)}
                        className="h-9 w-9 rounded-full bg-error-container/60 text-error hover:bg-error hover:text-on-error transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Hapus transaksi berulang"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Auto Backup */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">backup</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Auto Backup Lokal</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Menyimpan snapshot database lengkap di perangkat ini. Snapshot tidak diunggah dan tidak otomatis menjadi file download.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 mb-6">
            <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-on-surface">Status Auto Backup</p>
                <p className="font-body text-xs text-on-surface-variant">
                  {autoBackupEnabled ? `Aktif, ${autoBackupFrequency === "daily" ? "harian" : autoBackupFrequency === "weekly" ? "mingguan" : "bulanan"}.` : "Tidak aktif."} Backup terakhir: {formatDateTime(autoBackupLastRun)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggleAutoBackup()}
                className={`w-full sm:w-auto shrink-0 h-11 px-5 rounded-xl font-body text-xs font-bold transition-all cursor-pointer ${
                  autoBackupEnabled
                    ? "bg-secondary text-on-secondary hover:opacity-90"
                    : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                }`}
              >
                {autoBackupEnabled ? "Aktif" : "Aktifkan"}
              </button>
            </div>

            <button type="button" onClick={() => void handleCreateAutoBackup()} className="min-h-12 px-5 bg-secondary text-on-secondary rounded-xl font-body text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-center">
              <span className="material-symbols-outlined text-[20px]">add_task</span>
              Backup Sekarang
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            {(["daily", "weekly", "monthly"] as AutoBackupFrequency[]).map((frequency) => (
              <button
                key={frequency}
                type="button"
                onClick={() => void handleAutoBackupFrequency(frequency)}
                className={`min-h-11 rounded-xl border px-4 font-body text-sm font-semibold transition-all cursor-pointer ${
                  autoBackupFrequency === frequency
                    ? "border-secondary bg-secondary-container text-on-secondary-container"
                    : "border-surface-container-highest bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {frequency === "daily" ? "Harian" : frequency === "weekly" ? "Mingguan" : "Bulanan"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-wider">Snapshot Tersimpan</h4>
            {autoBackups.length === 0 ? (
              <p className="rounded-2xl bg-surface-container-low p-4 font-body text-xs text-on-surface-variant">
                Belum ada auto backup. Aktifkan auto backup atau tekan Backup Sekarang.
              </p>
            ) : (
              autoBackups.map((backup) => (
                <div key={backup.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-on-surface">{formatDateTime(backup.createdAt)}</p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {formatBytes(backup.size)} • {backup.reason.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRestoreAutoBackup(backup.id)}
                      className="h-10 flex-1 sm:flex-none sm:w-10 rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors cursor-pointer flex items-center justify-center"
                      aria-label="Pulihkan auto backup"
                    >
                      <span className="material-symbols-outlined text-[18px]">restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAutoBackup(backup.id)}
                      className="h-10 flex-1 sm:flex-none sm:w-10 rounded-full bg-error-container/60 text-error hover:bg-error hover:text-on-error transition-colors cursor-pointer flex items-center justify-center"
                      aria-label="Hapus auto backup"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Backup & Restore */}
        <section className={cardClass}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">database</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-primary">Backup & Restore Data</h3>
          </div>
          <p className="font-body text-xs text-on-surface-variant mb-6">
            Backup .db menyimpan data lengkap: transaksi, kategori, template, transaksi berulang, batas pengeluaran, PIN, dan pengaturan lokal lainnya.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportDb} className="min-h-12 w-full sm:w-auto px-5 bg-secondary text-on-secondary rounded-xl font-body text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-center">
              <span className="material-symbols-outlined text-[20px]">download</span>
              Backup Data Lengkap (.db)
            </button>
            <button onClick={exportCsvData} className={secondaryActionBtn}>
              <span className="material-symbols-outlined text-[20px]">table_view</span>
              Export CSV / Excel
            </button>
            <button onClick={() => fileRef.current?.click()} className={secondaryActionBtn}>
              <span className="material-symbols-outlined text-[20px]">upload</span>
              Restore dari Backup (.db)
            </button>
            <input ref={fileRef} type="file" accept=".db,.sqlite,application/x-sqlite3" onChange={handleImport} className="hidden" />
            <button onClick={handleShowIntro} className={secondaryActionBtn}>
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
          <button onClick={handleReset} className="min-h-12 w-full sm:w-auto px-6 bg-error text-on-error rounded-xl font-body text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-center">
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
