"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { SearchBox } from "@/components/SearchBox";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney } from "@/lib/format";
import type { SearchHit } from "@/lib/quotes";
import type { Market } from "@/lib/types";

type WatchItem = {
  id: string;
  market: string;
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
  quoteCurrency: string;
  alertPrice: number | null;
  alertDirection: string | null;
  createdAt: string;
};

export function WatchlistPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertEditId, setAlertEditId] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("watchlist.loadFailed"));
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addFromSearch(hit: SearchHit) {
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: hit.symbol,
          market: hit.market,
          name: hit.name,
          currency: hit.currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("watchlist.addFailed"));
        return;
      }
      await load();
    } catch {
      setError(t("common.networkError"));
    }
  }

  function startAlertEdit(item: WatchItem) {
    setAlertEditId(item.id);
    setAlertPrice(item.alertPrice != null ? String(item.alertPrice) : "");
    setAlertDirection(
      item.alertDirection === "below" ? "below" : "above"
    );
  }

  async function saveAlert(id: string) {
    setError(null);
    const price = Number(alertPrice);
    if (!(price > 0)) {
      setError(t("alerts.invalidPrice"));
      return;
    }
    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertPrice: price,
          alertDirection,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("alerts.saveFailed"));
        return;
      }
      setAlertEditId(null);
      await load();
    } catch {
      setError(t("common.networkError"));
    }
  }

  async function clearAlert(id: string) {
    try {
      await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertPrice: null, alertDirection: null }),
      });
      setAlertEditId(null);
      await load();
    } catch {
      setError(t("common.networkError"));
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("watchlist.removeFailed"));
        return;
      }
      setItems((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setError(t("common.networkError"));
    }
  }

  function addToPortfolio(item: WatchItem) {
    const params = new URLSearchParams({
      assetType: "Stock",
      market: item.market,
      symbol: item.symbol,
      name: item.name,
      currency: item.currency,
    });
    if (item.price != null) {
      params.set("costHint", String(item.price));
    }
    window.location.href = `/holdings/new?${params.toString()}`;
  }

  return (
    <section className="ui-card flex max-h-[18rem] flex-col p-2 sm:p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <h2 className="ui-section-title">{t("watchlist.title")}</h2>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="ui-btn-ghost shrink-0 px-1.5 py-0.5 text-[10px] disabled:opacity-60"
        >
          {busy ? "…" : t("common.refresh")}
        </button>
      </div>

      <SearchBox navigateOnSelect={false} onSelect={addFromSearch} />

      {error && (
        <p className="mt-1.5 rounded-md bg-[var(--danger-soft)] px-2 py-1 text-[10px] text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-1.5 flex-1 overflow-y-auto">
        {busy && items.length === 0 && (
          <p className="py-3 text-center text-[11px] text-[var(--muted)]">
            {t("watchlist.loading")}
          </p>
        )}
        {!busy && items.length === 0 && (
          <p className="rounded-md border border-dashed border-[var(--line)] px-2 py-3 text-center text-[10px] text-[var(--muted)]">
            {t("watchlist.empty")}
          </p>
        )}
        <table className="ui-table hidden sm:table">
          <thead>
            <tr>
              <th>{t("table.name")}</th>
              <th>{t("table.price")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-[var(--line)] hover:bg-[var(--bg-soft)]"
              >
                <td>
                  <div className="flex items-center gap-1">
                    <MarketBadge market={item.market as Market} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {item.name}
                      </p>
                      <p className="truncate text-[9px] text-[var(--muted)]">
                        {item.symbol}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="tabular-nums font-medium">
                  {item.price != null
                    ? formatMoney(item.price, item.quoteCurrency)
                    : t("common.dash")}
                </td>
                <td className="text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startAlertEdit(item)}
                    className="mr-0.5 text-[9px] text-[var(--accent-deep)] hover:underline"
                    title={t("alerts.set")}
                  >
                    {item.alertPrice != null ? "🔔" : "○"}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToPortfolio(item)}
                    className="ui-btn-primary mr-0.5 px-1.5 py-0.5 text-[9px]"
                  >
                    {t("watchlist.buy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="text-[9px] text-[var(--danger)] hover:underline"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1.5 sm:hidden">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-md border border-[var(--line)] bg-[var(--bg-soft)] p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <MarketBadge market={item.market as Market} />
                    <p className="truncate text-[11px] font-medium">{item.name}</p>
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">{item.symbol}</p>
                </div>
                <p className="shrink-0 text-[11px] font-medium tabular-nums">
                  {item.price != null
                    ? formatMoney(item.price, item.quoteCurrency)
                    : t("common.dash")}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => startAlertEdit(item)}
                  className="ui-touch-target ui-btn-ghost px-2 py-1 text-[10px]"
                >
                  {item.alertPrice != null ? t("alerts.edit") : t("alerts.set")}
                </button>
                <button
                  type="button"
                  onClick={() => addToPortfolio(item)}
                  className="ui-touch-target ui-btn-primary px-2 py-1 text-[10px]"
                >
                  {t("watchlist.buy")}
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="ui-touch-target px-2 py-1 text-[10px] text-[var(--danger)]"
                >
                  {t("watchlist.remove")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {alertEditId && (
          <div className="mt-2 rounded-md border border-[var(--line)] bg-white p-2">
            <p className="mb-1.5 text-[10px] font-medium">{t("alerts.set")}</p>
            <div className="flex flex-wrap items-end gap-1.5">
              <label className="text-[10px]">
                {t("alerts.price")}
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  className="ui-input mt-0.5 w-24"
                />
              </label>
              <select
                value={alertDirection}
                onChange={(e) =>
                  setAlertDirection(e.target.value as "above" | "below")
                }
                className="ui-input text-[10px]"
              >
                <option value="above">{t("alerts.above")}</option>
                <option value="below">{t("alerts.below")}</option>
              </select>
              <button
                type="button"
                onClick={() => saveAlert(alertEditId)}
                className="ui-btn-primary px-2 py-1 text-[10px]"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={() => clearAlert(alertEditId)}
                className="ui-btn-ghost px-2 py-1 text-[10px]"
              >
                {t("alerts.clear")}
              </button>
              <button
                type="button"
                onClick={() => setAlertEditId(null)}
                className="ui-btn-ghost px-2 py-1 text-[10px]"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
