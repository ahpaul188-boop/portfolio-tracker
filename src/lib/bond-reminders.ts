export type BondReminder = {
  holdingId: string;
  name: string;
  symbol: string;
  market: string;
  kind: "maturity" | "coupon";
  date: string;
  daysUntil: number;
  couponRate?: number | null;
  currency: string;
  severity: "warning" | "info";
};

export type BondHoldingInput = {
  id: string;
  assetType: string;
  name: string;
  symbol: string;
  market: string;
  currency: string;
  quantity: number;
  couponRate: number | null;
  maturityDate: Date | string | null;
  purchasedAt: Date | string | null;
};

const MS_PER_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function nextSemiAnnualCoupon(from: Date, asOf: Date): Date {
  let next = new Date(from);
  while (next.getTime() <= asOf.getTime()) {
    next = addMonths(next, 6);
  }
  return next;
}

export function getBondReminders(
  holdings: BondHoldingInput[],
  asOf: Date = new Date(),
  horizonDays = 90
): BondReminder[] {
  const reminders: BondReminder[] = [];
  const today = startOfDay(asOf);

  for (const h of holdings) {
    if (h.assetType !== "Bond" || h.quantity <= 0) continue;

    const maturity = toDate(h.maturityDate);
    if (maturity) {
      const daysUntil = Math.ceil(
        (startOfDay(maturity).getTime() - today.getTime()) / MS_PER_DAY
      );
      if (daysUntil >= 0 && daysUntil <= horizonDays) {
        reminders.push({
          holdingId: h.id,
          name: h.name,
          symbol: h.symbol,
          market: h.market,
          kind: "maturity",
          date: maturity.toISOString(),
          daysUntil,
          currency: h.currency,
          severity: daysUntil <= 30 ? "warning" : "info",
        });
      }
    }

    const purchased = toDate(h.purchasedAt);
    if (h.couponRate != null && h.couponRate > 0 && purchased) {
      const next = nextSemiAnnualCoupon(purchased, asOf);
      const daysUntil = Math.ceil(
        (startOfDay(next).getTime() - today.getTime()) / MS_PER_DAY
      );
      if (daysUntil >= 0 && daysUntil <= horizonDays) {
        reminders.push({
          holdingId: h.id,
          name: h.name,
          symbol: h.symbol,
          market: h.market,
          kind: "coupon",
          date: next.toISOString(),
          daysUntil,
          couponRate: h.couponRate,
          currency: h.currency,
          severity: daysUntil <= 14 ? "warning" : "info",
        });
      }
    }
  }

  return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
}
