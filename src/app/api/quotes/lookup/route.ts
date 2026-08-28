import { NextResponse } from "next/server";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { getQuotes, yahooSymbol } from "@/lib/quotes";
import { normalizeSymbol, type Market } from "@/lib/types";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const rawSymbol = (searchParams.get("symbol") ?? "").trim();
  const marketParam = (searchParams.get("market") ?? "US").toUpperCase();
  const market: Market = marketParam === "HK" ? "HK" : "US";

  if (!rawSymbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const symbol = normalizeSymbol(rawSymbol, market);
  const { quotes, fetchedAt } = await getQuotes([{ symbol, market }]);
  const key = yahooSymbol(symbol, market);
  const q = quotes[key];

  return NextResponse.json({
    fetchedAt,
    quote: {
      symbol: key,
      market,
      price: q?.price ?? null,
      currency: q?.currency ?? (market === "HK" ? "HKD" : "USD"),
      name: q?.name ?? null,
      dividendYieldPct: q?.dividendYieldPct ?? null,
      yieldSource: q?.yieldSource,
      error: q?.error,
    },
    source: "Yahoo Finance (delayed)",
  });
}
