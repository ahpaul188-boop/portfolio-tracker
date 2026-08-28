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

## Vercel + Neon (recommended)

No credit card required on Vercel Hobby or [Neon](https://neon.tech) free tier.

### 1. Database (Neon)

1. Sign up at [neon.tech](https://neon.tech) (GitHub login)
2. Create a project → copy **pooled** and **direct** connection strings
3. Locally, set in `.env`:
   - `DATABASE_URL` — pooled URL (`…-pooler…`)
   - `DIRECT_URL` — direct URL (no `pooler` in hostname)
4. Push schema once:

```bash
npm run db:push
```

### 2. Environment variables (Vercel)

**Vercel → Project → Settings → Environment Variables:**

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon **pooled** connection string |
| `DIRECT_URL` | Yes | Neon **direct** connection string |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Yes | `https://portfolio-tracker-iota-sable.vercel.app` |
| `GOOGLE_CLIENT_ID` | Optional | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | |
| `OPENROUTER_API_KEY` | Optional | AI suggestions |
| `OPENROUTER_MODEL` | Optional | Default: `inclusionai/ling-3.0-flash-fin:free` |
| `OPENROUTER_FALLBACK_MODELS` | Optional | e.g. `minimax/minimax-m3:free` |

Remove any old `TURSO_*` variables if present.

### 3. Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client
2. Add redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
3. Set `AUTH_URL` to your Vercel URL

### 4. Deploy

Connect GitHub repo in Vercel, or:

```bash
vercel
```

Build runs `prisma generate && next build`. Apply schema with `npm run db:push` locally — not during Vercel build.

### 5. Post-deploy

- `/api/health` → `"database": true`
- Sign in at `/login`
- Add a test holding

### Troubleshooting

**Login page works but sign-in returns 500**

Check Vercel logs for Prisma errors. Confirm `DATABASE_URL` and `DIRECT_URL` are set, then run `npm run db:push` locally.

**`can't reach this page` on vercel.app**

Some HK ISPs block `*.vercel.app` DNS. Change PC DNS to `8.8.8.8` / `1.1.1.1`, or test on mobile data.

## Fly.io (alternative)

See [docs/FLY.md](FLY.md) — requires a credit card on Fly.io even for free tier.

## Local development

```bash
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:push
npm run dev
```

Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
