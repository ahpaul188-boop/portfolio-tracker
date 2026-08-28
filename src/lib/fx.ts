export type FxRates = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
};

const SUPPORTED = ["USD", "HKD"] as const;
const CACHE_TTL_MS = 60 * 60_000;

let cache: { at: number; data: FxRates } | null = null;

async function fetchFrankfurter(base: string): Promise<Record<string, number>> {
  const targets = SUPPORTED.filter((c) => c !== base).join(",");
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${base}&to=${targets}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error("FX rate fetch failed");
  const data = (await res.json()) as { rates: Record<string, number> };
  return { [base]: 1, ...data.rates };
}

export async function getFxRates(base = "USD"): Promise<FxRates> {
  const now = Date.now();
  if (cache && cache.data.base === base && now - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const rates = await fetchFrankfurter(base);
  const data: FxRates = {
    base,
    rates,
    fetchedAt: new Date().toISOString(),
  };
  cache = { at: now, data };
  return data;
}

/** Convert amount from `from` currency to `to` using rates with `base` currency. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number | null {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}

export function sumInCurrency(
  amounts: { value: number; currency: string }[],
  target: string,
  rates: Record<string, number>
): number {
  let total = 0;
  for (const { value, currency } of amounts) {
    const converted = convertAmount(value, currency, target, rates);
    if (converted != null) total += converted;
  }
  return total;
}
