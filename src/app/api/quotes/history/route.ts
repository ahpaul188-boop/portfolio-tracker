import { NextResponse } from "next/server";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import {
  fetchYahooHistory,
  isHistoryRange,
  yahooSymbol,
  type HistoryRange,
} from "@/lib/quotes";
import { normalizeSymbol, type Market } from "@/lib/types";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const rawSymbol = (searchParams.get("symbol") ?? "").trim();
  const marketParam = (searchParams.get("market") ?? "US").toUpperCase();
  const market: Market = marketParam === "HK" ? "HK" : "US";
  const rangeParam = searchParams.get("range") ?? "6mo";
  const range: HistoryRange = isHistoryRange(rangeParam) ? rangeParam : "6mo";

  if (!rawSymbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const symbol = yahooSymbol(normalizeSymbol(rawSymbol, market), market);
  const history = await fetchYahooHistory(symbol, range);

  return NextResponse.json({
    ...history,
    market,
    source: "Yahoo Finance (delayed)",
  });
}
