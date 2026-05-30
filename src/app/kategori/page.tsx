"use client";

import React, { useState } from "react";
import { useApp, Category } from "@/context/AppContext";
import DashboardLayout from "@/components/DashboardLayout";

// List of high-quality material symbols suitable for finance/household
const ICON_POOL = [
  "shopping_cart",
  "restaurant",
  "directions_car",
  "electric_bolt",
  "medical_services",
  "school",
  "child_care",
  "local_gas_station",
  "receipt_long",
  "payments",
  "savings",
  "family_restroom",
  "house",
  "pets",
  "wifi",
];

const COLOR_POOL: { type: Category["colorType"]; label: string; bgClass: string; textClass: string }[] = [
  { type: "secondary", label: "Hijau Utama", bgClass: "bg-secondary-container text-on-secondary-container", textClass: "text-secondary" },
  { type: "tertiary", label: "Merah Gelap", bgClass: "bg-tertiary-container text-on-tertiary-container", textClass: "text-tertiary-container" },
  { type: "primary", label: "Charcoal", bgClass: "bg-primary-container text-on-primary-container", textClass: "text-primary-container" },
  { type: "error", label: "Merah Terang", bgClass: "bg-error-container text-on-error-container", textClass: "text-error" },
  { type: "secondary-fixed", label: "Hijau Pastel", bgClass: "bg-secondary-fixed-dim text-on-secondary-fixed-variant", textClass: "text-on-secondary-fixed-variant" },
  { type: "primary-fixed", label: "Krim", bgClass: "bg-primary-fixed-dim text-on-primary-fixed-variant", textClass: "text-on-primary-fixed-variant" },
];

export default function KategoriPage() {
  const { categories, addCategory, updateCategory } = useApp();

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("shopping_cart");
  const [selectedColorType, setSelectedColorType] = useState<Category["colorType"]>("secondary");

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setSelectedIcon("shopping_cart");
    setSelectedColorType("secondary");
  };

  const openAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description);
    setSelectedIcon(cat.icon);
    setSelectedColorType(cat.colorType);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Check duplicate name (ignoring the category currently being edited)
    const exists = categories.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) {
      alert("Nama kategori ini sudah terdaftar.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || "Kategori kustom",
      icon: selectedIcon,
      colorType: selectedColorType,
    };

    if (editingId) {
      updateCategory(editingId, payload);
    } else {
      addCategory(payload);
    }

    closeDialog();
  };

  return (
    <DashboardLayout>
      <div className="px-6 md:px-12 py-8 flex-1 max-w-7xl mx-auto w-full space-y-10">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-surface-container">
          <div>
            <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">
              Daftar Kategori
            </h3>
            <p className="font-body text-sm md:text-base text-on-surface-variant max-w-2xl">
              Kelola pos pengeluaran dan pemasukan untuk memantau keuangan rumah tangga dengan lebih mudah.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-on-primary rounded-full px-8 py-4 hover:bg-primary-container transition-colors shadow-soft whitespace-nowrap min-h-[56px] font-body text-sm font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Tambah Kategori</span>
          </button>
        </div>

        {/* Bento Grid of Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {categories.map((cat) => {
            // Find colors matching custom layout configs
            const poolColor = COLOR_POOL.find((cp) => cp.type === cat.colorType);
            const cardBgClass = poolColor ? poolColor.bgClass : "bg-surface-container text-on-surface-variant";

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => openEdit(cat)}
                aria-label={`Edit kategori ${cat.name}`}
                className="group relative text-left bg-surface-container-lowest rounded-[24px] p-6 shadow-soft border border-transparent hover:border-outline-variant transition-all duration-300 flex flex-col justify-between min-h-[160px] cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${cardBgClass}`}>
                    <span
                      className="material-symbols-outlined text-[28px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {cat.icon}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Subtle info label / tag */}
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-body">
                      {cat.name === "Pendapatan" ? "Pemasukan" : "Pengeluaran"}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                      edit
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-headline text-lg font-bold text-on-surface mb-1 truncate">
                    {cat.name}
                  </h4>
                  <p className="font-body text-xs text-on-surface-variant font-medium line-clamp-1">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Modal Dialog Form */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-on-background/25 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-[32px] p-8 w-full max-w-[500px] shadow-[0_40px_80px_-20px_rgba(93,92,86,0.15)] flex flex-col relative max-h-[90vh] overflow-y-auto scrollbar-hide">
            <button
              onClick={closeDialog}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline text-xl font-bold text-primary mb-6">
              {editingId ? "Edit Kategori" : "Tambah Kategori Baru"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  placeholder="misal: Jajan Kopi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors"
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Keterangan Kategori
                </label>
                <input
                  type="text"
                  placeholder="misal: Pengeluaran kopi harian"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border-2 border-surface-container-highest bg-surface-container-low p-4 font-body text-sm text-on-surface focus:outline-none focus:border-outline focus:ring-0 transition-colors"
                />
              </div>

              {/* Icon Selector */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Pilih Ikon
                </label>
                <div className="grid grid-cols-5 gap-3 p-3 bg-surface-container-low rounded-2xl border border-surface-container-highest">
                  {ICON_POOL.map((iconName) => {
                    const isSelected = selectedIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setSelectedIcon(iconName)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-on-primary shadow-sm scale-95"
                            : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          {iconName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="flex flex-col gap-2">
                <label className="font-body text-xs font-bold text-on-surface-variant pl-2">
                  Skema Warna Kategori
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_POOL.map((cp) => {
                    const isSelected = selectedColorType === cp.type;
                    return (
                      <button
                        key={cp.type}
                        type="button"
                        onClick={() => setSelectedColorType(cp.type)}
                        className={`p-3 rounded-xl border font-body text-[10px] font-bold text-center transition-all truncate cursor-pointer ${
                          isSelected
                            ? `${cp.bgClass} border-primary shadow-sm scale-95`
                            : "bg-surface-container-low text-on-surface-variant border-surface-container-highest hover:bg-surface-container-high"
                        }`}
                      >
                        {cp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 h-14 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl font-body text-sm font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-14 bg-primary text-on-primary hover:opacity-90 rounded-xl font-body text-sm font-semibold transition-opacity cursor-pointer"
                >
                  {editingId ? "Simpan Perubahan" : "Simpan Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
