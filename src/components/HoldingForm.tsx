"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/LocaleProvider";
import { SymbolSearchField } from "@/components/SymbolSearchField";
import type { SearchHit } from "@/lib/quotes";
import type { AssetType, HoldingInput, Market } from "@/lib/types";

type Initial = Partial<HoldingInput> & { id?: string };

type Props = {
  initial?: Initial;
  mode: "create" | "edit";
  lockPositionFields?: boolean;
};

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value?: string | null): string {
  if (!value) return todayInput();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? todayInput() : d.toISOString().slice(0, 10);
}

export function HoldingForm({
  initial,
  mode,
  lockPositionFields = false,
}: Props) {
  const { t } = useI18n();
  const [assetType, setAssetType] = useState<AssetType>(
    (initial?.assetType as AssetType) || "Stock"
  );
  const [market, setMarket] = useState<Market>(
    (initial?.market as Market) || "US"
  );
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [isin, setIsin] = useState(initial?.isin ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [quantity, setQuantity] = useState(
    initial?.quantity != null ? String(initial.quantity) : ""
  );
  const [costBasis, setCostBasis] = useState(
    initial?.costBasis != null ? String(initial.costBasis) : ""
  );
  const [manualPrice, setManualPrice] = useState(
    initial?.manualPrice != null ? String(initial.manualPrice) : ""
  );
  const [currency, setCurrency] = useState(
    initial?.currency ?? (market === "HK" ? "HKD" : "USD")
  );
  const [couponRate, setCouponRate] = useState(
    initial?.couponRate != null ? String(initial.couponRate) : ""
  );
  const [maturityDate, setMaturityDate] = useState(() => {
    if (!initial?.maturityDate) return "";
    const d = new Date(initial.maturityDate);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  });
  const [purchasedAt, setPurchasedAt] = useState(() =>
    toDateInput(initial?.purchasedAt)
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = useMemo(
    () =>
      mode === "create" ? t("holdingForm.addTitle") : t("holdingForm.editTitle"),
    [mode, t]
  );

  const interestPreview = useMemo(() => {
    if (assetType !== "Bond") return null;
    const qty = Number(quantity);
    const cost = Number(costBasis);
    const rate = Number(couponRate);
    if (!(qty > 0 && cost >= 0 && rate > 0 && purchasedAt)) return null;
    const start = new Date(purchasedAt);
    if (Number.isNaN(start.getTime())) return null;
    let end = new Date();
    if (maturityDate) {
      const m = new Date(maturityDate);
      if (!Number.isNaN(m.getTime()) && m < end) end = m;
    }
    const years =
      Math.max(0, end.getTime() - start.getTime()) / (86_400_000 * 365.25);
    const interest = qty * cost * (rate / 100) * years;
    const days = Math.floor(
      Math.max(0, end.getTime() - start.getTime()) / 86_400_000
    );
    return { interest, days, years };
  }, [assetType, quantity, costBasis, couponRate, purchasedAt, maturityDate]);

  function onMarketChange(m: Market) {
    setMarket(m);
    setCurrency(m === "HK" ? "HKD" : "USD");
  }

  function onSymbolSelect(hit: SearchHit) {
    setSymbol(hit.symbol);
    setName(hit.name);
    setCurrency(hit.currency);
    if (hit.isin) setIsin(hit.isin);
    if (hit.market !== market) onMarketChange(hit.market);
    if (hit.assetType === "Bond" || hit.assetType === "Stock") {
      setAssetType(hit.assetType);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const payload: HoldingInput = {
      assetType,
      market,
      symbol,
      isin: isin || null,
      name,
      quantity: Number(quantity),
      costBasis: Number(costBasis),
      manualPrice: manualPrice === "" ? null : Number(manualPrice),
      currency,
      couponRate: couponRate === "" ? null : Number(couponRate),
      maturityDate: maturityDate || null,
      purchasedAt: purchasedAt || null,
      notes: notes || null,
    };

    try {
      const url =
        mode === "create" ? "/api/holdings" : `/api/holdings/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("holdingForm.saveFailed"));
        return;
      }
      window.location.href = "/";
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm(t("holdingForm.deleteConfirm"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/holdings/${initial.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("holdingForm.deleteFailed"));
        return;
      }
      window.location.href = "/";
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }

  const field = "ui-input mt-1";
  const label =
    "block text-xs font-medium uppercase tracking-wide text-[var(--muted)]";

  return (
    <form onSubmit={onSubmit} className="ui-card max-w-2xl space-y-5 p-5 sm:p-6">
      <h2
        className="text-2xl font-semibold text-[var(--ink)]"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h2>

      <div className="flex flex-wrap gap-2">
        {(["Stock", "Bond"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAssetType(type)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              assetType === type
                ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {type === "Stock" ? t("asset.stock") : t("asset.bond")}
          </button>
        ))}
        {(["HK", "US"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMarketChange(m)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              market === m
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{t("holdingForm.symbol")}</label>
          {assetType === "Stock" ? (
            <>
              <SymbolSearchField
                value={symbol}
                onChange={setSymbol}
                onSelect={onSymbolSelect}
                market={market}
                required
                className={field}
                placeholder={market === "HK" ? "0700" : "AAPL"}
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {t("holdingForm.symbolLookupHint")}
              </p>
            </>
          ) : (
            <input
              className={field}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              placeholder={market === "HK" ? "0700" : "AAPL"}
            />
          )}
        </div>
        <div>
          <label className={label}>{t("holdingForm.name")}</label>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        {assetType === "Bond" && (
          <div className="sm:col-span-2">
            <label className={label}>{t("holdingForm.isin")}</label>
            <input
              className={field}
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
              placeholder={t("common.optional")}
            />
          </div>
        )}
        <div>
          <label className={label}>
            {assetType === "Bond" ? t("holdingForm.faceQty") : t("holdingForm.shares")}
            {lockPositionFields ? t("holdingForm.fromTrades") : ""}
          </label>
          <input
            className={field}
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            readOnly={lockPositionFields}
            disabled={lockPositionFields}
          />
        </div>
        <div>
          <label className={label}>
            {assetType === "Bond"
              ? t("holdingForm.avgCostUnit")
              : t("holdingForm.avgCostShare")}
            {lockPositionFields ? t("holdingForm.fromTrades") : ""}
          </label>
          <input
            className={field}
            type="number"
            step="any"
            min="0"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            required
            placeholder="80.5"
            readOnly={lockPositionFields}
            disabled={lockPositionFields}
          />
        </div>
        <div>
          <label className={label}>
            {assetType === "Bond"
              ? t("holdingForm.manualPriceBond")
              : t("holdingForm.manualPriceStock")}
          </label>
          <input
            className={field}
            type="number"
            step="any"
            min="0"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            required={assetType === "Bond"}
          />
        </div>
        <div>
          <label className={label}>{t("holdingForm.currency")}</label>
          <select
            className={field}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="HKD">HKD</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className={label}>{t("holdingForm.holdFrom")}</label>
          <input
            className={field}
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            required={!lockPositionFields}
            readOnly={lockPositionFields}
            disabled={lockPositionFields}
          />
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {lockPositionFields
              ? t("holdingForm.holdFromTrades")
              : t("holdingForm.holdFromDividends")}
          </p>
        </div>
        <div>
          <label className={label}>
            {assetType === "Bond"
              ? t("holdingForm.couponRate")
              : t("holdingForm.yieldInfo")}
          </label>
          <input
            className={field}
            type="number"
            step="any"
            min="0"
            value={couponRate}
            onChange={(e) => setCouponRate(e.target.value)}
            placeholder={
              assetType === "Bond" ? "4.5" : t("holdingForm.yieldPlaceholder")
            }
          />
        </div>
        {assetType === "Bond" && (
          <div>
            <label className={label}>{t("holdingForm.maturity")}</label>
            <input
              className={field}
              type="date"
              value={maturityDate}
              onChange={(e) => setMaturityDate(e.target.value)}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={label}>{t("holdingForm.notes")}</label>
          <textarea
            className={field}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {interestPreview && (
        <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-deep)]">
          {t("holdingForm.bondPreview", {
            days: interestPreview.days,
            years: interestPreview.years.toFixed(2),
            currency,
            amount: interestPreview.interest.toFixed(2),
          })}
        </p>
      )}
      {assetType === "Stock" && (
        <p className="rounded-xl bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--muted)]">
          {t("holdingForm.stockDividendNote")}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="ui-btn-primary disabled:opacity-60"
        >
          {busy ? t("common.saving") : t("common.save")}
        </button>
        <a href="/" className="ui-btn-ghost">
          {t("common.cancel")}
        </a>
        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="ml-auto rounded-xl border border-[var(--danger)]/30 px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          >
            {t("common.delete")}
          </button>
        )}
      </div>
    </form>
  );
}
