"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { setLocale } from "@/lib/locale-actions";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <label className="flex w-full items-center gap-1.5 text-sm text-[var(--muted)]">
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Locale)}
        className="ui-input disabled:opacity-60"
        aria-label={t("lang.label")}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </label>
  );
}
