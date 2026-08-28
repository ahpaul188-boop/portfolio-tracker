"use client";

import { useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { SearchBox } from "@/components/SearchBox";
import { StockChart } from "@/components/StockChart";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, formatPct } from "@/lib/format";
import type { SearchHit } from "@/lib/quotes";
import type { Market } from "@/lib/types";

type QuoteView = {
  symbol: string;
  market: Market;
  price: number | null;
  currency: string;
  name: string | null;
  dividendYieldPct: number | null;
  yieldSource?: string;
  error?: string;
};

export function QuoteLookup() {
  const { t } = useI18n();
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SearchHit | null>(null);

  async function loadQuote(hit: SearchHit) {
    setSelected(hit);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quotes/lookup?symbol=${encodeURIComponent(hit.symbol)}&market=${hit.market}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("quoteLookup.quoteFailed"));
        setQuote(null);
        return;
      }
      setQuote({
        ...data.quote,
        name: data.quote.name || hit.name,
        market: hit.market,
      });
    } catch {
      setError(t("common.networkError"));
      setQuote(null);
    } finally {
      setBusy(false);
    }
  }

  async function addToWatchlist() {
    if (!selected && !quote) return;
    const hit = selected;
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: hit?.symbol ?? quote?.symbol ?? "",
          market: hit?.market ?? quote?.market ?? "US",
          name: hit?.name ?? quote?.name ?? "",
          currency:
            hit?.currency ??
            quote?.currency ??
            ((hit?.market ?? quote?.market) === "HK" ? "HKD" : "USD"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("watchlist.addFailed"));
      }
    } catch {
      setError(t("common.networkError"));
    }
  }

  function addToPortfolio() {
    if (!selected && !quote) return;
    const hit = selected;
    const params = new URLSearchParams({
      assetType: hit?.assetType ?? "Stock",
      market: (hit?.market ?? quote?.market ?? "US") as string,
      symbol: hit?.symbol ?? quote?.symbol ?? "",
      name: hit?.name ?? quote?.name ?? "",
      currency:
        hit?.currency ??
        quote?.currency ??
        ((hit?.market ?? quote?.market) === "HK" ? "HKD" : "USD"),
    });
    if (quote?.price != null) {
      params.set("costHint", String(quote.price));
    }
    window.location.href = `/holdings/new?${params.toString()}`;
  }

  return (
    <section className="ui-card p-2 sm:p-2.5">
      <div className="mb-1.5">
        <h2 className="ui-section-title">{t("quoteLookup.title")}</h2>
        <p className="ui-section-hint">{t("quoteLookup.hint")}</p>
      </div>

      <SearchBox navigateOnSelect={false} onSelect={loadQuote} />

      {busy && (
        <p className="mt-1.5 text-[11px] text-[var(--muted)]">
          {t("quoteLookup.fetching")}
        </p>
      )}
      {error && (
        <p className="mt-1.5 rounded-md bg-[var(--danger-soft)] px-2 py-1 text-[11px] text-[var(--danger)]">
          {error}
        </p>
      )}

      {quote && !busy && (
        <div className="mt-2 rounded-md bg-[var(--accent-soft)] p-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <MarketBadge market={quote.market} />
                <span className="text-[10px] text-[var(--muted)]">
                  {quote.symbol}
                </span>
              </div>
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {quote.name || quote.symbol}
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-semibold tabular-nums">
                {quote.price != null
                  ? formatMoney(quote.price, quote.currency)
                  : t("common.dash")}
              </p>
              {quote.dividendYieldPct != null && (
                <p className="text-[10px] text-[var(--accent-deep)]">
                  {t("quoteLookup.yield")}{" "}
                  {formatPct(quote.dividendYieldPct).replace("+", "")}
                </p>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button type="button" onClick={addToPortfolio} className="ui-btn-primary">
              {t("quoteLookup.addToPortfolio")}
            </button>
            <button type="button" onClick={addToWatchlist} className="ui-btn-ghost">
              {t("watchlist.add")}
            </button>
            <button
              type="button"
              onClick={() => selected && loadQuote(selected)}
              className="ui-btn-ghost"
            >
              {t("quoteLookup.refreshQuote")}
            </button>
          </div>
          <div className="mt-2">
            <StockChart
              symbol={quote.symbol}
              market={quote.market}
              currency={quote.currency}
              name={quote.name}
              compact
            />
          </div>
        </div>
      )}
    </section>
  );
}
