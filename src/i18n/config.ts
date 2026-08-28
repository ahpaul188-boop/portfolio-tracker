export const LOCALES = ["en", "zh-Hant", "zh-Hans"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-Hant": "繁體中文",
  "zh-Hans": "简体中文",
};

export const LOCALE_BCP47: Record<Locale, string> = {
  en: "en-US",
  "zh-Hant": "zh-TW",
  "zh-Hans": "zh-CN",
};

export function isValidLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}
