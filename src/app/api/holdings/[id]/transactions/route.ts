import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserHolding,
  isAuthError,
  requireUserId,
} from "@/lib/auth-utils";
import { computePosition, validateTradeInput, type TradeInput } from "@/lib/ledger";
import { syncHoldingFromTrades, tradesToRows } from "@/lib/holdings-sync";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await ctx.params;
  const holding = await getUserHolding(id, userId);
  if (!holding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { holdingId: id },
    orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ transactions, holding });
}

export async function POST(request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await ctx.params;
  const holding = await getUserHolding(id, userId);
  if (!holding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<TradeInput>;
  const error = validateTradeInput(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const nextTrades = tradesToRows([
    ...holding.transactions,
    {
      side: body.side!,
      tradeDate: body.tradeDate!,
      quantity: Number(body.quantity),
      price: Number(body.price),
      fees: body.fees != null ? Number(body.fees) : 0,
      notes: body.notes ?? null,
    },
  ]);

  try {
    computePosition(nextTrades);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid trade" },
      { status: 400 }
    );
  }

  const tx = await prisma.transaction.create({
    data: {
      holdingId: id,
      side: body.side!,
      tradeDate: new Date(body.tradeDate!),
      quantity: Number(body.quantity),
      price: Number(body.price),
      fees: body.fees != null ? Number(body.fees) : 0,
      notes: body.notes?.toString().trim() || null,
    },
  });

  const position = await syncHoldingFromTrades(id);
  const updated = await prisma.holding.findUnique({ where: { id } });

  return NextResponse.json(
    { transaction: tx, holding: updated, position },
    { status: 201 }
  );
}
