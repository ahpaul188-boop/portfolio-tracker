"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  createTranslator,
  formatLocaleDate,
  formatLocaleDateTime,
  type Messages,
  type Translator,
} from "@/i18n/messages";
import { LOCALE_BCP47, type Locale } from "@/i18n/config";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: Translator;
  formatDateTime: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatDate: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type Props = {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
};

export function LocaleProvider({ locale, messages, children }: Props) {
  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(messages);
    return {
      locale,
      messages,
      t,
      formatDateTime: (value, options) =>
        formatLocaleDateTime(locale, value, options),
      formatDate: (value, options) => formatLocaleDate(locale, value, options),
    };
  }, [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}

export function useAssetTypeLabel(assetType: string): string {
  const { t } = useI18n();
  if (assetType === "Bond") return t("asset.bond");
  if (assetType === "Stock") return t("asset.stock");
  return assetType;
}

export function useTradeSideLabel(side: string): string {
  const { t } = useI18n();
  if (side === "Buy") return t("trades.buy");
  if (side === "Sell") return t("trades.sell");
  return side;
}

export { LOCALE_BCP47 };
