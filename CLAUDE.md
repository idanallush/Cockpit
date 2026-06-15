# Cockpit — Project Notes

## Purpose
Central dashboard for tracking API usage, costs, and health across providers (OpenAI, Anthropic, Google). Pulls cost/usage data from provider admin APIs, runs scheduled health checks, alerts on cost thresholds, and shows usage history per project.

## Tech Stack
- Next.js 15 (App Router, TypeScript, src/, Turbopack)
- Tailwind CSS v4 + shadcn/ui (Radix-based)
- Supabase (Postgres + Auth) via `@supabase/ssr`
- Recharts (for Phase 3 graphs)
- pnpm
- Vercel hosting

## Folder Structure
```
src/
  app/
    page.tsx                  # Root: redirect to /dashboard or /login
    layout.tsx                # Root layout + Toaster
    login/
      page.tsx                # Email/password login form
      actions.ts              # signIn / signUp / signOut server actions
    auth/confirm/route.ts     # Supabase email-confirm handler
    dashboard/
      layout.tsx              # Sidebar + topbar shell, auth-gated
      page.tsx                # Overview (placeholder for Phase 1)
  components/ui/              # shadcn primitives
  lib/
    supabase/{client,server,middleware}.ts
    utils.ts
  middleware.ts               # Root middleware → updateSession
supabase/
  migrations/0001_initial_schema.sql
```

## Run Locally
```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                      # http://localhost:3000
pnpm build                    # production build
pnpm lint                     # eslint
```

## Env Vars
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (browser-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — service role (server-only, for admin ops)
- `OPENAI_ADMIN_KEY` — OpenAI admin key (Phase 2)
- `ANTHROPIC_ADMIN_KEY` — Anthropic admin key (Phase 2)
- `ENCRYPTION_KEY` — AES key for encrypting per-project API keys (Phase 2)
- `CRON_SECRET` — shared secret guarding scheduled endpoints (Phase 3)

## Database
Run `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor on first setup. Tables:
- `projects` — user projects
- `api_keys` — encrypted provider keys (admin + per-project)
- `usage_records` — daily aggregated cost/tokens per provider/model/project
- `health_checks` — history of provider health pings
- `alerts` — cost-threshold / error alerts
- `cost_thresholds` — user-defined budgets

RLS is enabled on every table; policies scope rows to `auth.uid()`.

## Auth
- Supabase email/password.
- `@supabase/ssr` (NOT the deprecated `@supabase/auth-helpers-nextjs`).
- `src/middleware.ts` refreshes the session cookie on every request and redirects unauthenticated users away from non-auth routes.

## Phase Status
- [x] **Phase 1 — Foundation** (auth, schema, dashboard shell)
- [ ] Phase 2 — Provider integration (OpenAI/Anthropic admin APIs, per-project key encryption)
- [ ] Phase 3 — Scheduled health checks + usage sync, charts, caching
- [ ] Phase 4 — Alerts (cost thresholds, webhooks), security hardening
