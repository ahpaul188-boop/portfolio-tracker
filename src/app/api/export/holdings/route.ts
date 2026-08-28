import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { csvAttachmentResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: [{ market: "asc" }, { name: "asc" }],
  });

  const csv = toCsv(
    [
      "assetType",
      "market",
      "symbol",
      "name",
      "isin",
      "quantity",
      "costBasis",
      "manualPrice",
      "currency",
      "couponRate",
      "maturityDate",
      "purchasedAt",
      "notes",
    ],
    holdings.map((h) => [
      h.assetType,
      h.market,
      h.symbol,
      h.name,
      h.isin,
      h.quantity,
      h.costBasis,
      h.manualPrice,
      h.currency,
      h.couponRate,
      h.maturityDate?.toISOString().slice(0, 10) ?? "",
      h.purchasedAt?.toISOString().slice(0, 10) ?? "",
      h.notes,
    ])
  );

  return csvAttachmentResponse("holdings.csv", csv);
}
