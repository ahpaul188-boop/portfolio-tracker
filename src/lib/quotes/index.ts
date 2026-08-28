import type { Market } from "@/lib/types";
import { normalizeSymbol } from "@/lib/types";

export type DividendEvent = {
  /** Ex-dividend date (UTC midnight-ish from Yahoo) */
  date: string;
  /** Cash amount per share/unit */
  amount: number;
};

export type QuoteResult = {
  symbol: string;
  price: number | null;
  /** Annual dividend/distribution yield in percent, e.g. 6.05 */
  dividendYieldPct: number | null;
  dividends: DividendEvent[];
  currency?: string;
  name?: string;
  yieldSource?: string;
  error?: string;
};

type CacheEntry = {
  price: number | null;
  dividendYieldPct: number | null;
  dividends: DividendEvent[];
  currency?: string;
  name?: string;
  yieldSource?: string;
  at: number;
};

const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json",
};

/** Known distribution pages when Yahoo quote page is missing */
const YIELD_PAGE_BY_SYMBOL: Record<
  string,
  { url: string; parse: (html: string) => number | null; source: string }
> = {
  "3416.HK": {
    url: "https://www.globalxetfs.com.hk/funds/hscei-covered-call-etf/",
    source: "Global X (annualized distribution)",
    parse(html) {
      const m = html.match(/Annualized Yield<\/td>\s*<td[^>]*>\s*([0-9.]+)\s*%/i);
      if (m) return Number(m[1]);
      return null;
    },
  },
  "0941.HK": {
    url: "https://stockanalysis.com/quote/hkg/0941/dividend/",
    source: "StockAnalysis (dividend yield)",
    parse(html) {
      const m = html.match(/Dividend Yield[\s\S]{0,200}?([0-9]+(?:\.[0-9]+)?)\s*%/i);
      if (m) return Number(m[1]);
      return null;
    },
  },
};

/** Last-resort published yields when live scrape fails */
const FALLBACK_YIELD_PCT: Record<string, { pct: number; source: string }> = {
  "0941.HK": {
    pct: 6.05,
    source: "Yahoo Finance snapshot (forward dividend yield)",
  },
  "3416.HK": {
    pct: 20.1,
    source: "Global X snapshot (annualized distribution)",
  },
};

export function yahooSymbol(symbol: string, market: Market): string {
  return normalizeSymbol(symbol, market);
}

export const HISTORY_RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export function isHistoryRange(value: string): value is HistoryRange {
  return (HISTORY_RANGES as readonly string[]).includes(value);
}

const RANGE_INTERVAL: Record<HistoryRange, string> = {
  "1d": "5m",
  "5d": "15m",
  "1mo": "1d",
  "6mo": "1d",
  "1y": "1d",
  "5y": "1wk",
};

export type HistoryPoint = {
  t: number;
  close: number;
};

export type HistoryResult = {
  symbol: string;
  range: HistoryRange;
  points: HistoryPoint[];
  currency?: string;
  previousClose?: number;
  error?: string;
};

const historyCache = new Map<string, HistoryResult & { at: number }>();
const HISTORY_TTL_MS = 5 * 60_000;

export async function fetchYahooHistory(
  symbol: string,
  range: HistoryRange
): Promise<HistoryResult> {
  const cacheKey = `${symbol}:${range}`;
  const hit = historyCache.get(cacheKey);
  const now = Date.now();
  if (hit && now - hit.at < HISTORY_TTL_MS) {
    return {
      symbol: hit.symbol,
      range: hit.range,
      points: hit.points,
      currency: hit.currency,
      previousClose: hit.previousClose,
      error: hit.error,
    };
  }

  const interval = RANGE_INTERVAL[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return { symbol, range, points: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      const msg =
        data?.chart?.error?.description || "No history in response";
      return { symbol, range, points: [], error: msg };
    }
    const timestamps = (result.timestamp ?? []) as number[];
    const adj = result.indicators?.adjclose?.[0]?.adjclose as
      | Array<number | null>
      | undefined;
    const rawClose = result.indicators?.quote?.[0]?.close as
      | Array<number | null>
      | undefined;
    const adjHasValue = adj?.some((v) => typeof v === "number") ?? false;
    const closes = (adjHasValue ? adj : rawClose) ?? [];
    const points: HistoryPoint[] = [];
    const n = Math.min(timestamps.length, closes.length);
    for (let i = 0; i < n; i++) {
      const close = closes[i];
      const ts = timestamps[i];
      if (typeof close === "number" && Number.isFinite(close) && typeof ts === "number") {
        points.push({ t: ts * 1000, close });
      }
    }
    const previousClose =
      typeof result.meta?.chartPreviousClose === "number"
        ? result.meta.chartPreviousClose
        : typeof result.meta?.previousClose === "number"
          ? result.meta.previousClose
          : undefined;
    const out: HistoryResult = {
      symbol,
      range,
      points,
      currency: result.meta?.currency,
      previousClose,
      error: points.length === 0 ? "No history in response" : undefined,
    };
    historyCache.set(cacheKey, { ...out, at: now });
    return out;
  } catch (e) {
    return {
      symbol,
      range,
      points: [],
      error: e instanceof Error ? e.message : "History failed",
    };
  }
}

async function fetchYahooChart(symbol: string): Promise<{
  price: number | null;
  currency?: string;
  name?: string;
  error?: string;
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: YAHOO_HEADERS,
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    return { price: null, error: `HTTP ${res.status}` };
  }
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price =
    meta?.regularMarketPrice ??
    meta?.previousClose ??
    result?.indicators?.quote?.[0]?.close?.slice(-1)?.[0] ??
    null;
  return {
    price: typeof price === "number" && Number.isFinite(price) ? price : null,
    currency: meta?.currency,
    name: meta?.shortName ?? meta?.longName,
    error: price == null ? "No price in response" : undefined,
  };
}

/** Actual cash dividends / distributions from Yahoo chart events */
export async function fetchYahooDividends(
  symbol: string
): Promise<DividendEvent[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10y&events=div`;
  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.chart?.result?.[0]?.events?.dividends as
      | Record<string, { amount?: number; date?: number }>
      | undefined;
    if (!raw) return [];
    return Object.values(raw)
      .filter((d) => typeof d.amount === "number" && typeof d.date === "number")
      .map((d) => ({
        amount: d.amount as number,
        date: new Date((d.date as number) * 1000).toISOString(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/** Parse Yahoo quote page: Forward Dividend & Yield → "5.04 (6.05%)" */
async function fetchYahooPageYield(
  symbol: string
): Promise<{ pct: number | null; source?: string }> {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) return { pct: null };
    const html = await res.text();
    const titled = html.match(
      /Forward Dividend[\s\S]{0,500}?title="[0-9.]+ \(([0-9.]+)%\)"/i
    );
    if (titled) {
      const pct = Number(titled[1]);
      if (Number.isFinite(pct)) {
        return { pct, source: "Yahoo Finance (forward dividend yield)" };
      }
    }
    const loose = html.match(
      /Forward Dividend &amp; Yield[\s\S]{0,200}?([0-9.]+)\s*\(([0-9.]+)%\)/i
    );
    if (loose) {
      const pct = Number(loose[2]);
      if (Number.isFinite(pct)) {
        return { pct, source: "Yahoo Finance (forward dividend yield)" };
      }
    }
    return { pct: null };
  } catch {
    return { pct: null };
  }
}

async function fetchSpecialYield(
  symbol: string
): Promise<{ pct: number | null; source?: string }> {
  const spec = YIELD_PAGE_BY_SYMBOL[symbol];
  if (!spec) return { pct: null };
  try {
    const res = await fetch(spec.url, {
      headers: YAHOO_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) return { pct: null };
    const html = await res.text();
    const pct = spec.parse(html);
    if (pct != null && Number.isFinite(pct)) {
      return { pct, source: spec.source };
    }
  } catch {
    /* ignore */
  }
  return { pct: null };
}

async function fetchDividendYieldPct(
  symbol: string
): Promise<{ pct: number | null; source?: string }> {
  const yahoo = await fetchYahooPageYield(symbol);
  if (yahoo.pct != null) return yahoo;
  const special = await fetchSpecialYield(symbol);
  if (special.pct != null) return special;
  const fallback = FALLBACK_YIELD_PCT[symbol];
  if (fallback) return { pct: fallback.pct, source: fallback.source };
  return { pct: null };
}

export async function getQuotes(
  items: { symbol: string; market: Market }[]
): Promise<{ quotes: Record<string, QuoteResult>; fetchedAt: string }> {
  const quotes: Record<string, QuoteResult> = {};
  const now = Date.now();
  const unique = new Map<string, Market>();

  for (const item of items) {
    const sym = yahooSymbol(item.symbol, item.market);
    unique.set(sym, item.market);
  }

  await Promise.all(
    [...unique.entries()].map(async ([sym]) => {
      const hit = cache.get(sym);
      if (hit && now - hit.at < TTL_MS) {
        quotes[sym] = {
          symbol: sym,
          price: hit.price,
          dividendYieldPct: hit.dividendYieldPct,
          dividends: hit.dividends,
          currency: hit.currency,
          name: hit.name,
          yieldSource: hit.yieldSource,
        };
        return;
      }
      try {
        const [chart, yieldInfo, dividends] = await Promise.all([
          fetchYahooChart(sym),
          fetchDividendYieldPct(sym),
          fetchYahooDividends(sym),
        ]);
        const entry: CacheEntry = {
          price: chart.price,
          dividendYieldPct: yieldInfo.pct,
          dividends,
          currency: chart.currency,
          name: chart.name,
          yieldSource: yieldInfo.source,
          at: now,
        };
        cache.set(sym, entry);
        quotes[sym] = {
          symbol: sym,
          price: entry.price,
          dividendYieldPct: entry.dividendYieldPct,
          dividends: entry.dividends,
          currency: entry.currency,
          name: entry.name,
          yieldSource: entry.yieldSource,
          error: chart.error,
        };
      } catch (e) {
        quotes[sym] = {
          symbol: sym,
          price: null,
          dividendYieldPct: null,
          dividends: [],
          error: e instanceof Error ? e.message : "Quote failed",
        };
      }
    })
  );

  return { quotes, fetchedAt: new Date().toISOString() };
}

export type SearchHit = {
  symbol: string;
  name: string;
  market: Market;
  assetType: "Stock" | "Bond";
  isin?: string;
  currency: string;
};

export async function searchYahoo(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`;
  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = (data?.quotes ?? []) as Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      quoteType?: string;
      exchDisp?: string;
      exchange?: string;
    }>;
    return quotes
      .filter((x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF"))
      .map((x) => {
        const symbol = String(x.symbol);
        const isHk =
          symbol.endsWith(".HK") ||
          x.exchDisp?.includes("Hong Kong") ||
          x.exchange === "HKG";
        const market: Market = isHk ? "HK" : "US";
        return {
          symbol: market === "HK" ? normalizeSymbol(symbol, "HK") : symbol,
          name: x.shortname || x.longname || symbol,
          market,
          assetType: "Stock" as const,
          currency: market === "HK" ? "HKD" : "USD",
        };
      })
      .filter((x) => x.market === "HK" || x.market === "US");
  } catch {
    return [];
  }
}
