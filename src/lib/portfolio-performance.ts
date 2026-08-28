import {
  fetchYahooHistory,
  yahooSymbol,
  type HistoryPoint,
  type HistoryRange,
} from "@/lib/quotes";
import type { Market } from "@/lib/types";

export type PerformancePoint = { t: number; value: number };

export type HoldingForPerformance = {
  assetType: string;
  market: Market;
  symbol: string;
  quantity: number;
  manualPrice: number | null;
  currency: string;
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

export async function computePortfolioPerformance(
  holdings: HoldingForPerformance[],
  range: HistoryRange
): Promise<Record<string, PerformancePoint[]>> {
  const active = holdings.filter((h) => h.quantity > 0);
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
      addValue(holding.currency, ts, px * holding.quantity);
    }

    for (const bond of bonds) {
      const unit = bond.manualPrice ?? 0;
      addValue(bond.currency, ts, unit * bond.quantity);
    }
  }

  const result: Record<string, PerformancePoint[]> = {};
  for (const [currency, values] of byCurrency) {
    result[currency] = [...values.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, value]) => ({ t, value }));
  }

  return result;
}
