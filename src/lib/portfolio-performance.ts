import {
  fetchYahooHistory,
  yahooSymbol,
  type HistoryPoint,
  type HistoryRange,
} from "@/lib/quotes";
import { quantityHeldOnOrBefore, type TradeRow } from "@/lib/ledger";
import type { Market } from "@/lib/types";

export type PerformancePoint = { t: number; value: number };

export type PerformanceMethod = "trades" | "approximate";

export type HoldingForPerformance = {
  assetType: string;
  market: Market;
  symbol: string;
  quantity: number;
  manualPrice: number | null;
  currency: string;
  trades?: TradeRow[];
};

function priceAt(points: HistoryPoint[], ts: number): number | null {
  if (!points.length) return null;
  if (ts <= points[0].t) return points[0].close;
  if (ts >= points[points.length - 1].t) return points[points.length - 1].close;

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (points[mid].t <= ts) lo = mid;
    else hi = mid - 1;
  }
  return points[lo].close;
}

function quantityAt(holding: HoldingForPerformance, ts: number): number {
  if (holding.trades?.length) {
    return quantityHeldOnOrBefore(holding.trades, new Date(ts));
  }
  return holding.quantity;
}

export async function computePortfolioPerformance(
  holdings: HoldingForPerformance[],
  range: HistoryRange
): Promise<{
  series: Record<string, PerformancePoint[]>;
  method: PerformanceMethod;
}> {
  const usesTrades = holdings.some((h) => (h.trades?.length ?? 0) > 0);
  const method: PerformanceMethod = usesTrades ? "trades" : "approximate";

  const active = holdings.filter((h) => {
    if (h.trades?.length) {
      return h.trades.some((t) => t.side === "Buy");
    }
    return h.quantity > 0;
  });

  const stocks = active.filter((h) => h.assetType === "Stock");
  const bonds = active.filter((h) => h.assetType === "Bond");

  const histories = await Promise.all(
    stocks.map(async (h) => {
      const sym = yahooSymbol(h.symbol, h.market);
      const hist = await fetchYahooHistory(sym, range);
      return { holding: h, points: hist.points };
    })
  );

  let timeline: number[] = [];
  for (const { points } of histories) {
    if (points.length >= 2) {
      timeline = points.map((p) => p.t);
      break;
    }
  }

  if (!timeline.length) {
    const now = Date.now();
    timeline = [now - 86_400_000, now];
  }

  const byCurrency = new Map<string, Map<number, number>>();

  function addValue(currency: string, ts: number, amount: number) {
    if (!byCurrency.has(currency)) byCurrency.set(currency, new Map());
    const bucket = byCurrency.get(currency)!;
    bucket.set(ts, (bucket.get(ts) ?? 0) + amount);
  }

  for (const ts of timeline) {
    for (const { holding, points } of histories) {
      const px = priceAt(points, ts);
      if (px == null) continue;
      const qty = quantityAt(holding, ts);
      if (qty <= 0) continue;
      addValue(holding.currency, ts, px * qty);
    }

    for (const bond of bonds) {
      const qty = quantityAt(bond, ts);
      if (qty <= 0) continue;
      const unit = bond.manualPrice ?? 0;
      addValue(bond.currency, ts, unit * qty);
    }
  }

  const series: Record<string, PerformancePoint[]> = {};
  for (const [currency, values] of byCurrency) {
    series[currency] = [...values.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, value]) => ({ t, value }));
  }

  return { series, method };
}
