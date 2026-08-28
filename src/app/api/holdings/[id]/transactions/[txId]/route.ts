import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserHolding,
  isAuthError,
  requireUserId,
} from "@/lib/auth-utils";
import { computePosition } from "@/lib/ledger";
import { syncHoldingFromTrades, tradesToRows } from "@/lib/holdings-sync";

type Ctx = { params: Promise<{ id: string; txId: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id, txId } = await ctx.params;
  const holding = await getUserHolding(id, userId);
  if (!holding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = holding.transactions.find((t) => t.id === txId);
  if (!existing) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  const remaining = holding.transactions.filter((t) => t.id !== txId);
  try {
    if (remaining.length > 0) computePosition(tradesToRows(remaining));
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Cannot delete this trade (would make sells exceed buys)",
      },
      { status: 400 }
    );
  }

  await prisma.transaction.delete({ where: { id: txId } });
  await syncHoldingFromTrades(id);
  const updated = await prisma.holding.findUnique({ where: { id } });

  return NextResponse.json({ ok: true, holding: updated });
}
