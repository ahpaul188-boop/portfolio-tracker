import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import {
  computePortfolioPerformance,
  type PerformancePoint,
} from "@/lib/portfolio-performance";
import {
  getSnapshotsForRange,
  mergeSeriesWithSnapshots,
  upsertTodaySnapshots,
} from "@/lib/portfolio-snapshots";
import { isHistoryRange } from "@/lib/quotes";
import type { TradeSide } from "@/lib/ledger";
import type { Market } from "@/lib/types";

const RANGE_MS: Record<string, number> = {
  "1d": 86_400_000,
  "5d": 5 * 86_400_000,
  "1mo": 30 * 86_400_000,
  "6mo": 183 * 86_400_000,
  "1y": 365 * 86_400_000,
  "5y": 5 * 365 * 86_400_000,
};

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "6mo";
  if (!isHistoryRange(rangeParam)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: {
      assetType: true,
      market: true,
      symbol: true,
      quantity: true,
      manualPrice: true,
      currency: true,
      transactions: {
        select: {
          side: true,
          tradeDate: true,
          quantity: true,
          price: true,
          fees: true,
          notes: true,
        },
        orderBy: { tradeDate: "asc" },
      },
    },
  });

  const active = holdings.filter(
    (h) => h.quantity > 0 || h.transactions.length > 0
  );

  if (!active.length) {
    return NextResponse.json({ range: rangeParam, series: {}, method: "approximate" });
  }

  const { series, method } = await computePortfolioPerformance(
    active.map((h) => ({
      assetType: h.assetType,
      market: h.market as Market,
      symbol: h.symbol,
      quantity: h.quantity,
      manualPrice: h.manualPrice,
      currency: h.currency,
      trades: h.transactions.map((t) => ({
        ...t,
        side: t.side as TradeSide,
      })),
    })),
    rangeParam
  );

  const now = new Date();
  const from = new Date(now.getTime() - (RANGE_MS[rangeParam] ?? RANGE_MS["6mo"]));
  const snapshots = await getSnapshotsForRange(userId, from, now);

  let usedSnapshots = false;
  const merged: Record<string, PerformancePoint[]> = {};
  for (const [currency, points] of Object.entries(series)) {
    const snapRows = snapshots[currency] ?? [];
    const next = mergeSeriesWithSnapshots(points, snapRows);
    if (next !== points) usedSnapshots = true;
    merged[currency] = next;
  }

  await upsertTodaySnapshots(userId, merged);

  const enriched: Record<
    string,
    { points: PerformancePoint[]; changePct: number | null }
  > = {};

  for (const [currency, points] of Object.entries(merged)) {
    const first = points[0]?.value;
    const last = points[points.length - 1]?.value;
    const changePct =
      first != null && last != null && first !== 0
        ? ((last - first) / first) * 100
        : null;
    enriched[currency] = { points, changePct };
  }

  const responseMethod = usedSnapshots ? "snapshots" : method;

  return NextResponse.json({
    range: rangeParam,
    series: enriched,
    method: responseMethod,
  });
}
