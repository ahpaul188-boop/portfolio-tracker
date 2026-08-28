import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireUserId(): Promise<string | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export function isAuthError(
  result: string | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

export async function getUserHolding(holdingId: string, userId: string) {
  return prisma.holding.findFirst({
    where: { id: holdingId, userId },
    include: {
      transactions: { orderBy: [{ tradeDate: "asc" }, { createdAt: "asc" }] },
    },
  });
}
