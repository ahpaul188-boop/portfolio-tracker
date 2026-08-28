"use client";

import Link from "next/link";
import { useI18n } from "@/components/LocaleProvider";
import type { BondReminder } from "@/lib/bond-reminders";

type Props = {
  reminders: BondReminder[];
};

export function BondRemindersPanel({ reminders }: Props) {
  const { t, formatDate } = useI18n();

  if (!reminders.length) return null;

  return (
    <section className="ui-card p-2 sm:p-2.5">
      <div className="mb-1.5">
        <h2 className="ui-section-title">{t("bondReminders.title")}</h2>
        <p className="ui-section-hint">{t("bondReminders.hint")}</p>
      </div>
      <ul className="space-y-1">
        {reminders.map((r) => (
          <li
            key={`${r.holdingId}-${r.kind}-${r.date}`}
            className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ${
              r.severity === "warning"
                ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                : "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-medium">
                {r.kind === "maturity"
                  ? t("bondReminders.maturity")
                  : t("bondReminders.coupon", {
                      rate: String(r.couponRate ?? ""),
                    })}
              </span>
              <span className="tabular-nums">
                {r.daysUntil === 0
                  ? t("bondReminders.today")
                  : t("bondReminders.inDays", { n: String(r.daysUntil) })}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] opacity-90">
              <Link
                href={`/holdings/${r.holdingId}`}
                className="underline underline-offset-2"
              >
                {r.name} ({r.symbol})
              </Link>
              {" · "}
              {formatDate(r.date, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
