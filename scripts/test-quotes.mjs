import { getQuotes } from "../src/lib/quotes/index.ts";

const { quotes } = await getQuotes([
  { symbol: "0941.HK", market: "HK" },
  { symbol: "3416.HK", market: "HK" },
]);
console.log(JSON.stringify(quotes, null, 2));
