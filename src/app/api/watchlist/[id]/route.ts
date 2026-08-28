import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthError, requireUserId } from "@/lib/auth-utils";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await params;
  const item = await prisma.watchlistItem.findFirst({
    where: { id, userId },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    alertPrice?: number | null;
    alertDirection?: string | null;
  };

  let alertPrice: number | null | undefined = undefined;
  let alertDirection: string | null | undefined = undefined;

  if (body.alertPrice === null || body.alertPrice === undefined) {
    if (body.alertPrice === null) alertPrice = null;
  } else {
    const p = Number(body.alertPrice);
    if (!(p > 0)) {
      return NextResponse.json({ error: "Invalid alert price" }, { status: 400 });
    }
    alertPrice = p;
  }

  if (body.alertDirection === null) {
    alertDirection = null;
  } else if (body.alertDirection !== undefined) {
    if (body.alertDirection !== "above" && body.alertDirection !== "below") {
      return NextResponse.json(
        { error: "alertDirection must be above or below" },
        { status: 400 }
      );
    }
    alertDirection = body.alertDirection;
  }

  const updated = await prisma.watchlistItem.update({
    where: { id },
    data: {
      ...(alertPrice !== undefined ? { alertPrice } : {}),
      ...(alertDirection !== undefined ? { alertDirection } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const { id } = await params;
  const item = await prisma.watchlistItem.findFirst({
    where: { id, userId },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.watchlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
