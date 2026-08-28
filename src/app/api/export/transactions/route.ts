import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { csvAttachmentResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const transactions = await prisma.transaction.findMany({
    where: { holding: { userId } },
    include: {
      holding: {
        select: {
          symbol: true,
          name: true,
          market: true,
          assetType: true,
          currency: true,
        },
      },
    },
    orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }],
  });

  const csv = toCsv(
    [
      "tradeDate",
      "side",
      "symbol",
      "name",
      "market",
      "assetType",
      "currency",
      "quantity",
      "price",
      "fees",
      "notes",
    ],
    transactions.map((tx) => [
      tx.tradeDate.toISOString().slice(0, 10),
      tx.side,
      tx.holding.symbol,
      tx.holding.name,
      tx.holding.market,
      tx.holding.assetType,
      tx.holding.currency,
      tx.quantity,
      tx.price,
      tx.fees,
      tx.notes,
    ])
  );

  return csvAttachmentResponse("transactions.csv", csv);
}
