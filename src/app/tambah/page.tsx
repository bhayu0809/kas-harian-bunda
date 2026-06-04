"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp, TransactionType, TransactionSource } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import SuccessModal from "@/components/SuccessModal";
import { formatNumberInput, parseNumberInput } from "@/lib/numberInput";

// Local YYYY-MM-DD (avoids the UTC shift that toISOString can introduce).
const toDateValue = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().substring(0, 10);
};

// Short, friendly label for a YYYY-MM-DD string, e.g. "4 Jun 2026".
const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));

function TambahForm() {
  const {
    transactions,
    templates,
    categories,
    addTransaction,
    updateTransaction,
    addTransactionTemplate,
    addRecurringTransaction,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get type from query params (default to expense)
  const initialType = searchParams.get("type") === "income" ? "income" : "expense";
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const templateId = searchParams.get("template");
  const editTx = editId ? transactions.find((tx) => tx.id === editId) : undefined;
  const duplicateTx = duplicateId ? transactions.find((tx) => tx.id === duplicateId) : undefined;
  const selectedTemplate = templateId ? templates.find((template) => template.id === templateId) : undefined;
  const isEditing = Boolean(editId && editTx);

  // Form states
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<number>(0);
  const [amountInput, setAmountInput] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [source, setSource] = useState<TransactionSource>("Transfer");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  // Secondary fields (label, date, notes, sumber dana, opsi) live in a modal so
  // the main entry — nominal + kategori + simpan — always fits one screen
  // without page scrolling, on every device size.
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Update type state if searchParams change
  useEffect(() => {
    const pType = searchParams.get("type");
    if (pType === "income" || pType === "expense") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(pType);
      
      // Auto select default category based on type
      if (pType === "income") {
        setCategory("Pendapatan");
      } else {
        setCategory("Belanja Dapur");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const sourceTx = editTx || duplicateTx;
    if (sourceTx) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(sourceTx.type);
      setAmount(sourceTx.amount);
      setAmountInput(formatNumberInput(sourceTx.amount));
      setLabel(sourceTx.label);
      setCategory(sourceTx.category);
      setDate((isEditing ? sourceTx.date : new Date().toISOString()).substring(0, 10));
      setNotes(sourceTx.notes ?? "");
      setSource(sourceTx.source);
      setSaveAsTemplate(false);
      setRepeatMonthly(false);
      return;
    }

    if (selectedTemplate) {
      setType(selectedTemplate.type);
      setAmount(selectedTemplate.amount);
      setAmountInput(formatNumberInput(selectedTemplate.amount));
      setLabel(selectedTemplate.label);
      setCategory(selectedTemplate.category);
      setNotes(selectedTemplate.notes ?? "");
      setSource(selectedTemplate.source);
      setSaveAsTemplate(false);
      setRepeatMonthly(false);
    }
  }, [editTx, duplicateTx, selectedTemplate, isEditing]);

  // Set default category on mount/type change if not already set.
  useEffect(() => {
    if (category) return;
    if (type === "income") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory("Pendapatan");
    } else {
      setCategory("Belanja Dapur");
    }
  }, [type, category]);

  const handleShorthandAmount = (value: number) => {
    const nextAmount = amount + value;
    setAmount(nextAmount);
    setAmountInput(formatNumberInput(nextAmount));
  };

  const handleAmountInputChange = (val: string) => {
    const parsed = parseNumberInput(val);
    setAmount(parsed);
    setAmountInput(formatNumberInput(parsed));
  };

  const switchType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(nextType === "income" ? "Pendapatan" : "Belanja Dapur");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert("Masukkan nominal transaksi yang valid.");
      return;
    }

    // Default label if empty
    const finalLabel = label.trim() || (type === "income" ? "Pemasukan Baru" : "Pengeluaran Baru");

    const isoDate = new Date(date);
    // Add current hours/minutes to preserve time sequence
    const now = new Date();
    isoDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const transactionInput = {
      label: finalLabel,
      amount,
      type,
      category: category || (type === "income" ? "Pendapatan" : "Lainnya"),
      date: isoDate.toISOString(),
      notes,
      source,
    };

    if (isEditing && editId) {
      await updateTransaction(editId, transactionInput);
    } else {
      await addTransaction(transactionInput);
      if (saveAsTemplate) {
        await addTransactionTemplate({
          label: finalLabel,
          amount,
          type,
          category: transactionInput.category,
          notes,
          source,
        });
      }
      if (repeatMonthly) {
        await addRecurringTransaction({
          label: finalLabel,
          amount,
          type,
          category: transactionInput.category,
          notes,
          source,
          dayOfMonth: isoDate.getDate(),
        });
      }
    }

    setShowSuccess(true);
  };

  const handleResetForm = () => {
    setAmount(0);
    setAmountInput("");
    setLabel("");
    setNotes("");
    setDate(new Date().toISOString().substring(0, 10));
    setSaveAsTemplate(false);
    setRepeatMonthly(false);
    setShowSuccess(false);
  };

  const isExpense = type === "expense";

  // Filter categories shown for user selection
  // Incomes usually use "Pendapatan" or custom categories.
  // Expenses show all except "Pendapatan" (unless they want to).
  const selectableCategories = isExpense
    ? categories.filter((c) => c.name !== "Pendapatan")
    : [{ id: "cat-inc", name: "Pendapatan", description: "Penerimaan masuk", icon: "payments", colorType: "secondary" as const }, ...categories.filter((c) => c.name !== "Pendapatan")];

  // Whether the user has set anything beyond the defaults — drives the dot on
  // the "Detail" button so they know extra info is attached.
  const hasDetail =
    label.trim() !== "" || notes.trim() !== "" || source !== "Transfer" || saveAsTemplate || repeatMonthly;

  // Date quick-select — kept on the main form (date is a "verify" field).
  const todayStr = toDateValue(new Date());
  const yesterdayStr = toDateValue(new Date(Date.now() - 86400000));
  const isToday = date === todayStr;
  const isYesterday = date === yesterdayStr;
  const isCustomDate = !isToday && !isYesterday;
  const dateChip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 font-body text-xs font-bold transition-colors cursor-pointer ${
      active
        ? "bg-secondary-container text-on-secondary-container"
        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
    }`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <form
        onSubmit={handleSave}
        className="flex-1 min-h-0 flex flex-col gap-3 md:gap-4 w-full max-w-2xl mx-auto px-4 md:px-6 pt-2 md:pt-4 pb-3 md:pb-6"
      >
        {/* Quick templates (compact chips) */}
        {templates.length > 0 && !isEditing && (
          <div className="shrink-0 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => router.push(`/tambah?template=${template.id}`)}
                className="shrink-0 rounded-full bg-surface-container-low px-4 py-2 font-body text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                {template.label}
              </button>
            ))}
          </div>
        )}

        {/* Amount Input Card */}
        <div className="shrink-0 bg-surface-container-lowest rounded-3xl p-4 md:p-6 shadow-lux flex flex-col items-center text-center relative overflow-hidden">
          {/* Glow effects based on type */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 blur-3xl pointer-events-none rounded-full transition-colors duration-300 ${
              isExpense ? "bg-error-container/20" : "bg-secondary-container/30"
            }`}
          />

          {/* Type Toggle */}
          <div className="bg-surface-container p-1 rounded-full flex w-full max-w-xs mb-3 md:mb-5 relative z-10 border border-surface-container-high">
            <button
              type="button"
              onClick={() => switchType("expense")}
              className={`flex-1 py-2.5 px-3 rounded-full font-body text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                isExpense
                  ? "bg-error-container text-on-error-container shadow-sm scale-95"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_downward
              </span>
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => switchType("income")}
              className={`flex-1 py-2.5 px-3 rounded-full font-body text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                !isExpense
                  ? "bg-secondary-container text-on-secondary-container shadow-sm scale-95"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              Pemasukan
            </button>
          </div>

          {/* Numeric input field */}
          <div className="flex items-center justify-center gap-2 w-full mb-3 md:mb-4 border-b-2 border-surface-container-highest pb-2 md:pb-3 focus-within:border-primary transition-colors">
            <span className="font-headline text-2xl font-bold text-on-surface-variant">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => handleAmountInputChange(e.target.value)}
              className="bg-transparent border-none p-0 text-center font-headline text-4xl font-bold text-on-surface w-full max-w-[220px] focus:ring-0 focus:outline-none placeholder-outline-variant"
              placeholder="0"
            />
          </div>

          {/* Shortcuts */}
          <div className="flex flex-wrap justify-center gap-2 w-full relative z-10">
            {[
              { label: "+10k", value: 10000 },
              { label: "+20k", value: 20000 },
              { label: "+50k", value: 50000 },
              { label: "+100k", value: 100000 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleShorthandAmount(item.value)}
                className="py-1.5 px-3.5 rounded-full border border-outline-variant text-on-surface-variant font-body text-xs font-medium hover:bg-surface-container hover:border-outline transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date quick-select — visible on the main form, defaults to today */}
        <div className="shrink-0 bg-surface-container-lowest rounded-2xl px-3.5 py-2.5 shadow-soft flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">event</span>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button type="button" onClick={() => setDate(todayStr)} className={dateChip(isToday)}>
              Hari ini
            </button>
            <button type="button" onClick={() => setDate(yesterdayStr)} className={dateChip(isYesterday)}>
              Kemarin
            </button>
            {/* Custom date: transparent native picker overlays a chip */}
            <div className="relative shrink-0">
              <span className={`${dateChip(isCustomDate)} block`}>
                {isCustomDate ? formatShortDate(date) : "Pilih"}
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Pilih tanggal"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Categories Card — fills remaining height, scrolls internally so the page never scrolls */}
        <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-3xl p-4 md:p-6 shadow-lux flex flex-col">
          <div className="shrink-0 flex items-center justify-between gap-2 mb-3 pb-2 border-b border-surface-container">
            <h3 className="font-headline text-base md:text-lg font-bold text-on-surface">
              Pilih Kategori
            </h3>
            <button
              type="button"
              onClick={() => router.push("/kategori")}
              className="text-secondary font-body text-xs font-semibold hover:underline cursor-pointer"
            >
              Kelola Kategori
            </button>
          </div>

          {/* Scrollable grid */}
          <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 scrollbar-hide">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 md:gap-3">
              {selectableCategories.map((cat) => {
                const isActive = category === cat.name;

                // Define background color based on category colorType
                let catColorClass = "bg-surface-container-low text-on-surface-variant border-transparent";
                if (isActive) {
                  if (cat.colorType === "secondary") {
                    catColorClass = "bg-secondary-container border-secondary/20 text-on-secondary-container scale-[0.98] shadow-sm";
                  } else if (cat.colorType === "tertiary") {
                    catColorClass = "bg-tertiary-container text-on-tertiary-container border-tertiary/20 scale-[0.98] shadow-sm";
                  } else if (cat.colorType === "primary") {
                    catColorClass = "bg-primary-container text-on-primary-container border-primary/20 scale-[0.98] shadow-sm";
                  } else if (cat.colorType === "error") {
                    catColorClass = "bg-error-container text-on-error-container border-error/20 scale-[0.98] shadow-sm";
                  } else if (cat.colorType === "secondary-fixed") {
                    catColorClass = "bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim/20 scale-[0.98] shadow-sm";
                  } else if (cat.colorType === "primary-fixed") {
                    catColorClass = "bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim/20 scale-[0.98] shadow-sm";
                  }
                } else {
                  catColorClass = "bg-surface-container-low hover:bg-surface-container-high border-transparent text-on-surface-variant";
                }

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-1.5 md:gap-2 p-2 md:p-3 rounded-2xl border-2 transition-all cursor-pointer ${catColorClass}`}
                  >
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-white/80 shadow-xs"
                          : "bg-surface-container-highest"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[20px] md:text-[24px]"
                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {cat.icon}
                      </span>
                    </div>
                    <span className="font-body text-[11px] md:text-xs font-semibold text-center leading-tight w-full">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action row — Detail (opens modal) + Simpan, always visible */}
        <div className="shrink-0 flex gap-2.5">
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="relative shrink-0 flex items-center justify-center gap-2 rounded-2xl bg-surface-container-high text-on-surface px-4 md:px-5 py-3.5 font-body text-sm font-semibold active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span>Detail</span>
            {hasDetail && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary" />
            )}
          </button>
          <button
            type="submit"
            className="flex-1 rounded-2xl bg-primary text-on-primary font-headline text-base font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 py-3.5 shadow-lg shadow-primary/10 cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            {isEditing ? "Perbarui" : "Simpan"}
          </button>
        </div>
      </form>

      {/* Detail modal — secondary fields, all sizes. Bottom-sheet on mobile, dialog on sm+. */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            onClick={() => setDetailOpen(false)}
            className="absolute inset-0 bg-on-background/40 backdrop-blur-xs animate-fade-in"
          />
          <div className="relative w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88dvh] flex flex-col animate-scale-up">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-surface-container">
              <h3 className="font-headline text-lg font-bold text-on-surface">Detail Transaksi</h3>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Tutup"
                className="p-2 -mr-2 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body (scrolls if tall) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 py-5 flex flex-col gap-4">
              {/* Transaction Label Field */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Nama Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="misal: Belanja Sayur Bulanan"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-3.5 md:p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors"
                />
              </div>

              {/* Notes Field */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  placeholder="Tulis rincian transaksi di sini..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-3.5 md:p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors placeholder-outline-variant resize-none"
                />
              </div>

              {/* Payment Method */}
              <div className="flex flex-col gap-2">
                <p className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Sumber Dana
                </p>
                <div className="flex gap-2">
                  {(["Tunai", "Transfer", "E-Wallet"] as const).map((method) => {
                    const isSelected = source === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSource(method)}
                        className={`flex-1 py-3 px-1.5 rounded-xl font-body text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-primary text-on-primary border-primary shadow-sm"
                            : "bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-3.5 md:p-4 font-body text-xs font-semibold text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Simpan sebagai template
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-3.5 md:p-4 font-body text-xs font-semibold text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={repeatMonthly}
                      onChange={(e) => setRepeatMonthly(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Ulangi tiap bulan
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="shrink-0 px-5 md:px-6 py-4 border-t border-surface-container"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            >
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="w-full rounded-2xl bg-primary text-on-primary font-headline text-base font-bold py-3.5 active:scale-[0.98] transition-transform cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post transaction addition feedback */}
      <SuccessModal
        isOpen={showSuccess}
        onGoHome={() => router.push(isEditing ? "/riwayat" : "/")}
        onRecordAgain={handleResetForm}
        title={isEditing ? "Berhasil diperbarui" : "Berhasil dicatat"}
        message={
          isEditing
            ? "Perubahan transaksi sudah disimpan ke riwayat."
            : "Transaksi Anda telah berhasil ditambahkan ke dalam jurnal harian."
        }
        primaryLabel={isEditing ? "Kembali ke Riwayat" : "Kembali ke Beranda"}
        showRecordAgain={!isEditing}
      />
    </div>
  );
}

export default function TambahPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center p-12">
            <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
          </div>
        }
      >
        <TambahForm />
      </Suspense>
    </DashboardLayout>
  );
}
