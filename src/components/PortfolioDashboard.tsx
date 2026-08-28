"use client";

import { AiSuggestionsPanel } from "@/components/AiSuggestionsPanel";
import { PriceAlertsBanner } from "@/components/PriceAlertsBanner";
import { ExportMenu } from "@/components/ExportMenu";
import { NewsPanel } from "@/components/NewsPanel";
import { PortfolioPerformanceChart } from "@/components/PortfolioPerformanceChart";
import { PortfolioTable, RefreshQuotesButton } from "@/components/PortfolioTable";
import { QuoteLookup } from "@/components/QuoteLookup";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SearchBox } from "@/components/SearchBox";
import { SummaryCards } from "@/components/SummaryCards";
import { useI18n } from "@/components/LocaleProvider";
import { BondRemindersPanel } from "@/components/BondRemindersPanel";
import type { FxRates } from "@/lib/fx";
import type { BondReminder } from "@/lib/bond-reminders";
import type { NewsItem } from "@/lib/news";
import type { EnrichedHolding, PortfolioSummary } from "@/lib/portfolio";
import type { DisplayCurrency } from "@/lib/user-preferences";

type Props = {
  holdings: EnrichedHolding[];
  summary: PortfolioSummary;
  holdingCount: number;
  userName?: string | null;
  newsItems?: NewsItem[];
  newsFetchedAt?: string | null;
  bondReminders?: BondReminder[];
  displayCurrency?: DisplayCurrency;
  fxRates?: FxRates | null;
};

export function PortfolioDashboard({
  holdings,
  summary,
  holdingCount,
  userName,
  newsItems = [],
  newsFetchedAt = null,
  bondReminders = [],
  displayCurrency = "USD",
  fxRates = null,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-2.5">
      <SummaryCards
        summary={summary}
        holdingCount={holdingCount}
        userName={userName}
        exportMenu={<ExportMenu />}
        displayCurrency={displayCurrency}
        fxRates={fxRates}
      />

      <PriceAlertsBanner />

      <PortfolioPerformanceChart />

      {bondReminders.length > 0 && (
        <BondRemindersPanel reminders={bondReminders} />
      )}

      <div className="grid items-start gap-2.5 xl:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.75fr)]">
        <section className="ui-card min-w-0 p-2 sm:p-2.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
            <h2 className="ui-section-title">
              {t("dashboard.myHoldings")}
              <span className="ml-1 font-normal text-[var(--muted)]">
                ({holdingCount})
              </span>
            </h2>
            <RefreshQuotesButton />
          </div>
          <PortfolioTable holdings={holdings} />
        </section>

        <div className="flex min-w-0 flex-col gap-2.5">
          <AiSuggestionsPanel />
          <NewsPanel
            initialItems={newsItems}
            initialFetchedAt={newsFetchedAt}
          />
          <WatchlistPanel />
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <QuoteLookup />
        <section className="ui-card p-2 sm:p-2.5">
          <div className="mb-2">
            <h2 className="ui-section-title">{t("dashboard.addHolding")}</h2>
            <p className="ui-section-hint">{t("dashboard.addHoldingHint")}</p>
          </div>
          <SearchBox />
          <a
            href="/holdings/new"
            className="mt-2 inline-block text-[11px] font-medium text-[var(--accent-deep)] hover:underline"
          >
            {t("dashboard.enterManually")}
          </a>
        </section>
      </div>
    </div>
  );
}
