import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALE_COOKIE,
  type Locale,
  isValidLocale,
} from "./config";
import { en, type Messages } from "./locales/en";
import { zhHans } from "./locales/zh-Hans";
import { zhHant } from "./locales/zh-Hant";

const dictionaries: Record<Locale, Messages> = {
  en,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
};

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function localeToHtmlLang(locale: Locale): string {
  return LOCALE_BCP47[locale];
}

export function formatLocaleDateTime(
  locale: Locale,
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleString(LOCALE_BCP47[locale], options);
}

export function formatLocaleDate(
  locale: Locale,
  value: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(value).toLocaleDateString(LOCALE_BCP47[locale], options);
}

type Params = Record<string, string | number>;

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function createTranslator(messages: Messages) {
  return function t(key: string, params?: Params): string {
    const raw = getNestedValue(messages, key);
    if (typeof raw !== "string") return key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(params[name] ?? `{${name}}`)
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;

export { en, type Messages };
