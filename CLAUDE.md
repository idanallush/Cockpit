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
      page.tsx                # Sign-in only (signup gated to first user)
      actions.ts              # signIn / signUp (gated) / signOut
    auth/confirm/route.ts     # Supabase email-confirm handler
    api/
      sync/route.ts           # POST: manual sync (auth-gated)
      sync/cron/route.ts      # GET: Vercel Cron entry, Bearer-auth via CRON_SECRET
    dashboard/
      layout.tsx              # Sidebar + topbar shell, auth-gated
      page.tsx                # Overview with stat cards + Sync Now
      sync-button.tsx         # Client component, POST /api/sync
      projects/               # Projects list + dialog + actions
      api-keys/               # API keys list + dialog + actions
      usage/page.tsx          # Usage table with day-range filter
      alerts/page.tsx         # Placeholder for Phase 4
      settings/page.tsx       # Account + env config status
  components/ui/              # shadcn primitives
  lib/
    crypto.ts                 # AES-256-GCM encrypt/decrypt/maskKey
    supabase/
      client.ts               # Browser client
      server.ts               # SSR client (cookies)
      middleware.ts           # Session refresh + redirect
      admin.ts                # Service-role client (bypasses RLS)
    sync/
      openai.ts               # syncOpenAICosts()
      anthropic.ts            # syncAnthropicCosts() — cents→dollars
      anthropic-tokens.ts     # syncAnthropicTokens() — token-level usage
      project-mapping.ts      # provider ID → internal project_id lookup
      audit.ts                # writes sync_runs rows
      run-all.ts              # orchestrator used by both routes
      types.ts                # SyncResult type
    aggregate.ts              # daily/project rollups for charts
  components/charts/
    spend-area-chart.tsx      # Recharts stacked area (client)
    project-bar-chart.tsx     # Recharts bar (client)
    utils.ts
  middleware.ts               # Root middleware → updateSession
supabase/
  migrations/
    0001_initial_schema.sql
    0002_project_mappings.sql # projects.{openai_project_ids,anthropic_workspace_ids} + sync_runs
vercel.json                   # cron job: /api/sync/cron every 6h
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

## Cost sync model
- Admin keys (`OPENAI_ADMIN_KEY`, `ANTHROPIC_ADMIN_KEY`) live in env, not the DB. They power org-wide cost sync.
- Per-project provider keys are encrypted in the DB via `src/lib/crypto.ts` (AES-256-GCM with 96-bit IV + 128-bit auth tag), stored in `api_keys.encrypted_key`. They will be used in Phase 3 for per-project usage attribution.
- `/api/sync` (POST) authenticates via the SSR client, then calls `syncOpenAICosts` and `syncAnthropicCosts` (which use the service-role client to upsert into `usage_records`, bypassing RLS after auth has been verified).
- Single-user gate: `signUp` returns "Signups disabled." once a user already exists.

## Phase Status
- [x] **Phase 1 — Foundation** (auth, schema, dashboard shell)
- [x] **Phase 2 — Provider integration** (projects, encrypted keys, OpenAI + Anthropic cost sync, overview/usage pages)
- [x] **Phase 3 — Automation & charts** (Vercel Cron every 6h, project mapping by provider IDs, Anthropic token usage, Recharts daily-spend area + project bar, sync_runs audit log)
- [ ] Phase 4 — Alerts (cost thresholds, webhooks), security hardening

## Cron + audit
- `vercel.json` schedules `/api/sync/cron` every 6 hours (`0 */6 * * *`).
- Vercel sends `Authorization: Bearer ${CRON_SECRET}` — set `CRON_SECRET` in Vercel env. Reject 401 if header is missing/wrong.
- Each run writes a `sync_runs` row per provider (openai / anthropic / anthropic_tokens) with status, records_processed, duration_ms.
- The Settings page reads the latest `sync_runs.trigger='cron'` row to show "last cron run".
