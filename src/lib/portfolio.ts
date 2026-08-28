import type { Market } from "@/lib/types";
import type { DividendEvent } from "@/lib/quotes";
import {
  computeDividendIncomeFromTrades,
  type TradeRow,
} from "@/lib/ledger";

export type HoldingRow = {
  id: string;
  assetType: string;
  market: string;
  symbol: string;
  isin: string | null;
  name: string;
  quantity: number;
  costBasis: number;
  manualPrice: number | null;
  currency: string;
  couponRate: number | null;
  maturityDate: string | Date | null;
  purchasedAt: string | Date | null;
  createdAt?: string | Date | null;
  notes: string | null;
};

export type EnrichedHolding = HoldingRow & {
  unitPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  priceSource: "quote" | "manual" | "none";
  holdStart: string | null;
  holdDays: number | null;
  holdYears: number | null;
  holdLabel: string | null;
  interestEarned: number | null;
  dividendCount: number;
  interestSource: "dividends" | "coupon" | null;
  effectiveYieldPct: number | null;
  yieldSource: "manual" | "market" | null;
  marketYieldPct: number | null;
  marketYieldLabel: string | null;
  tradeCount: number;
};

export type PortfolioSummary = {
  byCurrency: Record<
    string,
    {
      marketValue: number;
      costBasis: number;
      unrealizedPnl: number;
      interestEarned: number;
    }
  >;
  byMarket: Record<Market, { count: number; marketValueByCurrency: Record<string, number> }>;
  fetchedAt: string | null;
};

const MS_PER_DAY = 86_400_000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatHoldPeriod(days: number): string {
  if (days < 1) return "<1d";
  if (days < 60) return `${days}d`;
  const months = Math.floor(days / 30.4375);
  if (days < 365) return `${months}mo`;
  const years = days / 365.25;
  if (years < 2) return `${years.toFixed(1)}y`;
  return `${years.toFixed(1)}y`;
}

/**
 * Stocks: dividends using shares held before each ex-date (from trades).
 * Bonds: simple coupon estimate = cost × coupon% × years.
 */
export function enrichHoldings(
  holdings: HoldingRow[],
  quotes: Record<
    string,
    {
      price: number | null;
      dividendYieldPct?: number | null;
      yieldSource?: string;
      dividends?: DividendEvent[];
    }
  >,
  tradesByHolding: Record<string, TradeRow[]> = {},
  asOf: Date = new Date()
): EnrichedHolding[] {
  return holdings.map((h) => {
    const quote = quotes[h.id];
    const trades = tradesByHolding[h.id] ?? [];
    const quotePrice = quote?.price ?? null;
    let unitPrice: number | null = null;
    let priceSource: EnrichedHolding["priceSource"] = "none";

    if (h.assetType === "Bond") {
      unitPrice = h.manualPrice;
      priceSource = h.manualPrice != null ? "manual" : "none";
    } else if (quotePrice != null) {
      unitPrice = quotePrice;
      priceSource = "quote";
    } else if (h.manualPrice != null) {
      unitPrice = h.manualPrice;
      priceSource = "manual";
    }

    const totalCost = h.costBasis * h.quantity;
    const marketValue = unitPrice != null ? unitPrice * h.quantity : null;
    const unrealizedPnl = marketValue != null ? marketValue - totalCost : null;
    const unrealizedPnlPct =
      unrealizedPnl != null && totalCost > 0
        ? (unrealizedPnl / totalCost) * 100
        : null;

    const marketYieldPct =
      quote?.dividendYieldPct != null && Number.isFinite(quote.dividendYieldPct)
        ? quote.dividendYieldPct
        : null;
    const marketYieldLabel = quote?.yieldSource ?? null;

    let effectiveYieldPct: number | null = null;
    let yieldSource: EnrichedHolding["yieldSource"] = null;
    if (h.couponRate != null && h.couponRate > 0) {
      effectiveYieldPct = h.couponRate;
      yieldSource = "manual";
    } else if (marketYieldPct != null && marketYieldPct > 0) {
      effectiveYieldPct = marketYieldPct;
      yieldSource = "market";
    }

    const holdStartDate =
      toDate(h.purchasedAt) ?? toDate(h.createdAt) ?? null;
    let holdDays: number | null = null;
    let holdYears: number | null = null;
    let holdLabel: string | null = null;
    let interestEarned: number | null = null;
    let dividendCount = 0;
    let interestSource: EnrichedHolding["interestSource"] = null;

    if (holdStartDate) {
      let end = asOf;
      const maturity = toDate(h.maturityDate);
      if (maturity && maturity.getTime() < end.getTime()) {
        end = maturity;
      }
      const ms = Math.max(0, end.getTime() - holdStartDate.getTime());
      holdDays = Math.floor(ms / MS_PER_DAY);
      holdYears = ms / (MS_PER_DAY * 365.25);
      holdLabel = formatHoldPeriod(holdDays);

      if (h.assetType === "Stock") {
        const ledgerTrades =
          trades.length > 0
            ? trades
            : h.quantity > 0
              ? [
                  {
                    side: "Buy" as const,
                    tradeDate: holdStartDate,
                    quantity: h.quantity,
                    price: h.costBasis,
                    fees: 0,
                  },
                ]
              : [];
        const { total, count } = computeDividendIncomeFromTrades(
          quote?.dividends ?? [],
          ledgerTrades,
          end
        );
        dividendCount = count;
        interestEarned = total;
        interestSource = "dividends";
      } else if (
        h.couponRate != null &&
        h.couponRate > 0 &&
        totalCost > 0
      ) {
        interestEarned = totalCost * (h.couponRate / 100) * holdYears;
        interestSource = "coupon";
      }
    }

    return {
      ...h,
      unitPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct,
      priceSource,
      holdStart: holdStartDate ? holdStartDate.toISOString() : null,
      holdDays,
      holdYears,
      holdLabel,
      interestEarned,
      dividendCount,
      interestSource,
      effectiveYieldPct,
      yieldSource,
      marketYieldPct,
      marketYieldLabel,
      tradeCount: trades.length,
    };
  });
}

export function summarize(
  enriched: EnrichedHolding[],
  fetchedAt: string | null
): PortfolioSummary {
  const byCurrency: PortfolioSummary["byCurrency"] = {};
  const byMarket: PortfolioSummary["byMarket"] = {
    HK: { count: 0, marketValueByCurrency: {} },
    US: { count: 0, marketValueByCurrency: {} },
  };

  for (const h of enriched) {
    const ccy = h.currency;
    if (!byCurrency[ccy]) {
      byCurrency[ccy] = {
        marketValue: 0,
        costBasis: 0,
        unrealizedPnl: 0,
        interestEarned: 0,
      };
    }
    byCurrency[ccy].costBasis += h.costBasis * h.quantity;
    if (h.marketValue != null) byCurrency[ccy].marketValue += h.marketValue;
    if (h.unrealizedPnl != null) byCurrency[ccy].unrealizedPnl += h.unrealizedPnl;
    if (h.interestEarned != null) {
      byCurrency[ccy].interestEarned += h.interestEarned;
    }

    const m = h.market as Market;
    if (m === "HK" || m === "US") {
      byMarket[m].count += 1;
      if (h.marketValue != null) {
        byMarket[m].marketValueByCurrency[ccy] =
          (byMarket[m].marketValueByCurrency[ccy] ?? 0) + h.marketValue;
      }
    }
  }

  return { byCurrency, byMarket, fetchedAt };
}
