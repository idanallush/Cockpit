-- Project mappings: tie provider project/workspace IDs to internal projects.
alter table public.projects
  add column if not exists openai_project_ids text[] default '{}'::text[] not null,
  add column if not exists anthropic_workspace_ids text[] default '{}'::text[] not null;

-- Sync audit log
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  trigger text not null check (trigger in ('manual','cron')),
  status text not null check (status in ('success','partial','error')),
  records_processed integer default 0,
  error_message text,
  duration_ms integer,
  created_at timestamptz default now() not null
);

alter table public.sync_runs enable row level security;

drop policy if exists "own sync_runs" on public.sync_runs;
create policy "own sync_runs" on public.sync_runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_sync_runs_user_created
  on public.sync_runs(user_id, created_at desc);
