import { NextResponse } from "next/server";
import { isAuthError, requireUserId } from "@/lib/auth-utils";
import { isAllowedOpenRouterModel } from "@/lib/openrouter-models";
import {
  getUserPreferences,
  normalizeDisplayCurrency,
  updateUserPreferences,
} from "@/lib/user-preferences";
import { openrouterConfigured } from "@/lib/openrouter";

export async function GET() {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const prefs = await getUserPreferences(userId);
  return NextResponse.json({
    ...prefs,
    openrouterConfigured: openrouterConfigured(),
  });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (isAuthError(userId)) return userId;

  const body = (await request.json()) as {
    displayCurrency?: string;
    openrouterModel?: string | null;
    browserNotifyAlerts?: boolean;
  };

  const displayCurrency = body.displayCurrency
    ? normalizeDisplayCurrency(body.displayCurrency)
    : undefined;

  let openrouterModel: string | null | undefined = undefined;
  if (body.openrouterModel !== undefined) {
    if (body.openrouterModel === null || body.openrouterModel === "") {
      openrouterModel = null;
    } else if (!isAllowedOpenRouterModel(body.openrouterModel)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    } else {
      openrouterModel = body.openrouterModel;
    }
  }

  const prefs = await updateUserPreferences(userId, {
    displayCurrency,
    openrouterModel,
    browserNotifyAlerts: body.browserNotifyAlerts,
  });

  return NextResponse.json(prefs);
}
