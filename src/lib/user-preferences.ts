import { prisma } from "@/lib/db";

export type DisplayCurrency = "USD" | "HKD";

export type UserPrefs = {
  displayCurrency: DisplayCurrency;
  openrouterModel: string | null;
  browserNotifyAlerts: boolean;
};

const DEFAULT_PREFS: UserPrefs = {
  displayCurrency: "USD",
  openrouterModel: null,
  browserNotifyAlerts: false,
};

export async function getUserPreferences(userId: string): Promise<UserPrefs> {
  let row = await prisma.userPreferences.findUnique({ where: { userId } });
  if (!row) {
    const exists = await prisma.user.count({ where: { id: userId } });
    if (!exists) return DEFAULT_PREFS;

    row = await prisma.userPreferences.create({
      data: { userId, displayCurrency: "USD" },
    });
  }
  return {
    displayCurrency:
      row.displayCurrency === "HKD" ? "HKD" : "USD",
    openrouterModel: row.openrouterModel,
    browserNotifyAlerts: row.browserNotifyAlerts,
  };
}

export async function updateUserPreferences(
  userId: string,
  data: Partial<UserPrefs>
): Promise<UserPrefs> {
  await getUserPreferences(userId);
  const row = await prisma.userPreferences.update({
    where: { userId },
    data: {
      ...(data.displayCurrency
        ? { displayCurrency: data.displayCurrency }
        : {}),
      ...(data.openrouterModel !== undefined
        ? { openrouterModel: data.openrouterModel }
        : {}),
      ...(data.browserNotifyAlerts !== undefined
        ? { browserNotifyAlerts: data.browserNotifyAlerts }
        : {}),
    },
  });
  return {
    displayCurrency: row.displayCurrency === "HKD" ? "HKD" : "USD",
    openrouterModel: row.openrouterModel,
    browserNotifyAlerts: row.browserNotifyAlerts,
  };
}

export function normalizeDisplayCurrency(value: string | null | undefined): DisplayCurrency {
  return value === "HKD" ? "HKD" : "USD";
}

export { DEFAULT_PREFS };
