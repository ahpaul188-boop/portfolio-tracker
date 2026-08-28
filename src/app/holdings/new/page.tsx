import { HoldingForm } from "@/components/HoldingForm";
import { SearchBox } from "@/components/SearchBox";
import { requireUserIdForPage } from "@/lib/auth-utils";
import type { AssetType, Market } from "@/lib/types";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function NewHoldingPage({ searchParams }: Props) {
  await requireUserIdForPage();

  const sp = await searchParams;
  const assetType = (one(sp.assetType) as AssetType) || "Stock";
  const market = (one(sp.market) as Market) || "US";

  return (
    <div className="space-y-6">
      <div className="ui-card max-w-2xl p-4">
        <SearchBox />
      </div>
      <HoldingForm
        mode="create"
        initial={{
          assetType: assetType === "Bond" ? "Bond" : "Stock",
          market: market === "HK" ? "HK" : "US",
          symbol: one(sp.symbol),
          name: one(sp.name),
          costBasis: one(sp.costHint)
            ? Number(one(sp.costHint))
            : undefined,
          currency: one(sp.currency) || (market === "HK" ? "HKD" : "USD"),
          isin: one(sp.isin) || null,
        }}
      />
    </div>
  );
}
