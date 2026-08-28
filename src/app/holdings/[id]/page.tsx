import { notFound } from "next/navigation";
import { HoldingForm } from "@/components/HoldingForm";
import { StockChart } from "@/components/StockChart";
import { TradePanel } from "@/components/TradePanel";
import { getUserHolding, requireUserIdForPage } from "@/lib/auth-utils";
import { ensureOpeningTrade } from "@/lib/holdings-sync";
import type { Market } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditHoldingPage({ params }: Props) {
  const userId = await requireUserIdForPage();

  const { id } = await params;
  let holding = await getUserHolding(id, userId);
  if (!holding) notFound();

  if (holding.transactions.length === 0 && holding.quantity > 0) {
    await ensureOpeningTrade(id);
    holding = await getUserHolding(id, userId);
    if (!holding) notFound();
  }

  return (
    <div className="space-y-6">
      {holding.assetType === "Stock" && (
        <StockChart
          symbol={holding.symbol}
          market={holding.market as Market}
          currency={holding.currency}
          name={holding.name}
          costBasis={holding.costBasis}
        />
      )}
      <HoldingForm
        mode="edit"
        lockPositionFields
        initial={{
          id: holding.id,
          assetType: holding.assetType as "Stock" | "Bond",
          market: holding.market as "HK" | "US",
          symbol: holding.symbol,
          isin: holding.isin,
          name: holding.name,
          quantity: holding.quantity,
          costBasis: holding.costBasis,
          manualPrice: holding.manualPrice,
          currency: holding.currency,
          couponRate: holding.couponRate,
          maturityDate: holding.maturityDate
            ? holding.maturityDate.toISOString()
            : null,
          purchasedAt: holding.purchasedAt
            ? holding.purchasedAt.toISOString()
            : holding.createdAt.toISOString(),
          notes: holding.notes,
        }}
      />
      <TradePanel
        holdingId={holding.id}
        currency={holding.currency}
        initialTrades={holding.transactions.map((t) => ({
          id: t.id,
          side: t.side,
          tradeDate: t.tradeDate.toISOString(),
          quantity: t.quantity,
          price: t.price,
          fees: t.fees,
          notes: t.notes,
        }))}
      />
    </div>
  );
}
