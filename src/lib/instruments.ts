import type { SearchHit } from "@/lib/quotes";

/** Common HK/US equities + sample bonds for offline / fast typeahead */
export const SEED_INSTRUMENTS: SearchHit[] = [
  { symbol: "AAPL", name: "Apple Inc.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corporation", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corporation", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "META", name: "Meta Platforms Inc.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "V", name: "Visa Inc.", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc. Class B", market: "US", assetType: "Stock", currency: "USD" },
  { symbol: "0700.HK", name: "Tencent Holdings", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "9988.HK", name: "Alibaba Group Holding", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "0005.HK", name: "HSBC Holdings", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "1299.HK", name: "AIA Group", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "0941.HK", name: "China Mobile", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "2318.HK", name: "Ping An Insurance", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "0388.HK", name: "Hong Kong Exchanges", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "3690.HK", name: "Meituan", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "1810.HK", name: "Xiaomi Corporation", market: "HK", assetType: "Stock", currency: "HKD" },
  { symbol: "9618.HK", name: "JD.com", market: "HK", assetType: "Stock", currency: "HKD" },
  {
    symbol: "US912828Z",
    name: "US Treasury Note (sample)",
    market: "US",
    assetType: "Bond",
    isin: "US912828Z781",
    currency: "USD",
  },
  {
    symbol: "HKGB2028",
    name: "HKSAR Government Bond (sample)",
    market: "HK",
    assetType: "Bond",
    isin: "HK0000SAMPLE",
    currency: "HKD",
  },
  {
    symbol: "TLT",
    name: "iShares 20+ Year Treasury Bond ETF",
    market: "US",
    assetType: "Stock",
    currency: "USD",
  },
];

export function searchSeed(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEED_INSTRUMENTS.filter(
    (i) =>
      i.symbol.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.isin && i.isin.toLowerCase().includes(q))
  );
}
