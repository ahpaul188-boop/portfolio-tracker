"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, formatPct, pnlClass } from "@/lib/format";
import type { HistoryRange } from "@/lib/quotes";

type PerformancePoint = { t: number; value: number };

type SeriesEntry = {
  points: PerformancePoint[];
  changePct: number | null;
};

const RANGES: HistoryRange[] = ["1mo", "6mo", "1y", "5y"];

const RANGE_LABEL: Record<HistoryRange, string> = {
  "1d": "1D",
  "5d": "5D",
  "1mo": "1M",
  "6mo": "6M",
  "1y": "1Y",
  "5y": "5Y",
};

const VB_W = 640;
const VB_H = 180;
const PAD = { l: 12, r: 12, t: 16, b: 10 };

export function PortfolioPerformanceChart() {
  const { t, formatDate } = useI18n();
  const gradId = useId().replace(/:/g, "");
  const [range, setRange] = useState<HistoryRange>("6mo");
  const [series, setSeries] = useState<Record<string, SeriesEntry>>({});
  const [activeCcy, setActiveCcy] = useState<string>("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [method, setMethod] = useState<"trades" | "approximate" | "snapshots">(
    "approximate"
  );

  const currencies = Object.keys(series);
  const selected = activeCcy && series[activeCcy] ? activeCcy : currencies[0];
  const points = selected ? (series[selected]?.points ?? []) : [];
  const changePct = selected ? series[selected]?.changePct : null;

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    setHover(null);
    fetch(`/api/portfolio/performance?range=${range}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || t("performance.failed"));
          setSeries({});
          return;
        }
        const next = (data.series ?? {}) as Record<string, SeriesEntry>;
        setSeries(next);
        setMethod(data.method ?? "approximate");
        const keys = Object.keys(next);
        if (keys.length && !keys.includes(activeCcy)) {
          setActiveCcy(keys[0]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("common.networkError"));
          setSeries({});
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, t]);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.value);
    let yMin = Math.min(...values);
    let yMax = Math.max(...values);
    const pad = (yMax - yMin) * 0.08 || Math.abs(yMax) * 0.02 || 1;
    yMin -= pad;
    yMax += pad;
    const innerW = VB_W - PAD.l - PAD.r;
    const innerH = VB_H - PAD.t - PAD.b;
    const xAt = (i: number) => PAD.l + (i / (points.length - 1)) * innerW;
    const yAt = (v: number) => PAD.t + ((yMax - v) / (yMax - yMin)) * innerH;
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(p.value).toFixed(2)}`)
      .join(" ");
    const area = `${line} L ${xAt(points.length - 1).toFixed(2)} ${VB_H - PAD.b} L ${xAt(0).toFixed(2)} ${VB_H - PAD.b} Z`;
    return { line, area, xAt, yAt };
  }, [points]);

  const active =
    hover != null ? points[hover] : points[points.length - 1];
  const up = changePct == null ? true : changePct >= 0;
  const stroke = up ? "#12b76a" : "#f04438";
  const fillStart = up
    ? "rgba(18, 183, 106, 0.24)"
    : "rgba(240, 68, 56, 0.24)";

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (points.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * (points.length - 1);
    const idx = Math.round(Math.max(0, Math.min(points.length - 1, pct)));
    setHover(idx);
  }

  return (
    <section className="ui-card p-2 sm:p-2.5">
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-1">
        <div>
          <h2 className="ui-section-title">{t("performance.title")}</h2>
          <p className="ui-section-hint">{t("performance.hint")}</p>
        </div>
        {active && selected && (
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(active.value, selected)}
            </p>
            {changePct != null && (
              <p className={`text-[11px] tabular-nums ${pnlClass(changePct)}`}>
                {formatPct(changePct)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              range === r
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
        {currencies.length > 1 &&
          currencies.map((ccy) => (
            <button
              key={ccy}
              type="button"
              onClick={() => setActiveCcy(ccy)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                selected === ccy
                  ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                  : "border border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {ccy}
            </button>
          ))}
      </div>

      <div className="relative h-36">
        {busy && (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--muted)]">
            {t("performance.loading")}
          </p>
        )}
        {!busy && (error || points.length < 2) && (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--muted)]">
            {error || t("performance.empty")}
          </p>
        )}
        {!busy && geometry && (
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-full w-full cursor-crosshair"
            preserveAspectRatio="none"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={t("performance.title")}
          >
            <defs>
              <linearGradient id={`pf-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillStart} />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <path d={geometry.area} fill={`url(#pf-${gradId})`} />
            <path
              d={geometry.line}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {hover != null && points[hover] && (
              <circle
                cx={geometry.xAt(hover)}
                cy={geometry.yAt(points[hover].value)}
                r="4"
                fill="white"
                stroke={stroke}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>

      {hover != null && active && (
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          {formatDate(new Date(active.t), {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}

      <p className="mt-1 text-[9px] text-[var(--muted)]">
        {method === "snapshots"
          ? t("performance.snapshots")
          : method === "trades"
            ? t("performance.trades")
            : t("performance.approximate")}
      </p>
    </section>
  );
}
