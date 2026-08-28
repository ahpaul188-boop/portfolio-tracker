import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import {
  computePortfolioPerformance,
  type PerformancePoint,
} from "@/lib/portfolio-performance";
import { isHistoryRange } from "@/lib/quotes";
import type { Market } from "@/lib/types";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "6mo";
  if (!isHistoryRange(rangeParam)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const holdings = await prisma.holding.findMany({
    where: { userId, quantity: { gt: 0 } },
    select: {
      assetType: true,
      market: true,
      symbol: true,
      quantity: true,
      manualPrice: true,
      currency: true,
    },
  });

  if (!holdings.length) {
    return NextResponse.json({ range: rangeParam, series: {} });
  }

  const series = await computePortfolioPerformance(
    holdings.map((h) => ({
      ...h,
      market: h.market as Market,
    })),
    rangeParam
  );

  const enriched: Record<
    string,
    { points: PerformancePoint[]; changePct: number | null }
  > = {};

  for (const [currency, points] of Object.entries(series)) {
    const first = points[0]?.value;
    const last = points[points.length - 1]?.value;
    const changePct =
      first != null && last != null && first !== 0
        ? ((last - first) / first) * 100
        : null;
    enriched[currency] = { points, changePct };
  }

  return NextResponse.json({
    range: rangeParam,
    series: enriched,
    note: "Uses current share counts × historical prices (approximate).",
  });
}
