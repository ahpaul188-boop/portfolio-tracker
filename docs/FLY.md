# Fly.io deployment (recommended alternative to Vercel + Turso)

Uses **persistent SQLite** on a Fly volume — same Prisma schema as local dev, no Turso tokens.

Free tier: 3 shared VMs, 1 GB volume, apps sleep when idle (cold start ~5–10s).

## 1. Install Fly CLI

Windows (PowerShell):

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

Then restart your terminal and run:

```bash
fly auth login
```

## 2. Create the app and volume

From the project root:

```bash
fly launch --no-deploy
```

- Use app name `portfolio-tracker` (or change `app` in `fly.toml`)
- Region: **Hong Kong (hkg)** — already set in `fly.toml`
- Do **not** add Postgres — we use SQLite on a volume

Create the data volume (once):

```bash
fly volumes create data --region hkg --size 1
```

## 3. Set secrets

```bash
fly secrets set AUTH_SECRET="your-random-secret"
fly secrets set AUTH_URL="https://portfolio-tracker.fly.dev"
fly secrets set OPENROUTER_API_KEY="your-key"
```

Optional Google OAuth:

```bash
fly secrets set GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..."
```

`DATABASE_URL` is set in `fly.toml` to `file:/data/dev.db` — no Turso vars needed.

## 4. Deploy

```bash
fly deploy
```

Your app will be at: `https://portfolio-tracker.fly.dev` (or your chosen app name).

Check logs:

```bash
fly logs
```

## 5. Post-deploy

- Open `/api/health` — expect `"database": true`
- Sign in with email on `/login`
- Update `AUTH_URL` if you rename the app

## Why Fly instead of Vercel?

| | Vercel + Turso | Fly.io + volume |
|--|----------------|-----------------|
| SQLite file | ❌ needs Turso | ✅ works as-is |
| Token / 401 issues | Common | None |
| HK DNS (`vercel.app`) | Some ISPs block | `fly.dev` often works |
| Cold start | Fast | Slower when idle (free tier) |

## Other free options

| Host | Database | Effort |
|------|----------|--------|
| **Fly.io** (this guide) | SQLite volume | Low — use files in repo |
| **Render** + [Neon](https://neon.tech) | Postgres (free) | Medium — change Prisma to `postgresql` |
| **Railway** | Postgres add-on | Medium — ~$5 credit/month |

For a personal portfolio tracker, **Fly.io is the simplest** path that matches your current code.
