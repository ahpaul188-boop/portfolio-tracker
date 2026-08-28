import type { Locale } from "@/i18n/config";
import { createTranslator, getDictionary } from "@/i18n/messages";
import { translateTextsForLocale } from "@/lib/translate";
import type { Market } from "@/lib/types";

export type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  relatedSymbol?: string;
  relatedName?: string;
  thumbnail?: string;
  sourceLabel: string;
};

type HoldingNewsQuery = {
  symbol: string;
  name: string;
  market: Market;
};

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

type YahooNewsRaw = {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  thumbnail?: { resolutions?: { url?: string; width?: number }[] };
};

function marketQueries(locale: Locale): { q: string; label: string; market: Market }[] {
  const t = createTranslator(getDictionary(locale));

  if (locale === "zh-Hant") {
    return [
      { q: "香港 恒生 股市 財經", label: t("news.hkMarket"), market: "HK" },
      { q: "美國 華爾街 股市 財經", label: t("news.usMarket"), market: "US" },
    ];
  }
  if (locale === "zh-Hans") {
    return [
      { q: "香港 恒生 股市 财经", label: t("news.hkMarket"), market: "HK" },
      { q: "美国 华尔街 股市 财经", label: t("news.usMarket"), market: "US" },
    ];
  }
  return [
    {
      q: "Hong Kong Hang Seng stock market",
      label: t("news.hkMarket"),
      market: "HK",
    },
    {
      q: "US stock market Wall Street",
      label: t("news.usMarket"),
      market: "US",
    },
  ];
}

async function searchYahooNews(
  query: string,
  count: number
): Promise<YahooNewsRaw[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=${count}`;
  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.news ?? []) as YahooNewsRaw[];
  } catch {
    return [];
  }
}

function mapNews(
  raw: YahooNewsRaw[],
  meta: { symbol?: string; name?: string; sourceLabel: string }
): NewsItem[] {
  return raw
    .filter((n) => n.title && n.link)
    .map((n) => {
      const thumbs = n.thumbnail?.resolutions ?? [];
      const thumb =
        thumbs.find((t) => (t.width ?? 0) <= 200)?.url ?? thumbs[0]?.url;
      const ts = n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : new Date().toISOString();
      return {
        id: n.uuid || `${meta.symbol ?? "mkt"}-${n.link}`,
        title: n.title!,
        publisher: n.publisher || "Yahoo Finance",
        link: n.link!,
        publishedAt: ts,
        relatedSymbol: meta.symbol,
        relatedName: meta.name,
        thumbnail: thumb,
        sourceLabel: meta.sourceLabel,
      };
    });
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = item.link || item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

async function localizeNewsItems(
  items: NewsItem[],
  locale: Locale
): Promise<NewsItem[]> {
  if (items.length === 0) return items;

  const titles = items.map((n) => n.title);
  const translatedTitles = await translateTextsForLocale(titles, locale);

  return items.map((item, i) => ({
    ...item,
    title: translatedTitles[i] ?? item.title,
  }));
}

/** Latest market headlines + news tied to portfolio names/symbols */
export async function getPortfolioNews(
  holdings: HoldingNewsQuery[],
  locale: Locale = "en"
): Promise<{ items: NewsItem[]; fetchedAt: string }> {
  const markets = new Set(holdings.map((h) => h.market));
  const allQueries = marketQueries(locale);
  const queries =
    holdings.length === 0
      ? allQueries
      : allQueries.filter((m) => markets.has(m.market));

  const topHoldings = holdings.slice(0, 8);

  const [marketBatches, holdingBatches] = await Promise.all([
    Promise.all(
      queries.map(async (m) =>
        mapNews(await searchYahooNews(m.q, 5), { sourceLabel: m.label })
      )
    ),
    Promise.all(
      topHoldings.map(async (h) => {
        const raw = await searchYahooNews(h.name, 4);
        return mapNews(raw, {
          symbol: h.symbol,
          name: h.name,
          sourceLabel: h.symbol,
        });
      })
    ),
  ]);

  let items = dedupeNews([...holdingBatches.flat(), ...marketBatches.flat()]);
  items = items.slice(0, 20);
  items = await localizeNewsItems(items, locale);

  return { items, fetchedAt: new Date().toISOString() };
}
