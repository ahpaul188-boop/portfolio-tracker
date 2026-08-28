import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { getPortfolioNews } from "@/lib/news";
import { getLocale } from "@/i18n/server";
import type { Market } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const locale = await getLocale();

  const holdings = await prisma.holding.findMany({
    where: { userId, quantity: { gt: 0 } },
    select: { symbol: true, name: true, market: true, assetType: true },
  });

  const queries = holdings
    .filter((h) => h.assetType === "Stock")
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      market: h.market as Market,
    }));

  try {
    const { items, fetchedAt } = await getPortfolioNews(queries, locale);
    return NextResponse.json({
      items,
      fetchedAt,
      locale,
      source: "Yahoo Finance news search",
    });
  } catch (e) {
    return NextResponse.json(
      {
        items: [],
        fetchedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "News fetch failed",
      },
      { status: 502 }
    );
  }
}
