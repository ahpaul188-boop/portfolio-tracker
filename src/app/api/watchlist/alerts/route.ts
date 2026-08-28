import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { getQuotes, yahooSymbol } from "@/lib/quotes";
import type { Market } from "@/lib/types";

function isTriggered(
  price: number | null,
  alertPrice: number,
  direction: string
): boolean {
  if (price == null) return false;
  if (direction === "above") return price >= alertPrice;
  if (direction === "below") return price <= alertPrice;
  return false;
}

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const items = await prisma.watchlistItem.findMany({
    where: {
      userId,
      alertPrice: { not: null },
      alertDirection: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!items.length) {
    return NextResponse.json({ triggered: [], fetchedAt: null });
  }

  const stockItems = items.map((w) => ({
    symbol: w.symbol,
    market: w.market as Market,
  }));

  let fetchedAt: string | null = null;
  const quotes: Record<string, number | null> = {};

  try {
    const result = await getQuotes(stockItems);
    fetchedAt = result.fetchedAt;
    for (const w of items) {
      const key = yahooSymbol(w.symbol, w.market as Market);
      quotes[w.id] = result.quotes[key]?.price ?? null;
    }
  } catch {
    return NextResponse.json({ triggered: [], fetchedAt: null });
  }

  const triggered = items
    .filter((w) =>
      isTriggered(
        quotes[w.id] ?? null,
        w.alertPrice!,
        w.alertDirection!
      )
    )
    .map((w) => ({
      id: w.id,
      symbol: w.symbol,
      name: w.name,
      market: w.market,
      currency: w.currency,
      alertPrice: w.alertPrice,
      alertDirection: w.alertDirection,
      currentPrice: quotes[w.id] ?? null,
    }));

  return NextResponse.json({ triggered, fetchedAt });
}
