import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { normalizeSymbol, validateHolding, type HoldingInput } from "@/lib/types";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: [{ market: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(holdings);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const body = (await request.json()) as Partial<HoldingInput>;
  const error = validateHolding(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const market = body.market!;
  const symbol = normalizeSymbol(body.symbol!, market);
  const quantity = Number(body.quantity);
  const costBasis = Number(body.costBasis);
  const purchasedAt = body.purchasedAt ? new Date(body.purchasedAt) : new Date();

  const holding = await prisma.holding.create({
    data: {
      userId,
      assetType: body.assetType!,
      market,
      symbol,
      isin: body.isin?.trim() || null,
      name: body.name!.trim(),
      quantity,
      costBasis,
      manualPrice: body.manualPrice != null ? Number(body.manualPrice) : null,
      currency: body.currency!.trim().toUpperCase(),
      couponRate: body.couponRate != null ? Number(body.couponRate) : null,
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
      purchasedAt,
      notes: body.notes?.trim() || null,
      transactions: {
        create: {
          side: "Buy",
          tradeDate: purchasedAt,
          quantity,
          price: costBasis,
          fees: 0,
          notes: "Opening buy",
        },
      },
    },
    include: { transactions: true },
  });

  return NextResponse.json(holding, { status: 201 });
}
