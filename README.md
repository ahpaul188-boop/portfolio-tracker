# Portfolio Tracker

A personal finance dashboard for tracking **Hong Kong** and **US** stocks and bonds. Each signed-in user gets a private portfolio with live quotes, market news, a watchlist, and AI-powered portfolio insights.

Built as a compact, finance-focused web app with multilingual support (English, 繁體中文, 简体中文).

## Description

Portfolio Tracker helps individual investors monitor positions across HK and US markets in one place. Add holdings manually or via symbol search, record buys and sells, and see unrealized P&L, dividends, and portfolio value by currency.

The dashboard surfaces relevant market news (translated to your language), lets you track symbols before you buy, and generates educational AI suggestions based on your holdings and watchlist — powered by [OpenRouter](https://openrouter.ai) with a finance-tuned model.

Authentication is per-account: portfolios are isolated by user. Google sign-in is supported when OAuth is configured; otherwise a simple email login is available for local development.

## Features

### Portfolio & holdings
- HK and US **stocks** and **bonds** with per-user data isolation
- Holdings table with market value, cost basis, and unrealized P&L
- Buy/sell transaction ledger; quantity and average cost sync from trades
- Symbol search and manual entry; quote lookup for any HK/US stock
- Delayed stock quotes via Yahoo Finance; bonds use manual mark price

### Dashboard
- Compact finance-themed UI (sidebar layout, summary bar)
- Portfolio summary by currency (value, P&L, dividends)
- **Watchlist** — track symbols, quick-add from search, remove items
- **Market news** — headlines for your holdings and markets, with translation
- **AI suggestions** — portfolio analysis via OpenRouter (`inclusionai/ling-3.0-flash-fin:free`)

### Localization
- UI in **English**, **繁體中文**, and **简体中文**
- News translated to the selected language

### Authentication
- **Google OAuth** (optional) — separate portfolio per Google account
- **Email login** (dev fallback) — when Google credentials are not set

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite + Prisma |
| Auth | NextAuth v5 (Auth.js) |
| Quotes | Yahoo Finance (public endpoints) |
| News | RSS + MyMemory translation API |
| AI | OpenRouter Chat Completions API |

## Requirements

- Node.js 20+
- npm

## Quick start

```bash
cd portfolio-tracker
npm install
cp .env.example .env
# Edit .env — at minimum set AUTH_SECRET and OPENROUTER_API_KEY
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Google OAuth configured, sign in with any email address (each email gets its own portfolio).

## Environment variables

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-random-secret"          # openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Optional — enables Google sign-in
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI suggestions (required for AI panel)
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODEL="inclusionai/ling-3.0-flash-fin:free"
OPENROUTER_FALLBACK_MODELS="minimax/minimax-m3:free"
```

### Google OAuth (optional)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **OAuth client ID** → Web application
2. **Authorized redirect URI:** `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID and Secret into `.env`
4. If the consent screen is in **Testing**, add your Gmail as a test user

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:push` | Sync SQLite schema |
| `npm run db:studio` | Browse database in Prisma Studio |

## Deployment

See [docs/FLY.md](docs/FLY.md) for **Fly.io** (recommended — SQLite, no Turso) or [docs/DEPLOY.md](docs/DEPLOY.md) for Vercel.

**Health check:** `GET /api/health` (public) — reports database and config status.

## Phase 4 features

- **Portfolio performance chart** — estimated value over time (1M / 6M / 1Y / 5Y)
- **CSV export** — download holdings or transactions from the dashboard
- **Bond reminders** — upcoming maturities and coupon dates (90-day window)
- **Env validation** — startup warnings in dev; fails fast in production if `AUTH_SECRET` is missing
- **Production config** — `vercel.json`, deployment guide, dynamic OAuth redirect URI on login page

## Phase 5 features

- **FX conversion** — combined portfolio total in USD or HKD (Settings → display currency)
- **Watchlist price alerts** — set above/below targets; banner when triggered
- **CSV import** — bulk add holdings from template at `/import`
- **Settings** — display currency and OpenRouter model override at `/settings`
- **Mobile UI** — bottom navigation, card-style watchlist, larger touch targets

## Project structure

```
src/
  app/              # Pages and API routes
  components/       # UI (dashboard, watchlist, news, AI panel)
  i18n/             # Locales and translation helpers
  lib/              # Portfolio logic, quotes, news, OpenRouter
prisma/
  schema.prisma     # User, Holding, Transaction, WatchlistItem
```

## Notes

- **Stock symbols:** US `AAPL`, HK `0700` or `0700.HK`
- **AI output** is educational only, not financial advice
- **Free AI models** on OpenRouter can be rate-limited; the app retries and falls back automatically
- **Database reset** (clears all local data): `npx prisma db push --force-reset`

---

## Project plan

### Phase 1 — Core portfolio (done)

- [x] HK/US stocks and bonds with SQLite persistence
- [x] Holdings CRUD, symbol search, quote lookup
- [x] Transaction ledger (buys/sells) with synced cost basis
- [x] Portfolio summary, P&L, and delayed Yahoo quotes
- [x] Per-user authentication and data isolation

### Phase 2 — Dashboard experience (done)

- [x] Finance-themed compact UI with sidebar navigation
- [x] Market news panel with locale-aware translation
- [x] Watchlist with search-to-add
- [x] Multilingual UI (en / zh-Hant / zh-Hans)

### Phase 3 — AI insights (done)

- [x] OpenRouter integration with finance-tuned model
- [x] Portfolio-aware prompts (holdings + watchlist + summary)
- [x] Retry and fallback models for rate limits
- [x] Localized AI responses and error messages

### Phase 4 — Polish & production (done)

- [x] Production deployment config (`vercel.json`, [docs/DEPLOY.md](docs/DEPLOY.md))
- [x] Google OAuth setup guide and production redirect URIs (`AUTH_URL`-aware)
- [x] `.env` validation and `/api/health` checks
- [x] Historical portfolio performance chart
- [x] Export holdings and transactions (CSV)
- [x] Bond coupon / maturity reminders

### Phase 5 — Optional enhancements (done)

- [x] Multi-currency display with FX conversion (Frankfurter rates, combined total in Settings)
- [x] Price alerts on watchlist items (above/below, triggered banner)
- [x] Broker import (CSV template + upload at `/import`)
- [x] Mobile-optimized layout (card watchlist, bottom nav, touch targets)
- [x] OpenRouter model selection in Settings (`/settings`)

### Phase 6 — Future ideas (backlog)

- [ ] Email/push notifications for price alerts
- [ ] Broker-specific CSV import mappings
- [ ] Portfolio snapshots for accurate historical performance
- [ ] Multi-user household / shared portfolios
