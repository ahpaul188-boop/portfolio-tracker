import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale, type Locale } from "./config";
import { getDictionary } from "./messages";

export { getDictionary, localeToHtmlLang } from "./messages";
export type { Messages, Translator } from "./messages";
export { createTranslator } from "./messages";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, messages: getDictionary(locale) };
}
