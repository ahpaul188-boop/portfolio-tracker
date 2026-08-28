"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { OPENROUTER_MODEL_OPTIONS } from "@/lib/openrouter-models";

export function SettingsForm() {
  const { t } = useI18n();
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [openrouterModel, setOpenrouterModel] = useState("");
  const [browserNotifyAlerts, setBrowserNotifyAlerts] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setDisplayCurrency(d.displayCurrency ?? "USD");
        setOpenrouterModel(d.openrouterModel ?? "");
        setBrowserNotifyAlerts(!!d.browserNotifyAlerts);
        setAiConfigured(!!d.openrouterConfigured);
      })
      .catch(() => setError(t("settings.loadFailed")))
      .finally(() => setBusy(false));
  }, [t]);

  async function requestNotificationPermission() {
    if (typeof Notification === "undefined") {
      setError(t("settings.browserNotifyUnsupported"));
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      setError(t("settings.browserNotifyDenied"));
      return false;
    }
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      setError(t("settings.browserNotifyDenied"));
      return false;
    }
    return true;
  }

  async function onNotifyToggle(checked: boolean) {
    if (checked) {
      const ok = await requestNotificationPermission();
      if (!ok) return;
    }
    setBrowserNotifyAlerts(checked);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayCurrency,
          openrouterModel: openrouterModel || null,
          browserNotifyAlerts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("settings.saveFailed"));
        return;
      }
      setMessage(t("settings.saved"));
    } catch {
      setError(t("common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  if (busy) {
    return (
      <p className="text-sm text-[var(--muted)]">{t("settings.loading")}</p>
    );
  }

  return (
    <form onSubmit={save} className="ui-card max-w-lg space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--ink)]">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.hint")}</p>
      </div>

      <label className="block text-sm font-medium">
        {t("settings.displayCurrency")}
        <select
          value={displayCurrency}
          onChange={(e) => setDisplayCurrency(e.target.value)}
          className="ui-input mt-1.5"
        >
          <option value="USD">USD</option>
          <option value="HKD">HKD</option>
        </select>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("settings.displayCurrencyHint")}
        </p>
      </label>

      <label className="flex items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={browserNotifyAlerts}
          onChange={(e) => onNotifyToggle(e.target.checked)}
          className="mt-1"
        />
        <span>
          {t("settings.browserNotifyAlerts")}
          <p className="mt-0.5 text-xs font-normal text-[var(--muted)]">
            {t("settings.browserNotifyHint")}
          </p>
        </span>
      </label>

      {aiConfigured && (
        <label className="block text-sm font-medium">
          {t("settings.aiModel")}
          <select
            value={openrouterModel}
            onChange={(e) => setOpenrouterModel(e.target.value)}
            className="ui-input mt-1.5"
          >
            <option value="">{t("settings.aiModelDefault")}</option>
            {OPENROUTER_MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t("settings.aiModelHint")}
          </p>
        </label>
      )}

      {error && (
        <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-md bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)]">
          {message}
        </p>
      )}

      <button type="submit" disabled={saving} className="ui-btn-primary">
        {saving ? t("common.saving") : t("common.save")}
      </button>
    </form>
  );
}
