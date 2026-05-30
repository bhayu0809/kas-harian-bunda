"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp, TransactionType, TransactionSource } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";
import SuccessModal from "@/components/SuccessModal";

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
  const [amountInput, setAmountInput] = useState<string>("0");
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
      setAmountInput(String(sourceTx.amount));
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
      setAmountInput(String(selectedTemplate.amount));
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
    setAmountInput(String(nextAmount));
  };

  const handleAmountInputChange = (val: string) => {
    // Strip non-digits
    const cleanVal = val.replace(/\D/g, "");
    const parsed = Number(cleanVal) || 0;
    setAmount(parsed);
    setAmountInput(cleanVal === "" ? "" : String(parsed));
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
    setAmountInput("0");
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

  return (
    <div className="px-6 md:px-12 pb-12 pt-4 flex-1">
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto h-full">
        
        {/* Left Column: Amount & Details (Spans 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {templates.length > 0 && !isEditing && (
            <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-headline text-sm font-bold text-primary">Template Cepat</h3>
                <span className="font-body text-[11px] font-semibold text-on-surface-variant">{templates.length} tersimpan</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
            </div>
          )}
          
          {/* Amount Input Card */}
          <div className="bg-surface-container-lowest rounded-[32px] p-8 shadow-lux flex flex-col items-center text-center relative overflow-hidden">
            {/* Glow effects based on type */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 blur-3xl pointer-events-none rounded-full transition-colors duration-300 ${
                isExpense ? "bg-error-container/20" : "bg-secondary-container/30"
              }`}
            />
            
            {/* Type Toggle */}
            <div className="bg-surface-container p-1 rounded-full flex w-full max-w-xs mb-8 relative z-10 border border-surface-container-high">
              <button
                type="button"
                onClick={() => switchType("expense")}
                className={`flex-1 py-3 px-4 rounded-full font-body text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  isExpense
                    ? "bg-error-container text-on-error-container shadow-sm scale-95"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  arrow_downward
                </span>
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => switchType("income")}
                className={`flex-1 py-3 px-4 rounded-full font-body text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  !isExpense
                    ? "bg-secondary-container text-on-secondary-container shadow-sm scale-95"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                Pemasukan
              </button>
            </div>

            <p className="font-body text-xs font-bold text-on-surface-variant mb-2">
              Nominal Transaksi
            </p>
            
            {/* Numeric input field */}
            <div className="flex items-center justify-center gap-2 w-full mb-8 border-b-2 border-surface-container-highest pb-4 focus-within:border-primary transition-colors">
              <span className="font-headline text-2xl font-bold text-on-surface-variant">Rp</span>
              <input
                type="text"
                value={amountInput}
                onChange={(e) => handleAmountInputChange(e.target.value)}
                className="bg-transparent border-none p-0 text-center font-headline text-3xl md:text-4xl font-bold text-on-surface w-full max-w-[220px] focus:ring-0 focus:outline-none placeholder-outline-variant"
                placeholder="0"
              />
            </div>

            {/* Shortcuts */}
            <div className="flex flex-wrap justify-center gap-3 w-full relative z-10">
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
                  className="py-2 px-4 rounded-full border border-outline-variant text-on-surface-variant font-body text-xs font-medium hover:bg-surface-container hover:border-outline transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label, Date & Note Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-lux flex flex-col gap-6">
            
            {/* Transaction Label Field */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                Nama Transaksi (Label)
              </label>
              <input
                type="text"
                placeholder="misal: Belanja Sayur Bulanan"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors"
                required
              />
            </div>

            {/* Date Picker Field */}
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                Tanggal Transaksi
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors"
                  required
                />
              </div>
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
                className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors placeholder-outline-variant resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Categories & Payment (Spans 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Categories Grid Card */}
          <div className="bg-surface-container-lowest rounded-[32px] p-8 shadow-lux flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-surface-container">
                <h3 className="font-headline text-lg font-bold text-on-surface">
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

              {/* Grid representation */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${catColorClass}`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isActive
                            ? "bg-white/80 shadow-xs"
                            : "bg-surface-container-highest"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[24px]"
                          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          {cat.icon}
                        </span>
                      </div>
                      <span className="font-body text-xs font-semibold text-center truncate w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-surface-container-low" />

            {/* Payment Method & Action Row */}
            <div className="flex flex-col sm:flex-row gap-6 items-stretch">
              
              {/* Payment Method */}
              <div className="bg-surface-container-low/50 rounded-2xl p-4 flex-1 flex flex-col justify-center border border-surface-container">
                <p className="font-body text-xs font-bold text-on-surface-variant mb-3 px-1">
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

              {/* Save Button */}
              <button
                type="submit"
                className="w-full sm:w-[180px] rounded-3xl bg-primary text-on-primary font-headline text-lg font-bold hover:opacity-90 transition-opacity flex flex-col items-center justify-center py-4 sm:py-0 gap-1.5 shadow-lg shadow-primary/10 cursor-pointer"
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {isEditing ? "Perbarui" : "Simpan"}
              </button>
            </div>

            {!isEditing && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 font-body text-xs font-semibold text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Simpan sebagai template
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 font-body text-xs font-semibold text-on-surface-variant cursor-pointer">
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
        </div>

      </form>

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
