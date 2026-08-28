"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { formatMoney } from "@/lib/format";

export type TradeDto = {
  id: string;
  side: string;
  tradeDate: string;
  quantity: number;
  price: number;
  fees: number;
  notes: string | null;
};

type Props = {
  holdingId: string;
  currency: string;
  initialTrades: TradeDto[];
};

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TradePanel({ holdingId, currency, initialTrades }: Props) {
  const { t, formatDate } = useI18n();
  const [trades] = useState(initialTrades);
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [tradeDate, setTradeDate] = useState(todayInput);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const field = "ui-input mt-1";
  const label =
    "block text-xs font-medium uppercase tracking-wide text-[var(--muted)]";

  const sorted = useMemo(
    () =>
      [...trades].sort(
        (a, b) =>
          new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime()
      ),
    [trades]
  );

  function sideLabel(value: string): string {
    if (value === "Buy") return t("trades.buy");
    if (value === "Sell") return t("trades.sell");
    return value;
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/holdings/${holdingId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side,
          tradeDate,
          quantity: Number(quantity),
          price: Number(price),
          fees: fees === "" ? 0 : Number(fees),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("trades.addFailed"));
        return;
      }
      window.location.reload();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(txId: string) {
    if (!confirm(t("trades.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/holdings/${holdingId}/transactions/${txId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("trades.deleteFailed"));
        return;
      }
      window.location.reload();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ui-card max-w-2xl space-y-4 p-5 sm:p-6">
      <div>
        <h2
          className="text-2xl font-semibold text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {t("trades.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("trades.hint")}</p>
      </div>

      <form
        onSubmit={onAdd}
        className="space-y-3 border-b border-[var(--line)] pb-4"
      >
        <div className="flex flex-wrap gap-2">
          {(["Buy", "Sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                side === s
                  ? s === "Buy"
                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                    : "bg-[var(--danger-soft)] text-[var(--danger)]"
                  : "border border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {sideLabel(s)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>{t("trades.tradeDate")}</label>
            <input
              className={field}
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>{t("trades.quantity")}</label>
            <input
              className={field}
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>{t("trades.price")}</label>
            <input
              className={field}
              type="number"
              step="any"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={label}>{t("trades.fees")}</label>
            <input
              className={field}
              type="number"
              step="any"
              min="0"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>{t("trades.notes")}</label>
            <input
              className={field}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("common.optional")}
            />
          </div>
        </div>
        {error && (
          <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="ui-btn-primary disabled:opacity-60"
        >
          {busy
            ? t("common.saving")
            : side === "Buy"
              ? t("trades.addBuy")
              : t("trades.addSell")}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="py-2 pr-3 font-medium">{t("trades.date")}</th>
              <th className="py-2 pr-3 font-medium">{t("trades.side")}</th>
              <th className="py-2 pr-3 font-medium">{t("trades.quantity")}</th>
              <th className="py-2 pr-3 font-medium">{t("trades.price")}</th>
              <th className="py-2 pr-3 font-medium">{t("trades.fees")}</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-[var(--muted)]">
                  {t("trades.empty")}
                </td>
              </tr>
            )}
            {sorted.map((trade) => (
              <tr key={trade.id} className="border-t border-[var(--line)]">
                <td className="py-2 pr-3 tabular-nums">
                  {formatDate(trade.tradeDate)}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`ui-pill ${
                      trade.side === "Buy"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--danger-soft)] text-[var(--danger)]"
                    }`}
                  >
                    {sideLabel(trade.side)}
                  </span>
                </td>
                <td className="py-2 pr-3 tabular-nums">{trade.quantity}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {formatMoney(trade.price, currency)}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {trade.fees ? formatMoney(trade.fees, currency) : t("common.dash")}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(trade.id)}
                    className="text-xs text-[var(--danger)] hover:underline"
                  >
                    {t("common.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
