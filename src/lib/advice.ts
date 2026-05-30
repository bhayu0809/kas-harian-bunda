import type { BudgetStatus, DailyAllowanceStatus } from "@/lib/budget";

// Rule-based household money tips — no AI. Reads the current month's condition
// (deficit / tight / surplus) plus any breached spending limits, and returns a
// short, prioritised list of suggestions:
//   - "defensive" → cara berhemat ketika kondisi minus/ketat
//   - "offensive" → cara menambah pemasukan/menumbuhkan dana ketika surplus
//   - "neutral"   → catatan informatif

export type AdviceTone = "defensive" | "offensive" | "neutral";

export interface Advice {
  id: string;
  tone: AdviceTone;
  icon: string;
  title: string;
  message: string;
}

export interface AdviceInput {
  income: number;
  expense: number;
  topCategory?: { name: string; amount: number } | null;
  daily?: DailyAllowanceStatus | null;
  weekly?: BudgetStatus | null;
  monthly?: BudgetStatus | null;
  savedAmount?: number;
  savingsTarget?: number;
}

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(value)
    .replace("Rp", "Rp ");

const MAX_ADVICE = 4;

export function getFinancialAdvice(input: AdviceInput): Advice[] {
  const { income, expense, topCategory, daily, weekly, monthly, savedAmount = 0, savingsTarget = 0 } = input;

  // Nothing recorded yet — guide the user to start.
  if (income === 0 && expense === 0) {
    return [
      {
        id: "empty",
        tone: "neutral",
        icon: "lightbulb",
        title: "Mulai mencatat",
        message: "Catat pemasukan dan pengeluaran harian agar saran keuangan muncul sesuai kondisimu.",
      },
    ];
  }

  const saldo = income - expense;
  const ratio = income > 0 ? expense / income : expense > 0 ? Infinity : 0;
  const pct = Number.isFinite(ratio) ? Math.round(ratio * 100) : 100;
  const advices: Advice[] = [];

  // --- Situational limit breaches (selalu defensif, prioritas atas) ----------
  if (daily?.exceeded) {
    advices.push({
      id: "daily-over",
      tone: "defensive",
      icon: "notifications_active",
      title: "Jatah harian terlampaui",
      message: `Belanja hari ini ${formatRupiah(daily.spentToday)} melebihi jatah ${formatRupiah(
        daily.effectiveToday
      )}. Tahan dulu belanja sampai besok.`,
    });
  }
  if (weekly?.exceeded) {
    advices.push({
      id: "weekly-over",
      tone: "defensive",
      icon: "date_range",
      title: "Batas mingguan terlampaui",
      message: `Belanja minggu ini ${formatRupiah(weekly.spent)} dari batas ${formatRupiah(
        weekly.budget
      )}. Rem pengeluaran sampai pekan depan.`,
    });
  }
  if (monthly?.exceeded) {
    advices.push({
      id: "monthly-over",
      tone: "defensive",
      icon: "production_quantity_limits",
      title: "Batas bulanan terlampaui",
      message: `Pengeluaran bulan ini sudah melewati batas ${formatRupiah(
        monthly.budget
      )}. Fokus ke kebutuhan pokok saja.`,
    });
  } else if (monthly?.shouldAlert) {
    advices.push({
      id: "monthly-pace",
      tone: "defensive",
      icon: "speed",
      title: "Laju belanja terlalu cepat",
      message: "Dengan laju belanja saat ini, batas bulanan bisa terlampaui sebelum akhir bulan. Perlambat sekarang.",
    });
  }

  if (saldo < 0) {
    // ---- KONDISI MINUS → defensif (penghematan) -----------------------------
    advices.push({
      id: "deficit",
      tone: "defensive",
      icon: "trending_down",
      title: "Pengeluaran melebihi pemasukan",
      message: `Defisit ${formatRupiah(-saldo)} bulan ini. Tunda pembelian non-prioritas sampai ada pemasukan masuk.`,
    });
    if (topCategory && topCategory.amount > 0) {
      advices.push({
        id: "cut-top",
        tone: "defensive",
        icon: "content_cut",
        title: `Pangkas "${topCategory.name}"`,
        message: `Pos terbesar bulan ini ${formatRupiah(
          topCategory.amount
        )}. Cari penghematan di sini dulu — efeknya paling terasa.`,
      });
    }
    advices.push({
      id: "tighten",
      tone: "defensive",
      icon: "savings",
      title: "Perketat batas harian",
      message: "Setel batas harian lebih rendah dan aktifkan akumulasi jatah agar belanja lebih terkendali.",
    });
  } else if (ratio > 0.8) {
    // ---- KONDISI KETAT → defensif ringan ------------------------------------
    advices.push({
      id: "tight",
      tone: "defensive",
      icon: "warning",
      title: "Belanja mendekati pemasukan",
      message: `Sudah ${pct}% pemasukan terpakai. Sisakan ruang untuk tabungan dan kebutuhan tak terduga.`,
    });
    if (topCategory && topCategory.amount > 0) {
      advices.push({
        id: "watch-top",
        tone: "defensive",
        icon: "content_cut",
        title: `Awasi "${topCategory.name}"`,
        message: `Pos terbesar ${formatRupiah(topCategory.amount)}. Kurangi sedikit di sini untuk amankan sisa bulan.`,
      });
    }
  } else {
    // ---- KONDISI SURPLUS → ofensif (tambah income / tumbuhkan dana) ---------
    advices.push({
      id: "surplus",
      tone: "offensive",
      icon: "trending_up",
      title: `Surplus ${formatRupiah(saldo)}`,
      message: "Kondisi sehat. Sisihkan dulu surplus ke tabungan atau target sebelum terpakai belanja.",
    });
    if (savingsTarget > 0 && savedAmount < savingsTarget) {
      advices.push({
        id: "fill-target",
        tone: "offensive",
        icon: "flag",
        title: "Dekati target tabungan",
        message: `Tabungan ${formatRupiah(savedAmount)} dari target ${formatRupiah(
          savingsTarget
        )}. Alokasikan sebagian surplus untuk mengejar target.`,
      });
    }
    advices.push({
      id: "grow-income",
      tone: "offensive",
      icon: "rocket_launch",
      title: "Tambah sumber pemasukan",
      message: "Manfaatkan surplus untuk modal kecil: jualan, jasa, atau jual barang tak terpakai. Sisihkan juga dana darurat 3–6× pengeluaran bulanan.",
    });
    if (daily && !daily.exceeded && daily.rollover > 0) {
      advices.push({
        id: "frugal",
        tone: "neutral",
        icon: "verified",
        title: "Kamu hemat",
        message: `Ada akumulasi jatah ${formatRupiah(daily.rollover)} dari hari-hari sebelumnya. Pertahankan.`,
      });
    }
  }

  return advices.slice(0, MAX_ADVICE);
}
