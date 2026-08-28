"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { OPENROUTER_MODEL_OPTIONS } from "@/lib/openrouter-models";
import { formatMoney } from "@/lib/format";

type TriggeredAlert = {
  id: string;
  symbol: string;
  name: string;
  market: string;
  currency: string;
  alertPrice: number;
  alertDirection: string;
  currentPrice: number | null;
};

export function PriceAlertsBanner() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);

  useEffect(() => {
    fetch("/api/watchlist/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.triggered ?? []))
      .catch(() => setAlerts([]));
  }, []);

  if (!alerts.length) return null;

  return (
    <section className="ui-card border-[var(--accent)] bg-[var(--accent-soft)] p-2 sm:p-2.5">
      <h2 className="ui-section-title text-[var(--accent-deep)]">
        {t("alerts.triggeredTitle")}
      </h2>
      <ul className="mt-1 space-y-1">
        {alerts.map((a) => (
          <li
            key={a.id}
            className="rounded-md bg-white/80 px-2 py-1.5 text-[11px] text-[var(--ink)]"
          >
            <span className="font-medium">{a.name}</span> ({a.symbol}) —{" "}
            {a.alertDirection === "above"
              ? t("alerts.above")
              : t("alerts.below")}{" "}
            {formatMoney(a.alertPrice, a.currency)}
            {a.currentPrice != null && (
              <span className="ml-1 text-[var(--muted)]">
                ({t("alerts.now")} {formatMoney(a.currentPrice, a.currency)})
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
