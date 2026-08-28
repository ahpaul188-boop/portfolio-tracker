import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

async function userExists(userId: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { id: userId } });
  return count > 0;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** For API routes — returns 401 if missing or stale session. */
export async function requireUserId(): Promise<string | NextResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userExists(userId))) {
    return NextResponse.json(
      { error: "Session expired", code: "STALE_SESSION" },
      { status: 401 }
    );
  }
  return userId;
}

/** For server pages — redirects to login; clears stale JWT after DB reset/migration. */
export async function requireUserIdForPage(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  if (!(await userExists(userId))) {
    redirect("/api/auth/stale-session");
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
