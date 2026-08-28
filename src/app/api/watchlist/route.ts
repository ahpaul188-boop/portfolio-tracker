import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { getQuotes, yahooSymbol } from "@/lib/quotes";
import { normalizeSymbol, type Market } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const stockItems = items.map((w) => ({
    symbol: w.symbol,
    market: w.market as Market,
  }));

  let fetchedAt: string | null = null;
  const quotes: Record<string, { price: number | null; currency?: string }> = {};

  if (stockItems.length > 0) {
    try {
      const result = await getQuotes(stockItems);
      fetchedAt = result.fetchedAt;
      for (const w of items) {
        const key = yahooSymbol(w.symbol, w.market as Market);
        quotes[w.id] = {
          price: result.quotes[key]?.price ?? null,
          currency: result.quotes[key]?.currency ?? w.currency,
        };
      }
    } catch {
      fetchedAt = null;
    }
  }

  return NextResponse.json({
    items: items.map((w) => ({
      ...w,
      price: quotes[w.id]?.price ?? null,
      quoteCurrency: quotes[w.id]?.currency ?? w.currency,
    })),
    fetchedAt,
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const body = (await request.json()) as {
    symbol?: string;
    market?: string;
    name?: string;
    currency?: string;
  };

  const market: Market = body.market === "HK" ? "HK" : "US";
  const symbol = normalizeSymbol(body.symbol ?? "", market);
  const name = body.name?.trim();
  const currency = (body.currency ?? (market === "HK" ? "HKD" : "USD"))
    .trim()
    .toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_market_symbol: { userId, market, symbol } },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const item = await prisma.watchlistItem.create({
    data: { userId, market, symbol, name, currency },
  });

  return NextResponse.json(item, { status: 201 });
}
