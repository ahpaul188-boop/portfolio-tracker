"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { useI18n } from "@/components/LocaleProvider";
import type { SearchHit } from "@/lib/quotes";
import type { Market } from "@/lib/types";

type Props = {
  value: string;
  onChange: (symbol: string) => void;
  onSelect: (hit: SearchHit) => void;
  market: Market;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
};

export function SymbolSearchField({
  value,
  onChange,
  onSelect,
  market,
  placeholder,
  required,
  className,
  disabled,
}: Props) {
  const { t } = useI18n();
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&market=${market}`
        );
        const data = await res.json();
        const next = (data.results ?? []) as SearchHit[];
        setResults(next);
        setOpen(next.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [market]
  );

  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(() => runSearch(value), 250);
    return () => clearTimeout(timer);
  }, [value, runSearch, disabled]);

  function assetTypeLabel(assetType: string): string {
    if (assetType === "Bond") return t("asset.bond");
    if (assetType === "Stock") return t("asset.stock");
    return assetType;
  }

  function pick(hit: SearchHit) {
    onSelect(hit);
    onChange(hit.symbol);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          {t("search.searching")}
        </p>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--line)] bg-white shadow-[var(--shadow)]">
          {results.map((hit) => (
            <li key={`${hit.assetType}-${hit.market}-${hit.symbol}`}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--accent-soft)]"
                onMouseDown={(e) => e.preventDefault()}
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
