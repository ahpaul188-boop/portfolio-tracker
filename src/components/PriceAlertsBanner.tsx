"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
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

const POLL_MS = 60_000;

export function PriceAlertsBanner() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());
  const notifyEnabledRef = useRef(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        notifyEnabledRef.current = !!d.browserNotifyAlerts;
      })
      .catch(() => {
        notifyEnabledRef.current = false;
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/watchlist/alerts");
        const d = await res.json();
        if (cancelled) return;
        const triggered = (d.triggered ?? []) as TriggeredAlert[];
        setAlerts(triggered);

        if (
          notifyEnabledRef.current &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          for (const a of triggered) {
            if (notifiedRef.current.has(a.id)) continue;
            notifiedRef.current.add(a.id);
            const dir =
              a.alertDirection === "above"
                ? t("alerts.above")
                : t("alerts.below");
            new Notification(t("alerts.notificationTitle"), {
              body: t("alerts.notificationBody", {
                name: a.name,
                symbol: a.symbol,
                direction: dir,
                price: formatMoney(a.alertPrice, a.currency),
              }),
              tag: `alert-${a.id}`,
            });
          }
        }
      } catch {
        if (!cancelled) setAlerts([]);
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [t]);

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
