"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, pnlClass } from "@/lib/format";
import {
  filterSalesByYear,
  type RealizedSummary,
} from "@/lib/realized-pnl";

type Props = {
  data: RealizedSummary;
};

export function RealizedPnlPanel({ data }: Props) {
  const { t, formatDate } = useI18n();
  const years = useMemo(
    () => ["all", ...data.byYear.map((y) => String(y.year))] as const,
    [data.byYear]
  );
  const [yearFilter, setYearFilter] = useState<string>("all");

  const filteredSales = useMemo(() => {
    if (yearFilter === "all") return data.sales;
    return filterSalesByYear(data.sales, Number(yearFilter));
  }, [data.sales, yearFilter]);

  const filteredTotal = useMemo(() => {
    if (yearFilter === "all") return data.allTimeTotal;
    const row = data.byYear.find((y) => String(y.year) === yearFilter);
    return row?.total ?? 0;
  }, [data.allTimeTotal, data.byYear, yearFilter]);

  const barData = [...data.byYear]
    .sort((a, b) => a.year - b.year)
    .map((y) => ({
      year: String(y.year),
      total: y.total,
      fill: y.total >= 0 ? "#12b76a" : "#f04438",
    }));

  if (!data.sales.length) {
    return (
      <section className="ui-card p-2 sm:p-2.5">
        <h2 className="ui-section-title">{t("realized.title")}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("realized.empty")}</p>
      </section>
    );
  }

  return (
    <section className="ui-card p-2 sm:p-2.5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="ui-section-title">{t("realized.title")}</h2>
          <p className="ui-section-hint">{t("realized.hint")}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {yearFilter === "all" ? t("realized.allTime") : t("realized.taxYear")}
          </p>
          <p className={`text-sm font-semibold tabular-nums ${pnlClass(filteredTotal)}`}>
            {formatMoney(filteredTotal, data.displayCurrency)}
          </p>
          {yearFilter === "all" && (
            <p className="text-[10px] text-[var(--muted)]">
              {t("realized.ytd")}:{" "}
              <span className={pnlClass(data.yearToDateTotal)}>
                {formatMoney(data.yearToDateTotal, data.displayCurrency)}
              </span>
            </p>
          )}
        </div>
      </div>

      {barData.length > 1 && (
        <div className="mb-3 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) =>
                  formatMoney(v, data.displayCurrency).replace(/\.\d+$/, "")
                }
                width={56}
              />
              <Tooltip
                formatter={(value) =>
                  formatMoney(Number(value), data.displayCurrency)
                }
                labelFormatter={(label) =>
                  String(t("realized.taxYearLabel", { year: String(label) }))
                }
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.year} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mb-2 flex flex-wrap gap-1">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYearFilter(y)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              yearFilter === y
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {y === "all" ? t("realized.allTime") : y}
          </button>
        ))}
      </div>

      <div className="max-h-48 overflow-auto rounded-lg border border-[var(--line)]">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-[var(--bg-soft)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-2 py-1.5">{t("realized.date")}</th>
              <th className="px-2 py-1.5">{t("realized.symbol")}</th>
              <th className="px-2 py-1.5 text-right">{t("realized.qty")}</th>
              <th className="px-2 py-1.5 text-right">{t("realized.costBasis")}</th>
              <th className="px-2 py-1.5 text-right">{t("realized.proceeds")}</th>
              <th className="px-2 py-1.5 text-right">{t("realized.pnl")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s) => (
              <tr
                key={`${s.tradeId ?? s.tradeDate}-${s.symbol}-${s.quantity}`}
                className="border-t border-[var(--line)]"
              >
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {formatDate(new Date(s.tradeDate), {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-2 py-1.5">
                  <span className="font-medium">{s.symbol}</span>
                  <span className="block text-[10px] text-[var(--muted)] truncate max-w-[8rem]">
                    {s.name}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{s.quantity}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatMoney(s.costBasisPerShare, s.currency)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatMoney(s.proceeds, s.currency)}
                </td>
                <td
                  className={`px-2 py-1.5 text-right tabular-nums font-medium ${pnlClass(s.realizedPnl)}`}
                >
                  {formatMoney(s.realizedPnl, s.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[9px] text-[var(--muted)]">{t("realized.disclaimer")}</p>
    </section>
  );
}
