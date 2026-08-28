# Deployment guide

## Health check

After deploy, verify the app is running:

```bash
curl https://your-domain.com/api/health
```

Expected response when healthy:

```json
{
  "status": "ok",
  "checks": {
    "database": true,
    "authSecret": true,
    "googleOAuth": true,
    "openrouter": true
  }
}
```

## Vercel (recommended)

### 1. Database

The default **SQLite** file database works locally but **does not persist** on Vercel serverless functions.

For production, migrate to a hosted database:

- [Turso](https://turso.tech) (SQLite-compatible) — change `DATABASE_URL` to `libsql://...`
- [Neon](https://neon.tech) or [Supabase](https://supabase.com) (Postgres) — update `prisma/schema.prisma` provider to `postgresql`

Push the schema **once** from your machine (not during the Vercel build):

```bash
# In .env set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then:
npm run db:push:turso
```

For Postgres (Neon/Supabase), change `provider` in `prisma/schema.prisma` to `postgresql`, then run the same command with your Postgres URL.

### 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes (local) | `file:./dev.db` locally; optional on Vercel if Turso vars are set |
| `TURSO_DATABASE_URL` | Yes (Vercel) | e.g. `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Yes (Vercel) | Turso dashboard → Database → Tokens |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Yes | `https://your-domain.vercel.app` |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | |
| `OPENROUTER_API_KEY` | Optional | AI suggestions panel |
| `OPENROUTER_MODEL` | Optional | Default: `inclusionai/ling-3.0-flash-fin:free` |
| `OPENROUTER_FALLBACK_MODELS` | Optional | e.g. `minimax/minimax-m3:free` |

### 3. Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client
2. Add **Authorized redirect URI**:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
3. Set `AUTH_URL=https://your-domain.vercel.app` in Vercel env
4. If the consent screen is in **Testing**, add each user's Gmail as a test user — or publish the app for public use

### 4. Deploy

```bash
npm i -g vercel
vercel
```

Or connect the GitHub repo in the Vercel dashboard. The build runs `prisma generate && next build` (see `package.json`). **Do not** run `prisma db push` on Vercel — apply schema changes locally against your hosted database instead.

### 5. Post-deploy

- Open `/api/health` — confirm `status: ok`
- Sign in and add a test holding
- Export CSV from the dashboard header
- Check portfolio performance chart loads

## Self-hosted (Node)

```bash
npm install
cp .env.example .env
# Edit .env — set AUTH_SECRET, DATABASE_URL, AUTH_URL
npx prisma db push
npm run build
npm run start
```

Run behind a reverse proxy (nginx, Caddy) with HTTPS. Set `AUTH_URL` to your public URL.

## Local development

```bash
npm run dev
```

Email login works without Google OAuth. Health endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)
