export type Market = "HK" | "US";
export type AssetType = "Stock" | "Bond";

export type HoldingInput = {
  assetType: AssetType;
  market: Market;
  symbol: string;
  isin?: string | null;
  name: string;
  quantity: number;
  costBasis: number;
  manualPrice?: number | null;
  currency: string;
  couponRate?: number | null;
  maturityDate?: string | null;
  purchasedAt?: string | null;
  notes?: string | null;
};

export function normalizeSymbol(symbol: string, market: Market): string {
  const raw = symbol.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return raw;

  if (market === "HK") {
    if (raw.endsWith(".HK")) return raw;
    const digits = raw.replace(/\.HK$/i, "").replace(/^0+/, "") || "0";
    return `${digits.padStart(4, "0")}.HK`;
  }

  return raw.replace(/\.US$/i, "");
}

export function validateHolding(body: Partial<HoldingInput>): string | null {
  if (!body.assetType || !["Stock", "Bond"].includes(body.assetType)) {
    return "assetType must be Stock or Bond";
  }
  if (!body.market || !["HK", "US"].includes(body.market)) {
    return "market must be HK or US";
  }
  if (!body.symbol?.trim()) return "symbol is required";
  if (!body.name?.trim()) return "name is required";
  if (body.quantity == null || Number(body.quantity) <= 0) {
    return "quantity must be > 0";
  }
  if (body.costBasis == null || Number(body.costBasis) < 0) {
    return "average cost per unit must be >= 0";
  }
  if (!body.currency?.trim()) return "currency is required";
  if (body.assetType === "Bond" && body.manualPrice == null) {
    return "manualPrice is required for bonds";
  }
  if (body.purchasedAt) {
    const d = new Date(body.purchasedAt);
    if (Number.isNaN(d.getTime())) return "purchasedAt must be a valid date";
  }
  return null;
}
