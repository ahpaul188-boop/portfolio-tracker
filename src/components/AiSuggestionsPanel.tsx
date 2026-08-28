"use client";

import { useState } from "react";
import { useI18n } from "@/components/LocaleProvider";

export function AiSuggestionsPanel() {
  const { t } = useI18n();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/suggestions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "INSUFFICIENT_BALANCE"
            ? t("ai.insufficientBalance")
            : data.error === "KEY_LIMIT_EXCEEDED"
              ? t("ai.keyLimitExceeded")
              : data.error === "RATE_LIMITED"
                ? t("ai.rateLimited")
                : data.error || t("ai.loadFailed")
        );
        setSuggestion(null);
        return;
      }
      setSuggestion(data.suggestion ?? "");
      setGeneratedAt(data.generatedAt ?? null);
    } catch {
      setError(t("common.networkError"));
      setSuggestion(null);
    } finally {
      setBusy(false);
    }
  }

  const bullets = suggestion
    ? suggestion
        .split(/\n+/)
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <section className="ui-card flex max-h-[20rem] flex-col p-2 sm:p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <div className="min-w-0">
          <h2 className="ui-section-title">{t("ai.title")}</h2>
          <p className="ui-section-hint">{t("ai.hint")}</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="ui-btn-primary shrink-0 disabled:opacity-60"
        >
          {busy ? t("ai.generating") : t("ai.generate")}
        </button>
      </div>

      {error && (
        <p className="mb-1.5 rounded-md bg-[var(--danger-soft)] px-2 py-1 text-[10px] text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {!suggestion && !busy && !error && (
          <p className="rounded-md border border-dashed border-[var(--line)] px-2 py-3 text-center text-[10px] text-[var(--muted)]">
            {t("ai.empty")}
          </p>
        )}
        {busy && !suggestion && (
          <p className="py-3 text-center text-[11px] text-[var(--muted)]">
            {t("ai.generating")}
          </p>
        )}
        {bullets.length > 0 && (
          <ul className="space-y-1">
            {bullets.map((line, i) => (
              <li
                key={i}
                className="rounded-md bg-[var(--bg-soft)] px-2 py-1.5 text-[11px] leading-snug text-[var(--ink)]"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      {generatedAt && (
        <p className="mt-1 border-t border-[var(--line)] pt-1 text-[9px] text-[var(--muted)]">
          {t("ai.updated")} {new Date(generatedAt).toLocaleString()}
          <span className="block">{t("ai.disclaimer")}</span>
        </p>
      )}
    </section>
  );
}
