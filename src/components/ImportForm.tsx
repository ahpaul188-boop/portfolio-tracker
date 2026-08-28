"use client";

import { useState } from "react";
import { useI18n } from "@/components/LocaleProvider";

export function ImportForm() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/import/holdings", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          Array.isArray(data.errors)
            ? data.errors.join("; ")
            : data.error || t("import.failed")
        );
        return;
      }
      setResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      if (data.created > 0) {
        form.reset();
      }
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="ui-card p-4 sm:p-6">
        <h1 className="text-lg font-semibold">{t("import.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("import.hint")}</p>

        <a
          href="/api/import/template"
          className="mt-3 inline-block text-sm font-medium text-[var(--accent-deep)] hover:underline"
          download
        >
          {t("import.downloadTemplate")}
        </a>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            {t("import.fileLabel")}
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="ui-input mt-1.5"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="ui-btn-primary ui-touch-target"
          >
            {busy ? t("import.uploading") : t("import.upload")}
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-3 rounded-md bg-[var(--bg-soft)] px-3 py-2 text-sm">
            <p>
              {t("import.created", { n: String(result.created) })}
              {result.skipped > 0 &&
                ` · ${t("import.skipped", { n: String(result.skipped) })}`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs text-[var(--danger)]">
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
            {result.created > 0 && (
              <a href="/" className="mt-2 inline-block text-[var(--accent-deep)] hover:underline">
                {t("import.viewPortfolio")}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
