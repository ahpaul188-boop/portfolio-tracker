import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { getLocale } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import {
  chatCompletion,
  openrouterConfigured,
  OpenRouterError,
} from "@/lib/openrouter";
import { enrichHoldings, summarize } from "@/lib/portfolio";
import { tradesToRows } from "@/lib/holdings-sync";
import { getQuotes, yahooSymbol } from "@/lib/quotes";
import { getUserPreferences } from "@/lib/user-preferences";
import type { Market } from "@/lib/types";

function languageForLocale(locale: Locale): string {
  if (locale === "zh-Hant") return "Traditional Chinese";
  if (locale === "zh-Hans") return "Simplified Chinese";
  return "English";
}

export async function POST() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  if (!openrouterConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENROUTER_API_KEY in .env." },
      { status: 503 }
    );
  }

  const locale = await getLocale();
  const prefs = await getUserPreferences(userId);

  const [holdings, watchlist] = await Promise.all([
    prisma.holding.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: {
        transactions: { orderBy: [{ tradeDate: "asc" }, { createdAt: "asc" }] },
      },
      orderBy: [{ market: "asc" }, { name: "asc" }],
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const stockItems = holdings
    .filter((h) => h.assetType === "Stock")
    .map((h) => ({ symbol: h.symbol, market: h.market as Market }));

  const quotesById: Record<string, { price: number | null }> = {};
  try {
    const { quotes } = await getQuotes(stockItems);
    for (const h of holdings) {
      if (h.assetType !== "Stock") continue;
      const sym = yahooSymbol(h.symbol, h.market as Market);
      quotesById[h.id] = { price: quotes[sym]?.price ?? null };
    }
  } catch {
    // continue without live quotes
  }

  const tradesByHolding: Record<string, ReturnType<typeof tradesToRows>> = {};
  for (const h of holdings) {
    tradesByHolding[h.id] = tradesToRows(h.transactions);
  }

  const enriched = enrichHoldings(
    holdings.map((h) => ({
      ...h,
      maturityDate: h.maturityDate,
      purchasedAt: h.purchasedAt,
      createdAt: h.createdAt,
    })),
    quotesById,
    tradesByHolding
  );
  const summary = summarize(enriched, null);

  const holdingLines = enriched.map((h) => {
    const pnl =
      h.unrealizedPnl != null
        ? `${h.unrealizedPnl.toFixed(2)} ${h.currency}`
        : "n/a";
    const value =
      h.marketValue != null
        ? `${h.marketValue.toFixed(2)} ${h.currency}`
        : "n/a";
    return `- ${h.name} (${h.symbol}, ${h.market}, ${h.assetType}): qty ${h.quantity}, value ${value}, P&L ${pnl}`;
  });

  const summaryLines = Object.entries(summary.byCurrency).map(
    ([ccy, row]) =>
      `- ${ccy}: value ${row.marketValue.toFixed(2)}, P&L ${row.unrealizedPnl.toFixed(2)}, dividends ${row.interestEarned.toFixed(2)}`
  );

  const watchLines = watchlist.map(
    (w) => `- ${w.name} (${w.symbol}, ${w.market})`
  );

  const portfolioBlock = [
    "Holdings:",
    holdingLines.length ? holdingLines.join("\n") : "- (empty)",
    "",
    "Summary by currency:",
    summaryLines.length ? summaryLines.join("\n") : "- (no valuations)",
    "",
    "Watchlist:",
    watchLines.length ? watchLines.join("\n") : "- (empty)",
    "",
    `HK holdings: ${summary.byMarket.HK.count}, US holdings: ${summary.byMarket.US.count}`,
  ].join("\n");

  const lang = languageForLocale(locale);

  try {
    const suggestion = await chatCompletion(
      [
        {
          role: "system",
          content: `You are a concise portfolio assistant for HK and US stocks/bonds.
Give 3-5 short, actionable suggestions based on the user's data.
Cover diversification, concentration risk, notable positions, and watchlist ideas when relevant.
Do NOT provide specific buy/sell orders or price targets.
End with one line: this is educational only, not financial advice.
Respond in ${lang}. Use bullet points.`,
        },
        {
          role: "user",
          content: `Analyze this portfolio and suggest improvements:\n\n${portfolioBlock}`,
        },
      ],
      { model: prefs.openrouterModel }
    );

    return NextResponse.json({
      suggestion,
      generatedAt: new Date().toISOString(),
      locale,
    });
  } catch (e) {
    if (e instanceof OpenRouterError) {
      if (e.status === 402) {
        return NextResponse.json(
          { error: "INSUFFICIENT_BALANCE", detail: e.message },
          { status: 402 }
        );
      }
      if (
        e.status === 429 ||
        /rate-?limit/i.test(e.message) ||
        /provider returned error/i.test(e.message)
      ) {
        return NextResponse.json(
          { error: "RATE_LIMITED", detail: e.message },
          { status: 429 }
        );
      }
      if (e.status === 403 && /limit/i.test(e.message)) {
        return NextResponse.json(
          { error: "KEY_LIMIT_EXCEEDED", detail: e.message },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "AI suggestion failed",
      },
      { status: 502 }
    );
  }
}
