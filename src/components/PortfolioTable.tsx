"use client";

import { useMemo, useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, formatPct, pnlClass, pnlPillClass } from "@/lib/format";
import type { EnrichedHolding } from "@/lib/portfolio";

type Props = {
  holdings: EnrichedHolding[];
};

export function PortfolioTable({ holdings }: Props) {
  const { t } = useI18n();
  const [market, setMarket] = useState<"ALL" | "HK" | "US">("ALL");
  const [assetType, setAssetType] = useState<"ALL" | "Stock" | "Bond">("ALL");

  const filtered = useMemo(() => {
    return holdings.filter((h) => {
      if (market !== "ALL" && h.market !== market) return false;
      if (assetType !== "ALL" && h.assetType !== assetType) return false;
      return true;
    });
  }, [holdings, market, assetType]);

  if (holdings.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--bg-soft)] px-4 py-6 text-center">
        <p className="text-sm font-medium text-[var(--ink)]">
          {t("table.emptyTitle")}
        </p>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          {t("table.emptyHint")}
        </p>
        <a href="/holdings/new" className="ui-btn-primary mt-3 inline-flex">
          {t("table.addFirst")}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {(["ALL", "HK", "US"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMarket(m)}
            className={`ui-filter-btn ${
              market === m
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {m === "ALL" ? t("table.allMarkets") : m}
          </button>
        ))}
        {(["ALL", "Stock", "Bond"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAssetType(type)}
            className={`ui-filter-btn ${
              assetType === type
                ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                : "border border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {type === "ALL"
              ? t("table.allTypes")
              : type === "Stock"
                ? t("asset.stocks")
                : t("asset.bonds")}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="ui-table">
          <thead>
            <tr>
              <th>{t("table.name")}</th>
              <th>{t("table.type")}</th>
              <th>{t("table.qty")}</th>
              <th>{t("table.held")}</th>
              <th>{t("table.price")}</th>
              <th>{t("table.value")}</th>
              <th>{t("table.pnl")}</th>
              <th>{t("table.dividends")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr
                key={h.id}
                className="border-t border-[var(--line)] hover:bg-[var(--bg-soft)]"
              >
                <td>
                  <div className="flex items-center gap-1">
                    <MarketBadge market={h.market} />
                    <div className="min-w-0">
                      <a
                        href={`/holdings/${h.id}`}
                        className="block truncate font-medium text-[var(--ink)] hover:underline"
                      >
                        {h.name}
                      </a>
                      <div className="truncate text-[10px] text-[var(--muted)]">
                        {h.symbol}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-[var(--muted)]">
                  {h.assetType === "Bond"
                    ? t("asset.bond")
                    : h.assetType === "Stock"
                      ? t("asset.stock")
                      : h.assetType}
                </td>
                <td className="tabular-nums">{h.quantity}</td>
                <td className="tabular-nums text-[var(--muted)]">
                  {h.holdLabel ?? t("common.dash")}
                </td>
                <td className="tabular-nums">
                  {h.unitPrice != null
                    ? formatMoney(h.unitPrice, h.currency)
                    : t("common.dash")}
                </td>
                <td className="tabular-nums font-medium">
                  {h.marketValue != null
                    ? formatMoney(h.marketValue, h.currency)
                    : t("common.dash")}
                </td>
                <td>
                  {h.unrealizedPnl != null ? (
                    <span className={`ui-pill ${pnlPillClass(h.unrealizedPnl)}`}>
                      {formatMoney(h.unrealizedPnl, h.currency)}
                    </span>
                  ) : (
                    t("common.dash")
                  )}
                </td>
                <td className={`tabular-nums ${pnlClass(h.interestEarned ?? 0)}`}>
                  {h.interestEarned != null
                    ? formatMoney(h.interestEarned, h.currency)
                    : t("common.dash")}
                </td>
                <td className="text-right">
                  <a
                    href={`/holdings/${h.id}`}
                    className="text-[10px] font-medium text-[var(--accent-deep)] hover:underline"
                  >
                    {t("common.edit")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-[11px] text-[var(--muted)]">
            {t("table.noMatch")}
          </p>
        )}
      </div>
    </div>
  );
}

export function RefreshQuotesButton() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      await fetch("/api/quotes");
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      className="ui-btn-ghost disabled:opacity-60"
    >
      {busy ? t("dashboard.refreshingQuotes") : t("dashboard.refreshQuotes")}
    </button>
  );
}
