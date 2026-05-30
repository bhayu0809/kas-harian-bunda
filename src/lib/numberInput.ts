export function parseNumberInput(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

export function formatNumberInput(value: number | string): string {
  const numeric = typeof value === "number" ? value : parseNumberInput(value);
  if (!numeric) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(numeric);
}
