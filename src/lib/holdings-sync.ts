import { prisma } from "@/lib/db";
import { computePosition, type TradeRow } from "@/lib/ledger";

export function tradesToRows(
  trades: {
    id?: string;
    side: string;
    tradeDate: Date | string;
    quantity: number;
    price: number;
    fees?: number | null;
    notes?: string | null;
  }[]
): TradeRow[] {
  return trades.map((t) => ({
    id: t.id,
    side: t.side as "Buy" | "Sell",
    tradeDate: t.tradeDate,
    quantity: t.quantity,
    price: t.price,
    fees: t.fees ?? 0,
    notes: t.notes,
  }));
}

/** Recompute holding quantity / avg cost / purchasedAt from its trades */
export async function syncHoldingFromTrades(holdingId: string) {
  const trades = await prisma.transaction.findMany({
    where: { holdingId },
    orderBy: [{ tradeDate: "asc" }, { createdAt: "asc" }],
  });

  if (trades.length === 0) {
    await prisma.holding.update({
      where: { id: holdingId },
      data: { quantity: 0, costBasis: 0 },
    });
    return { quantity: 0, avgCost: 0, totalCost: 0, firstBuyDate: null };
  }

  const position = computePosition(tradesToRows(trades));
  await prisma.holding.update({
    where: { id: holdingId },
    data: {
      quantity: position.quantity,
      costBasis: position.avgCost,
      purchasedAt: position.firstBuyDate,
    },
  });
  return position;
}

/** If holding has qty but no trades, create an opening Buy so ledger is consistent */
export async function ensureOpeningTrade(holdingId: string) {
  const holding = await prisma.holding.findUnique({
    where: { id: holdingId },
    include: { transactions: true },
  });
  if (!holding) return null;
  if (holding.transactions.length > 0) return holding;
  if (holding.quantity <= 0) return holding;

  await prisma.transaction.create({
    data: {
      holdingId,
      side: "Buy",
      tradeDate: holding.purchasedAt ?? holding.createdAt,
      quantity: holding.quantity,
      price: holding.costBasis,
      fees: 0,
      notes: "Opening balance",
    },
  });
  return prisma.holding.findUnique({
    where: { id: holdingId },
    include: { transactions: { orderBy: [{ tradeDate: "asc" }, { createdAt: "asc" }] } },
  });
}
