"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { useI18n } from "@/components/LocaleProvider";
import type { NewsItem } from "@/lib/news";

type Props = {
  initialItems?: NewsItem[];
  initialFetchedAt?: string | null;
};

export function NewsPanel({ initialItems = [], initialFetchedAt = null }: Props) {
  const { locale, t, formatDateTime } = useI18n();
  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [fetchedAt, setFetchedAt] = useState<string | null>(initialFetchedAt);
  const [filter, setFilter] = useState<"all" | "portfolio" | "market">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return t("news.justNow");
    if (mins < 60) return t("news.minutesAgo", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return t("news.hoursAgo", { n: hrs });
    const days = Math.floor(hrs / 24);
    return t("news.daysAgo", { n: days });
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("news.loadFailed"));
        return;
      }
      setItems(data.items ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [locale, refresh]);

  const filtered = items.filter((n) => {
    if (filter === "portfolio") return Boolean(n.relatedSymbol);
    if (filter === "market") return !n.relatedSymbol;
    return true;
  });

  const filterLabels = {
    all: t("common.all"),
    portfolio: t("news.myPortfolio"),
    market: t("news.markets"),
  } as const;

  return (
    <aside className="ui-card flex max-h-[22rem] flex-col overflow-hidden xl:max-h-[28rem]">
      <div className="border-b border-[var(--line)] px-2 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <h2 className="ui-section-title">{t("news.title")}</h2>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={busy}
            className="ui-btn-ghost shrink-0 px-1.5 py-0.5 text-[10px] disabled:opacity-60"
          >
            {busy ? "…" : t("common.refresh")}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {(["all", "portfolio", "market"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`ui-filter-btn ${
                filter === key
                  ? "bg-[var(--ink)] text-white"
                  : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {busy && items.length === 0 && (
          <p className="px-2 py-4 text-center text-[11px] text-[var(--muted)]">
            {t("news.loading")}
          </p>
        )}
        {error && (
          <p className="m-1 rounded-md bg-[var(--danger-soft)] px-2 py-1 text-[11px] text-[var(--danger)]">
            {error}
          </p>
        )}
        {!error && !busy && filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-[11px] text-[var(--muted)]">
            {t("news.empty")}
          </p>
        )}
        <ul>
          {filtered.map((n) => (
            <li key={`${locale}-${n.id}`}>
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md px-1.5 py-1.5 hover:bg-[var(--accent-soft)]"
              >
                <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--ink)]">
                  {n.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-[var(--muted)]">
                  {n.relatedSymbol ? (
                    <span className="ui-pill bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                      {n.relatedSymbol}
                    </span>
                  ) : (
                    <span className="truncate">{n.sourceLabel}</span>
                  )}
                  <span>·</span>
                  <time dateTime={n.publishedAt}>{timeAgo(n.publishedAt)}</time>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
      {fetchedAt && (
        <p className="border-t border-[var(--line)] px-2 py-1 text-[9px] text-[var(--muted)]">
          {t("news.updated")} {formatDateTime(fetchedAt)}
        </p>
      )}
    </aside>
  );
}
