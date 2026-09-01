import { auth } from "@/auth";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { prisma } from "@/lib/db";
import { requireUserIdForPage } from "@/lib/auth-utils";
import { getBondReminders } from "@/lib/bond-reminders";
import { getFxRates } from "@/lib/fx";
import { getUserPreferences } from "@/lib/user-preferences";
import { ensureOpeningTrade, tradesToRows } from "@/lib/holdings-sync";
import { computeAllocationBundle } from "@/lib/portfolio-allocation";
import {
  buildRealizedSummary,
  computeRealizedSales,
} from "@/lib/realized-pnl";
import { enrichHoldings, summarize } from "@/lib/portfolio";
import { getQuotes, yahooSymbol } from "@/lib/quotes";
import type { Market } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await requireUserIdForPage();
  const session = await auth();

  let holdings = await prisma.holding.findMany({
    where: { userId },
    include: { transactions: true },
    orderBy: [{ market: "asc" }, { name: "asc" }],
  });

  for (const h of holdings) {
    if (h.transactions.length === 0 && h.quantity > 0) {
      await ensureOpeningTrade(h.id);
    }
  }

  holdings = await prisma.holding.findMany({
    where: { userId },
    include: {
      transactions: { orderBy: [{ tradeDate: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: [{ market: "asc" }, { name: "asc" }],
  });

  const stockItems = holdings
    .filter((h) => h.assetType === "Stock")
    .map((h) => ({ symbol: h.symbol, market: h.market as Market }));

  let fetchedAt: string | null = null;
  const quotesById: Record<
    string,
    {
      price: number | null;
      dividendYieldPct?: number | null;
      yieldSource?: string;
      dividends?: { date: string; amount: number }[];
    }
  > = {};

  try {
    const { quotes, fetchedAt: at } = await getQuotes(stockItems);
    fetchedAt = at;
    for (const h of holdings) {
      if (h.assetType !== "Stock") continue;
      const sym = yahooSymbol(h.symbol, h.market as Market);
      quotesById[h.id] = {
        price: quotes[sym]?.price ?? null,
        dividendYieldPct: quotes[sym]?.dividendYieldPct ?? null,
        yieldSource: quotes[sym]?.yieldSource,
        dividends: quotes[sym]?.dividends ?? [],
      };
    }
  } catch {
    fetchedAt = null;
  }

  const tradesByHolding: Record<string, ReturnType<typeof tradesToRows>> = {};
  for (const h of holdings) {
    tradesByHolding[h.id] = tradesToRows(h.transactions);
  }

  const rows = holdings.map((h) => ({
    ...h,
    maturityDate: h.maturityDate,
    purchasedAt: h.purchasedAt,
    createdAt: h.createdAt,
  }));

  const enriched = enrichHoldings(rows, quotesById, tradesByHolding);
  const summary = summarize(enriched, fetchedAt);
  const prefs = await getUserPreferences(userId);
  let fxRates = null;
  try {
    fxRates = await getFxRates("USD");
  } catch {
    fxRates = null;
  }
  const bondReminders = getBondReminders(
    holdings.map((h) => ({
      id: h.id,
      assetType: h.assetType,
      name: h.name,
      symbol: h.symbol,
      market: h.market,
      currency: h.currency,
      quantity: h.quantity,
      couponRate: h.couponRate,
      maturityDate: h.maturityDate,
      purchasedAt: h.purchasedAt,
    }))
  );

  const displayCurrency = prefs.displayCurrency;
  const rates = fxRates?.rates ?? { USD: 1, HKD: 1 };

  const allocation = computeAllocationBundle(
    enriched,
    displayCurrency,
    rates
  );

  const realizedSales = computeRealizedSales(
    holdings.map((h) => ({
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      market: h.market,
      currency: h.currency,
      trades: tradesByHolding[h.id] ?? [],
    }))
  );
  const realized = buildRealizedSummary(
    realizedSales,
    displayCurrency,
    rates
  );

  return (
    <PortfolioDashboard
      holdings={enriched}
      summary={summary}
      holdingCount={holdings.length}
      userName={session?.user?.name}
      bondReminders={bondReminders}
      displayCurrency={displayCurrency}
      fxRates={fxRates}
      allocation={allocation}
      realized={realized}
    />
  );
}
