import { convertAmount } from "@/lib/fx";
import type { EnrichedHolding } from "@/lib/portfolio";

export type AllocationSlice = {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
};

export type AllocationBundle = {
  market: AllocationSlice[];
  assetType: AllocationSlice[];
  topHoldings: AllocationSlice[];
  concentration: AllocationSlice[];
  totalValue: number;
  displayCurrency: string;
};

const PALETTE = [
  "#2e6b9e",
  "#12b76a",
  "#f79009",
  "#7a5af8",
  "#ee46bc",
  "#0ba5ec",
  "#667085",
  "#f04438",
  "#94a3b8",
];

function colorAt(i: number): string {
  return PALETTE[i % PALETTE.length];
}

function holdingValue(
  h: EnrichedHolding,
  displayCurrency: string,
  rates: Record<string, number>
): number | null {
  if (h.marketValue == null || h.marketValue <= 0) return null;
  return convertAmount(h.marketValue, h.currency, displayCurrency, rates);
}

function toSlices(
  groups: Map<string, { label: string; value: number }>,
  total: number
): AllocationSlice[] {
  return [...groups.entries()]
    .map(([id, { label, value }], i) => ({
      id,
      label,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: colorAt(i),
    }))
    .sort((a, b) => b.value - a.value);
}

function groupBy(
  holdings: EnrichedHolding[],
  displayCurrency: string,
  rates: Record<string, number>,
  keyFn: (h: EnrichedHolding) => { id: string; label: string }
): { slices: AllocationSlice[]; total: number } {
  const groups = new Map<string, { label: string; value: number }>();
  let total = 0;

  for (const h of holdings) {
    const value = holdingValue(h, displayCurrency, rates);
    if (value == null || value <= 0) continue;
    total += value;
    const { id, label } = keyFn(h);
    const prev = groups.get(id);
    groups.set(id, {
      label,
      value: (prev?.value ?? 0) + value,
    });
  }

  return { slices: toSlices(groups, total), total };
}

export function computeAllocationBundle(
  holdings: EnrichedHolding[],
  displayCurrency: string,
  rates: Record<string, number>,
  topN = 8
): AllocationBundle | null {
  const valued = holdings.filter((h) => h.marketValue != null && h.marketValue > 0);
  if (!valued.length) return null;

  const market = groupBy(valued, displayCurrency, rates, (h) => ({
    id: h.market,
    label: h.market,
  }));

  const assetType = groupBy(valued, displayCurrency, rates, (h) => ({
    id: h.assetType,
    label: h.assetType,
  }));

  const holdingGroups = new Map<string, { label: string; value: number }>();
  let total = 0;
  for (const h of valued) {
    const value = holdingValue(h, displayCurrency, rates);
    if (value == null) continue;
    total += value;
    const label = `${h.symbol} · ${h.name}`;
    const prev = holdingGroups.get(h.id);
    holdingGroups.set(h.id, {
      label,
      value: (prev?.value ?? 0) + value,
    });
  }

  const sortedHoldings = [...holdingGroups.entries()]
    .map(([id, { label, value }]) => ({ id, label, value }))
    .sort((a, b) => b.value - a.value);

  const top = sortedHoldings.slice(0, topN);
  const otherValue = sortedHoldings
    .slice(topN)
    .reduce((sum, row) => sum + row.value, 0);

  const topHoldings: AllocationSlice[] = top.map((row, i) => ({
    id: row.id,
    label: row.label,
    value: row.value,
    pct: total > 0 ? (row.value / total) * 100 : 0,
    color: colorAt(i),
  }));

  if (otherValue > 0) {
    topHoldings.push({
      id: "other",
      label: "Other",
      value: otherValue,
      pct: total > 0 ? (otherValue / total) * 100 : 0,
      color: colorAt(topHoldings.length),
    });
  }

  const concentration: AllocationSlice[] = sortedHoldings.map((row, i) => ({
    id: row.id,
    label: row.label.split(" · ")[0],
    value: row.value,
    pct: total > 0 ? (row.value / total) * 100 : 0,
    color: row.value / total > 0.2 ? "#f04438" : colorAt(i),
  }));

  return {
    market: market.slices,
    assetType: assetType.slices,
    topHoldings,
    concentration: concentration.slice(0, topN),
    totalValue: total,
    displayCurrency,
  };
}
