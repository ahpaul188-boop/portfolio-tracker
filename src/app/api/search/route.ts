import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { searchSeed } from "@/lib/instruments";
import { searchYahoo, type SearchHit } from "@/lib/quotes";
import type { Market } from "@/lib/types";

function dedupe(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.assetType}:${h.market}:${h.symbol.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const marketFilter = searchParams.get("market") as Market | null;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const seed = searchSeed(q);
  const yahoo = await searchYahoo(q);

  const holdings = await prisma.holding.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: q } },
        { symbol: { contains: q } },
        { isin: { contains: q } },
      ],
    },
    take: 10,
  });

  const fromHoldings: SearchHit[] = holdings.map((h) => ({
    symbol: h.symbol,
    name: h.name,
    market: h.market as Market,
    assetType: h.assetType as "Stock" | "Bond",
    isin: h.isin ?? undefined,
    currency: h.currency,
  }));

  let results = dedupe([...seed, ...fromHoldings, ...yahoo]);
  if (marketFilter === "HK" || marketFilter === "US") {
    results = results.filter((r) => r.market === marketFilter);
  }

  return NextResponse.json({ results: results.slice(0, 20) });
}
