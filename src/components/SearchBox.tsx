"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { useI18n } from "@/components/LocaleProvider";
import type { SearchHit } from "@/lib/quotes";

type Props = {
  onSelect?: (hit: SearchHit) => void;
  navigateOnSelect?: boolean;
};

export function SearchBox({ onSelect, navigateOnSelect = true }: Props) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(timer);
  }, [q, runSearch]);

  function pick(hit: SearchHit) {
    onSelect?.(hit);
    setOpen(false);
    setQ("");
    if (navigateOnSelect) {
      const params = new URLSearchParams({
        assetType: hit.assetType,
        market: hit.market,
        symbol: hit.symbol,
        name: hit.name,
        currency: hit.currency,
      });
      if (hit.isin) params.set("isin", hit.isin);
      window.location.href = `/holdings/new?${params.toString()}`;
    }
  }

  function assetTypeLabel(assetType: string): string {
    if (assetType === "Bond") return t("asset.bond");
    if (assetType === "Stock") return t("asset.stock");
    return assetType;
  }

  return (
    <div className="relative">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {t("search.label")}
      </label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={t("search.placeholder")}
        className="ui-input mt-0.5"
      />
      {loading && (
        <p className="mt-1 text-xs text-[var(--muted)]">{t("search.searching")}</p>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
          {results.map((hit) => (
            <li key={`${hit.assetType}-${hit.market}-${hit.symbol}`}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--accent-soft)]"
                onClick={() => pick(hit)}
              >
                <MarketBadge market={hit.market} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{hit.name}</span>
                  <span className="block text-xs text-[var(--muted)]">
                    {hit.symbol} · {assetTypeLabel(hit.assetType)}
                    {hit.isin ? ` · ${hit.isin}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
