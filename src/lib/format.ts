export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function pnlClass(value: number): string {
  if (value > 0) return "text-[var(--success)]";
  if (value < 0) return "text-[var(--danger)]";
  return "text-[var(--muted)]";
}

export function pnlPillClass(value: number): string {
  if (value > 0) return "bg-[var(--success-soft)] text-[var(--success)]";
  if (value < 0) return "bg-[var(--danger-soft)] text-[var(--danger)]";
  return "bg-[var(--bg-soft)] text-[var(--muted)]";
}
