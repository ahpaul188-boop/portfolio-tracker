import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { isBrokerId } from "@/lib/import-brokers";
import { parseHoldingsCsv } from "@/lib/import-csv";
import { normalizeSymbol } from "@/lib/types";
import type { Market } from "@/lib/types";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const brokerRaw = form.get("broker");
  const brokerStr = String(brokerRaw ?? "");
  const broker = isBrokerId(brokerStr) ? brokerStr : "generic";

  const text = await file.text();
  const parsed = parseHoldingsCsv(text, broker);
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const row of parsed.rows) {
    const market = row.market as Market;
    const symbol = normalizeSymbol(row.symbol, market);

    const existing = await prisma.holding.findFirst({
      where: { userId, market, symbol },
    });
    if (existing) {
      skipped.push(`${symbol} (${market})`);
      continue;
    }

    try {
      const purchasedAt = row.purchasedAt
        ? new Date(row.purchasedAt)
        : new Date();

      await prisma.holding.create({
        data: {
          userId,
          assetType: row.assetType,
          market,
          symbol,
          isin: row.isin?.trim() || null,
          name: row.name.trim(),
          quantity: row.quantity,
          costBasis: row.costBasis,
          manualPrice: row.manualPrice ?? null,
          currency: row.currency.trim().toUpperCase(),
          couponRate: row.couponRate ?? null,
          maturityDate: row.maturityDate ? new Date(row.maturityDate) : null,
          purchasedAt,
          notes: row.notes?.trim() || null,
          transactions: {
            create: {
              side: "Buy",
              tradeDate: purchasedAt,
              quantity: row.quantity,
              price: row.costBasis,
              fees: 0,
              notes: "Imported buy",
            },
          },
        },
      });
      created.push(`${symbol} (${market})`);
    } catch (e) {
      errors.push(
        `Row ${row.row}: ${e instanceof Error ? e.message : "import failed"}`
      );
    }
  }

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    errors,
    createdSymbols: created,
    skippedSymbols: skipped,
  });
}
