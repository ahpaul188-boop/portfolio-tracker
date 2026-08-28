import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserHolding,
  isAuthError,
  requireUserId,
} from "@/lib/auth-utils";
import { syncHoldingFromTrades } from "@/lib/holdings-sync";
import { normalizeSymbol, validateHolding, type HoldingInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await ctx.params;
  const holding = await getUserHolding(id, userId);
  if (!holding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(holding);
}

export async function PUT(request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await ctx.params;
  const existing = await getUserHolding(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<HoldingInput>;
  const error = validateHolding(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const market = body.market!;
  const symbol = normalizeSymbol(body.symbol!, market);
  const hasTrades = existing.transactions.length > 0;

  await prisma.holding.update({
    where: { id },
    data: {
      assetType: body.assetType!,
      market,
      symbol,
      isin: body.isin?.trim() || null,
      name: body.name!.trim(),
      ...(hasTrades
        ? {}
        : {
            quantity: Number(body.quantity),
            costBasis: Number(body.costBasis),
            purchasedAt: body.purchasedAt
              ? new Date(body.purchasedAt)
              : null,
          }),
      manualPrice: body.manualPrice != null ? Number(body.manualPrice) : null,
      currency: body.currency!.trim().toUpperCase(),
      couponRate: body.couponRate != null ? Number(body.couponRate) : null,
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
      notes: body.notes?.trim() || null,
    },
  });

  if (hasTrades) {
    await syncHoldingFromTrades(id);
  }

  const holding = await prisma.holding.findUnique({ where: { id } });
  return NextResponse.json(holding);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await ctx.params;
  const existing = await getUserHolding(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.holding.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
