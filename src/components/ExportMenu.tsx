"use client";

import { useI18n } from "@/components/LocaleProvider";

export function ExportMenu() {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap gap-1">
      <a
        href="/api/export/holdings"
        className="ui-filter-btn border border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--bg-soft)]"
        download
      >
        {t("export.holdings")}
      </a>
      <a
        href="/api/export/transactions"
        className="ui-filter-btn border border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--bg-soft)]"
        download
      >
        {t("export.transactions")}
      </a>
    </div>
  );
}
