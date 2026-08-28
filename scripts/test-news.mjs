import { getPortfolioNews } from "../src/lib/news.ts";

const result = await getPortfolioNews([
  { symbol: "0941.HK", name: "China Mobile", market: "HK" },
  { symbol: "3416.HK", name: "A GX HSCEICC", market: "HK" },
]);
console.log("count", result.items.length, "at", result.fetchedAt);
for (const i of result.items.slice(0, 5)) {
  console.log("-", i.sourceLabel, i.title.slice(0, 80));
}
