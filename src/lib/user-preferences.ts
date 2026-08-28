import { prisma } from "@/lib/db";

export type DisplayCurrency = "USD" | "HKD";

export type UserPrefs = {
  displayCurrency: DisplayCurrency;
  openrouterModel: string | null;
};

const DEFAULT_PREFS: UserPrefs = {
  displayCurrency: "USD",
  openrouterModel: null,
};

export async function getUserPreferences(userId: string): Promise<UserPrefs> {
  let row = await prisma.userPreferences.findUnique({ where: { userId } });
  if (!row) {
    row = await prisma.userPreferences.create({
      data: { userId, displayCurrency: "USD" },
    });
  }
  return {
    displayCurrency:
      row.displayCurrency === "HKD" ? "HKD" : "USD",
    openrouterModel: row.openrouterModel,
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
    },
  });
  return {
    displayCurrency: row.displayCurrency === "HKD" ? "HKD" : "USD",
    openrouterModel: row.openrouterModel,
  };
}

export function normalizeDisplayCurrency(value: string | null | undefined): DisplayCurrency {
  return value === "HKD" ? "HKD" : "USD";
}

export { DEFAULT_PREFS };
