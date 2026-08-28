"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney, formatPct, pnlClass } from "@/lib/format";
import type { HistoryPoint, HistoryRange } from "@/lib/quotes";
import type { Market } from "@/lib/types";

type Props = {
  symbol: string;
  market: Market;
  currency: string;
  name?: string | null;
  costBasis?: number | null;
  compact?: boolean;
};

const RANGES: HistoryRange[] = ["1d", "5d", "1mo", "6mo", "1y", "5y"];

const RANGE_LABEL: Record<HistoryRange, string> = {
  "1d": "1D",
  "5d": "5D",
  "1mo": "1M",
  "6mo": "6M",
  "1y": "1Y",
  "5y": "5Y",
};

const VB_W = 640;
const VB_H = 220;
const PAD = { l: 12, r: 12, t: 18, b: 10 };

export function StockChart({
  symbol,
  market,
  currency,
  name,
  costBasis,
  compact = false,
}: Props) {
  const { t, formatDate, formatDateTime } = useI18n();
  const gradId = useId().replace(/:/g, "");
  const [range, setRange] = useState<HistoryRange>("6mo");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [previousClose, setPreviousClose] = useState<number | undefined>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    setHover(null);
    const params = new URLSearchParams({
      symbol,
      market,
      range,
    });
    fetch(`/api/quotes/history?${params.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || t("chart.failed"));
          setPoints([]);
          return;
        }
        setPoints(data.points ?? []);
        setPreviousClose(
          typeof data.previousClose === "number" ? data.previousClose : undefined
        );
        if (data.error && !(data.points ?? []).length) {
          setError(data.error);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("common.networkError"));
          setPoints([]);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, market, range, t]);

  const baseline = useMemo(() => {
    if (range === "1d" && previousClose != null) return previousClose;
    return points[0]?.close;
  }, [range, previousClose, points]);

  const active = hover != null ? points[hover] : points[points.length - 1];
  const change =
    active && baseline != null && baseline !== 0
      ? ((active.close - baseline) / baseline) * 100
      : null;
  const up = change == null ? true : change >= 0;
  const stroke = up ? "#12b76a" : "#f04438";
  const fillStart = up ? "rgba(18, 183, 106, 0.28)" : "rgba(240, 68, 56, 0.28)";

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const closes = points.map((p) => p.close);
    let yMin = Math.min(...closes);
    let yMax = Math.max(...closes);
    const showCost =
      costBasis != null && Number.isFinite(costBasis) && costBasis > 0;
    if (showCost) {
      yMin = Math.min(yMin, costBasis);
      yMax = Math.max(yMax, costBasis);
    }
    const pad = (yMax - yMin) * 0.08 || Math.abs(yMax) * 0.02 || 1;
    yMin -= pad;
    yMax += pad;
    const innerW = VB_W - PAD.l - PAD.r;
    const innerH = VB_H - PAD.t - PAD.b;
    const xAt = (i: number) =>
      PAD.l + (i / (points.length - 1)) * innerW;
    const yAt = (v: number) =>
      PAD.t + ((yMax - v) / (yMax - yMin)) * innerH;
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(p.close).toFixed(2)}`)
      .join(" ");
    const area = `${line} L ${xAt(points.length - 1).toFixed(2)} ${VB_H - PAD.b} L ${xAt(0).toFixed(2)} ${VB_H - PAD.b} Z`;
    return {
      line,
      area,
      xAt,
      yAt,
      costY: showCost ? yAt(costBasis!) : null,
    };
  }, [points, costBasis]);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (points.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * (points.length - 1);
    const idx = Math.round(Math.max(0, Math.min(points.length - 1, pct)));
    setHover(idx);
  }

  function formatPointTime(ts: number) {
    const d = new Date(ts);
    if (range === "1d" || range === "5d") {
      return formatDateTime(d, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return formatDate(d, { year: "numeric", month: "short", day: "numeric" });
  }

  const heightClass = compact ? "h-40" : "h-56 sm:h-64";
  const wrapClass = compact
    ? "rounded-2xl border border-[var(--line)] bg-white p-4"
    : "ui-card p-5 sm:p-6";

  return (
    <section className={wrapClass}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            className={
              compact
                ? "text-sm font-semibold text-[var(--ink)]"
                : "text-lg font-semibold text-[var(--ink)]"
            }
          >
            {t("chart.title")}
          </h2>
          {!compact && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {name ? `${name} · ${symbol}` : symbol}
            </p>
          )}
        </div>
        {active && (
          <div className="text-right">
            {!compact && (
              <p className="text-xl font-semibold tabular-nums text-[var(--ink)]">
                {formatMoney(active.close, currency)}
              </p>
            )}
            {change != null && (
              <p className={`text-sm tabular-nums ${pnlClass(change)}`}>
                {formatPct(change)}
              </p>
            )}
            {(hover != null || compact) && active && (
              <p className="text-[11px] text-[var(--muted)]">
                {hover != null
                  ? formatPointTime(active.t)
                  : formatMoney(active.close, currency)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              range === r
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--bg-soft)]"
            }`}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      <div className={`relative ${heightClass}`}>
        {busy && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">
            {t("chart.loading")}
          </p>
        )}
        {!busy && (error || points.length < 2) && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">
            {error || t("chart.empty")}
          </p>
        )}
        {!busy && geometry && (
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-full w-full cursor-crosshair touch-pan-y"
            preserveAspectRatio="none"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={t("chart.title")}
          >
            <defs>
              <linearGradient id={`fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillStart} />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            {geometry.costY != null && (
              <line
                x1={PAD.l}
                x2={VB_W - PAD.r}
                y1={geometry.costY}
                y2={geometry.costY}
                stroke="#667085"
                strokeWidth="1"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path d={geometry.area} fill={`url(#fill-${gradId})`} />
            <path
              d={geometry.line}
              fill="none"
              stroke={stroke}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {hover != null && points[hover] && (
              <>
                <line
                  x1={geometry.xAt(hover)}
                  x2={geometry.xAt(hover)}
                  y1={PAD.t}
                  y2={VB_H - PAD.b}
                  stroke="#98a2b3"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={geometry.xAt(hover)}
                  cy={geometry.yAt(points[hover].close)}
                  r="4.5"
                  fill="white"
                  stroke={stroke}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
        <span>{t("chart.delayed")}</span>
        {geometry?.costY != null && costBasis != null && (
          <span>
            {t("chart.avgCost")}: {formatMoney(costBasis, currency)}
          </span>
        )}
      </div>
    </section>
  );
}
