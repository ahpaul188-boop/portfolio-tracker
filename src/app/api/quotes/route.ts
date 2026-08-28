import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { getQuotes, yahooSymbol } from "@/lib/quotes";
import type { Market } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const holdings = await prisma.holding.findMany({
    where: { userId, assetType: "Stock" },
  });

  const { quotes, fetchedAt } = await getQuotes(
    holdings.map((h) => ({
      symbol: h.symbol,
      market: h.market as Market,
    }))
  );

  const byHolding: Record<
    string,
    {
      price: number | null;
      dividendYieldPct: number | null;
      yieldSource?: string;
      dividends: { date: string; amount: number }[];
      quoteSymbol: string;
      error?: string;
    }
  > = {};

  for (const h of holdings) {
    const sym = yahooSymbol(h.symbol, h.market as Market);
    const q = quotes[sym];
    byHolding[h.id] = {
      price: q?.price ?? null,
      dividendYieldPct: q?.dividendYieldPct ?? null,
      yieldSource: q?.yieldSource,
      dividends: q?.dividends ?? [],
      quoteSymbol: sym,
      error: q?.error,
    };
  }

  return NextResponse.json({
    fetchedAt,
    quotes: byHolding,
    source: "Yahoo Finance dividends + quotes (delayed)",
  });
}
