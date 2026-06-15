# Cockpit

Central dashboard for tracking API usage, costs, and health across OpenAI, Anthropic, and Google APIs.

## Stack
Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + Auth) · Recharts · Vercel

## Setup

```bash
# 1. Clone
git clone https://github.com/idanallush/Cockpit.git
cd Cockpit

# 2. Install
pnpm install

# 3. Env
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. Run DB migration
# Open Supabase Dashboard → SQL Editor → paste contents of
# supabase/migrations/0001_initial_schema.sql → Run

# 5. Dev
pnpm dev
# http://localhost:3000
```

## Scripts
- `pnpm dev` — start dev server (Turbopack)
- `pnpm build` — production build
- `pnpm start` — run production server
- `pnpm lint` — eslint

## Env Vars
See `.env.example`. Phase 1 only needs the three `SUPABASE_*` keys. The rest are wired in later phases.

## Deploy
1. Push to GitHub (`origin/main`).
2. Import the repo in Vercel.
3. Add the env vars from `.env.local` to the Vercel project.
4. Deploy.

## Phases
- [x] **Phase 1** — Next.js app, Supabase + auth, full DB schema, dashboard shell
- [ ] Phase 2 — Pull cost data from OpenAI/Anthropic admin APIs, encrypted per-project keys
- [ ] Phase 3 — Cron health checks, caching, usage charts
- [ ] Phase 4 — Cost-threshold alerts, webhooks, security hardening
