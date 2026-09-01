"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, formatPct } from "@/lib/format";
import type { AllocationBundle, AllocationSlice } from "@/lib/portfolio-allocation";

type View = "market" | "assetType" | "topHoldings" | "concentration";

type Props = {
  data: AllocationBundle;
};

function sliceLabel(
  slice: AllocationSlice,
  t: ReturnType<typeof useI18n>["t"]
): string {
  if (slice.id === "other") return t("allocation.other");
  if (slice.id === "Stock") return t("asset.stock");
  if (slice.id === "Bond") return t("asset.bond");
  return slice.label;
}

function ChartTooltip({
  active,
  payload,
  currency,
  t,
}: {
  active?: boolean;
  payload?: { payload: AllocationSlice }[];
  currency: string;
  t: ReturnType<typeof useI18n>["t"];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-xs shadow-md">
      <p className="font-medium text-[var(--ink)]">{sliceLabel(row, t)}</p>
      <p className="tabular-nums text-[var(--muted)]">
        {formatMoney(row.value, currency)} · {formatPct(row.pct)}
      </p>
    </div>
  );
}

export function AllocationCharts({ data }: Props) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("market");
  const [activeId, setActiveId] = useState<string | null>(null);

  const slices = useMemo(() => {
    switch (view) {
      case "market":
        return data.market;
      case "assetType":
        return data.assetType;
      case "topHoldings":
        return data.topHoldings;
      case "concentration":
        return data.concentration;
      default:
        return data.market;
    }
  }, [data, view]);

  const chartData = slices.map((s) => ({
    ...s,
    displayLabel: sliceLabel(s, t),
  }));

  const activeSlice = chartData.find((s) => s.id === activeId) ?? null;

  const views: { id: View; label: string }[] = [
    { id: "market", label: t("allocation.byMarket") },
    { id: "assetType", label: t("allocation.byAssetType") },
    { id: "topHoldings", label: t("allocation.topHoldings") },
    { id: "concentration", label: t("allocation.concentration") },
  ];

  const isBar = view === "concentration";

  return (
    <section className="ui-card p-2 sm:p-2.5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="ui-section-title">{t("allocation.title")}</h2>
          <p className="ui-section-hint">{t("allocation.hint")}</p>
        </div>
        {activeSlice && (
          <div className="text-right text-xs">
            <p className="font-medium">{activeSlice.displayLabel}</p>
            <p className="tabular-nums text-[var(--muted)]">
              {formatMoney(activeSlice.value, data.displayCurrency)} ·{" "}
              {formatPct(activeSlice.pct)}
            </p>
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setView(v.id);
              setActiveId(null);
            }}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              view === v.id
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="h-52">
        {isBar ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 10 }}
                domain={[0, "dataMax"]}
              />
              <YAxis
                type="category"
                dataKey="displayLabel"
                width={52}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                content={
                  <ChartTooltip currency={data.displayCurrency} t={t} />
                }
              />
              <Bar
                dataKey="pct"
                radius={[0, 4, 4, 0]}
                onMouseEnter={(_, i) => setActiveId(chartData[i]?.id ?? null)}
                onMouseLeave={() => setActiveId(null)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    opacity={activeId && activeId !== entry.id ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="displayLabel"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
                onMouseEnter={(_, i) => setActiveId(chartData[i]?.id ?? null)}
                onMouseLeave={() => setActiveId(null)}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    stroke="white"
                    strokeWidth={2}
                    opacity={activeId && activeId !== entry.id ? 0.45 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                content={
                  <ChartTooltip currency={data.displayCurrency} t={t} />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {chartData.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span>{s.displayLabel}</span>
            <span className="tabular-nums">{formatPct(s.pct)}</span>
          </li>
        ))}
      </ul>

      {view === "concentration" && chartData.some((s) => s.pct > 20) && (
        <p className="mt-2 text-[10px] text-[var(--danger)]">
          {t("allocation.concentrationWarning")}
        </p>
      )}
    </section>
  );
}
