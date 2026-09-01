import { convertAmount } from "@/lib/fx";
import { type TradeRow } from "@/lib/ledger";

export type RealizedSale = {
  holdingId: string;
  symbol: string;
  name: string;
  market: string;
  currency: string;
  tradeDate: string;
  quantity: number;
  sellPrice: number;
  fees: number;
  costBasisPerShare: number;
  proceeds: number;
  costSold: number;
  realizedPnl: number;
  tradeId?: string;
};

export type YearlyRealized = {
  year: number;
  byCurrency: Record<string, number>;
  total: number;
};

export type RealizedSummary = {
  sales: RealizedSale[];
  byYear: YearlyRealized[];
  allTimeTotal: number;
  yearToDateTotal: number;
  displayCurrency: string;
};

type HoldingTrades = {
  id: string;
  symbol: string;
  name: string;
  market: string;
  currency: string;
  trades: TradeRow[];
};

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid trade date");
  return d;
}

function sortTrades<T extends { tradeDate: string | Date; side: string }>(
  trades: T[]
): T[] {
  return [...trades].sort((a, b) => {
    const da = toDate(a.tradeDate).getTime();
    const db = toDate(b.tradeDate).getTime();
    if (da !== db) return da - db;
    if (a.side !== b.side) return a.side === "Buy" ? -1 : 1;
    return 0;
  });
}

export function computeRealizedSales(holdings: HoldingTrades[]): RealizedSale[] {
  const sales: RealizedSale[] = [];

  for (const h of holdings) {
    let quantity = 0;
    let totalCost = 0;

    for (const t of sortTrades(h.trades)) {
      const qty = Number(t.quantity);
      const price = Number(t.price);
      const fees = Number(t.fees ?? 0);
      if (!(qty > 0) || !(price >= 0)) continue;

      if (t.side === "Buy") {
        totalCost += qty * price + fees;
        quantity += qty;
      } else if (t.side === "Sell") {
        if (qty > quantity + 1e-9) continue;
        const avg = quantity > 0 ? totalCost / quantity : 0;
        const costSold = avg * qty;
        const proceeds = qty * price - fees;
        const realizedPnl = proceeds - costSold;

        sales.push({
          holdingId: h.id,
          symbol: h.symbol,
          name: h.name,
          market: h.market,
          currency: h.currency,
          tradeDate: toDate(t.tradeDate).toISOString(),
          quantity: qty,
          sellPrice: price,
          fees,
          costBasisPerShare: avg,
          proceeds,
          costSold,
          realizedPnl,
          tradeId: t.id,
        });

        totalCost -= costSold;
        quantity -= qty;
        if (quantity <= 1e-9) {
          quantity = 0;
          totalCost = 0;
        }
      }
    }
  }

  return sales.sort(
    (a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
  );
}

export function buildRealizedSummary(
  sales: RealizedSale[],
  displayCurrency: string,
  rates: Record<string, number>
): RealizedSummary {
  const byYearMap = new Map<number, Record<string, number>>();
  let allTimeTotal = 0;
  let yearToDateTotal = 0;
  const currentYear = new Date().getUTCFullYear();

  for (const s of sales) {
    const year = new Date(s.tradeDate).getUTCFullYear();
    if (!byYearMap.has(year)) byYearMap.set(year, {});
    const row = byYearMap.get(year)!;
    row[s.currency] = (row[s.currency] ?? 0) + s.realizedPnl;

    const converted =
      convertAmount(s.realizedPnl, s.currency, displayCurrency, rates) ?? 0;
    allTimeTotal += converted;
    if (year === currentYear) yearToDateTotal += converted;
  }

  const byYear: YearlyRealized[] = [...byYearMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, byCurrency]) => {
      let total = 0;
      for (const [ccy, amt] of Object.entries(byCurrency)) {
        total += convertAmount(amt, ccy, displayCurrency, rates) ?? 0;
      }
      return { year, byCurrency, total };
    });

  return {
    sales,
    byYear,
    allTimeTotal,
    yearToDateTotal,
    displayCurrency,
  };
}

export function filterSalesByYear(
  sales: RealizedSale[],
  year: number | "all"
): RealizedSale[] {
  if (year === "all") return sales;
  return sales.filter((s) => new Date(s.tradeDate).getUTCFullYear() === year);
}
