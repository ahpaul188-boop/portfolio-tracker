"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, formatPct, pnlClass, pnlPillClass } from "@/lib/format";
import { convertAmount } from "@/lib/fx";
import type { FxRates } from "@/lib/fx";
import type { PortfolioSummary } from "@/lib/portfolio";
import type { DisplayCurrency } from "@/lib/user-preferences";

type Props = {
  summary: PortfolioSummary;
  holdingCount: number;
  userName?: string | null;
  exportMenu?: ReactNode;
  displayCurrency?: DisplayCurrency;
  fxRates?: FxRates | null;
};

function greetingKey(hour: number): "nav.greetingMorning" | "nav.greetingAfternoon" | "nav.greetingEvening" {
  if (hour < 12) return "nav.greetingMorning";
  if (hour < 18) return "nav.greetingAfternoon";
  return "nav.greetingEvening";
}

export function SummaryCards({
  summary,
  holdingCount,
  userName,
  exportMenu,
  displayCurrency = "USD",
  fxRates = null,
}: Props) {
  const { t, formatDateTime } = useI18n();
  const currencies = Object.keys(summary.byCurrency);
  const [activeCcy, setActiveCcy] = useState(currencies[0] ?? "USD");
  const selected = currencies.includes(activeCcy)
    ? activeCcy
    : (currencies[0] ?? "USD");
  const row = summary.byCurrency[selected];
  const displayName = userName?.split(" ")[0] || t("nav.user");
  const hour = useMemo(() => new Date().getHours(), []);

  const combined = useMemo(() => {
    if (!fxRates || currencies.length < 2) return null;
    let value = 0;
    let cost = 0;
    let pnl = 0;
    for (const [ccy, ccyRow] of Object.entries(summary.byCurrency)) {
      const toDisplay = (n: number) =>
        convertAmount(n, ccy, displayCurrency, fxRates.rates) ?? 0;
      value += toDisplay(ccyRow.marketValue);
      cost += toDisplay(ccyRow.costBasis);
      pnl += toDisplay(ccyRow.unrealizedPnl);
    }
    return { value, cost, pnl };
  }, [currencies.length, displayCurrency, fxRates, summary.byCurrency]);

  return (
    <section className="ui-card p-2.5 sm:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
        <div className="min-w-0">
          <h1
            className="truncate text-base font-semibold text-[var(--ink)] sm:text-lg"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {t(greetingKey(hour), { name: displayName })}
          </h1>
          {summary.fetchedAt && (
            <p className="text-[10px] text-[var(--muted)]">
              {t("summary.quotesUpdated")}{" "}
              <time dateTime={summary.fetchedAt}>
                {formatDateTime(summary.fetchedAt)}
              </time>
            </p>
          )}
          {combined && (
            <p className="text-[10px] text-[var(--muted)]">
              {t("summary.combinedFx", { currency: displayCurrency })}{" "}
              <span className="font-medium text-[var(--ink)]">
                {formatMoney(combined.value, displayCurrency)}
              </span>
              <span className={`ml-1 ${pnlClass(combined.pnl)}`}>
                (
                {formatPct(
                  combined.cost > 0 ? (combined.pnl / combined.cost) * 100 : 0
                )}
                )
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(currencies.length ? currencies : ["USD", "HKD"]).map((ccy) => (
            <button
              key={ccy}
              type="button"
              onClick={() => setActiveCcy(ccy)}
              className={`ui-filter-btn ${
                selected === ccy
                  ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                  : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {ccy}
            </button>
          ))}
          <a href="/holdings/new" className="ui-btn-primary">
            {t("nav.withdrawHint")}
          </a>
          {exportMenu}
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("nav.totalBalance")}
          </p>
          <p className="text-2xl font-semibold tabular-nums leading-tight sm:text-3xl">
            {row
              ? formatMoney(row.marketValue, selected)
              : formatMoney(0, selected)}
          </p>
          {row && (
            <div className="mt-1 flex flex-wrap gap-1">
              <span className={`ui-pill ${pnlPillClass(row.unrealizedPnl)}`}>
                {t("summary.pnl")} {formatMoney(row.unrealizedPnl, selected)}
                {row.costBasis > 0
                  ? ` (${formatPct((row.unrealizedPnl / row.costBasis) * 100)})`
                  : ""}
              </span>
              {row.interestEarned > 0 && (
                <span className="ui-pill bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                  {t("summary.dividends")}{" "}
                  {formatMoney(row.interestEarned, selected)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="rounded-md bg-[var(--bg-soft)] px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("summary.holdings")}
          </p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {holdingCount}
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            HK {summary.byMarket.HK.count} · US {summary.byMarket.US.count}
          </p>
        </div>

        {currencies.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--line)] px-2 py-1.5 sm:col-span-2">
            <p className="text-[11px] text-[var(--muted)]">
              {t("summary.noValuations")}
            </p>
          </div>
        ) : (
          currencies.slice(0, 2).map((ccy) => {
            const ccyRow = summary.byCurrency[ccy];
            return (
              <div
                key={ccy}
                className="rounded-md bg-[var(--bg-soft)] px-2 py-1.5"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  {t("summary.value", { currency: ccy })}
                </p>
                <p className="text-sm font-semibold tabular-nums leading-tight">
                  {formatMoney(ccyRow.marketValue, ccy)}
                </p>
                <p
                  className={`text-[10px] tabular-nums ${pnlClass(ccyRow.unrealizedPnl)}`}
                >
                  {formatPct(
                    ccyRow.costBasis > 0
                      ? (ccyRow.unrealizedPnl / ccyRow.costBasis) * 100
                      : 0
                  )}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
