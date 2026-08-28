import type { DividendEvent } from "@/lib/quotes";

export type TradeSide = "Buy" | "Sell";

export type TradeInput = {
  side: TradeSide;
  tradeDate: string | Date;
  quantity: number;
  price: number;
  fees?: number;
  notes?: string | null;
};

export type TradeRow = TradeInput & {
  id?: string;
};

export type PositionSnapshot = {
  quantity: number;
  avgCost: number;
  totalCost: number;
  firstBuyDate: Date | null;
};

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid trade date");
  return d;
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function sortTrades<T extends { tradeDate: string | Date; side: string }>(
  trades: T[]
): T[] {
  return [...trades].sort((a, b) => {
    const da = startOfUtcDay(toDate(a.tradeDate));
    const db = startOfUtcDay(toDate(b.tradeDate));
    if (da !== db) return da - db;
    // Buys before sells on same day (conservative for short-sale prevention)
    if (a.side !== b.side) return a.side === "Buy" ? -1 : 1;
    return 0;
  });
}

/** Average-cost position from buy/sell ledger */
export function computePosition(trades: TradeRow[]): PositionSnapshot {
  let quantity = 0;
  let totalCost = 0;
  let firstBuyDate: Date | null = null;

  for (const t of sortTrades(trades)) {
    const qty = Number(t.quantity);
    const price = Number(t.price);
    const fees = Number(t.fees ?? 0);
    if (!(qty > 0) || !(price >= 0) || fees < 0) {
      throw new Error("Invalid trade quantities");
    }

    if (t.side === "Buy") {
      totalCost += qty * price + fees;
      quantity += qty;
      const d = toDate(t.tradeDate);
      if (!firstBuyDate || d < firstBuyDate) firstBuyDate = d;
    } else if (t.side === "Sell") {
      if (qty > quantity + 1e-9) {
        throw new Error(
          `Sell quantity ${qty} exceeds held quantity ${quantity}`
        );
      }
      const avg = quantity > 0 ? totalCost / quantity : 0;
      // Reduce cost basis at average cost; fees on sell increase realized loss (reduce remaining cost not applied)
      totalCost -= avg * qty;
      quantity -= qty;
      if (quantity <= 1e-9) {
        quantity = 0;
        totalCost = 0;
      }
    } else {
      throw new Error("side must be Buy or Sell");
    }
  }

  const avgCost = quantity > 0 ? totalCost / quantity : 0;
  return { quantity, avgCost, totalCost, firstBuyDate };
}

/** Shares held at the end of an inclusive UTC day (includes trades on that day). */
export function quantityHeldOnOrBefore(
  trades: TradeRow[],
  asOfInclusive: Date
): number {
  const cutoff = startOfUtcDay(asOfInclusive);
  let quantity = 0;
  for (const t of sortTrades(trades)) {
    const day = startOfUtcDay(toDate(t.tradeDate));
    if (day > cutoff) break;
    if (t.side === "Buy") quantity += t.quantity;
    else quantity -= t.quantity;
  }
  return Math.max(0, quantity);
}

/** Shares held at the open of an ex-dividend day (trades strictly before that day). */
export function quantityHeldBefore(
  trades: TradeRow[],
  asOfExclusive: Date
): number {
  const cutoff = startOfUtcDay(asOfExclusive);
  let quantity = 0;
  for (const t of sortTrades(trades)) {
    const day = startOfUtcDay(toDate(t.tradeDate));
    if (day >= cutoff) break;
    if (t.side === "Buy") quantity += t.quantity;
    else quantity -= t.quantity;
  }
  return Math.max(0, quantity);
}

/**
 * Dividend income using shares held before each ex-date.
 * Must own shares before the ex-dividend date to receive the dividend.
 */
export function computeDividendIncomeFromTrades(
  dividends: DividendEvent[],
  trades: TradeRow[],
  holdEnd: Date
): { total: number; count: number } {
  const end = startOfUtcDay(holdEnd);
  let total = 0;
  let count = 0;
  for (const d of dividends) {
    const ex = toDate(d.date);
    if (startOfUtcDay(ex) > end) continue;
    const qty = quantityHeldBefore(trades, ex);
    if (qty > 0 && d.amount > 0) {
      total += d.amount * qty;
      count += 1;
    }
  }
  return { total, count };
}

export function validateTradeInput(body: Partial<TradeInput>): string | null {
  if (!body.side || !["Buy", "Sell"].includes(body.side)) {
    return "side must be Buy or Sell";
  }
  if (!body.tradeDate) return "tradeDate is required";
  const d = new Date(body.tradeDate);
  if (Number.isNaN(d.getTime())) return "tradeDate must be a valid date";
  if (body.quantity == null || Number(body.quantity) <= 0) {
    return "quantity must be > 0";
  }
  if (body.price == null || Number(body.price) < 0) {
    return "price must be >= 0";
  }
  if (body.fees != null && Number(body.fees) < 0) {
    return "fees must be >= 0";
  }
  return null;
}
