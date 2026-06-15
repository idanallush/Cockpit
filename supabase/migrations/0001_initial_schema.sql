-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- API Keys (admin keys for org-wide cost tracking + per-project keys)
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic','google')),
  name text not null,
  encrypted_key text not null,
  is_admin_key boolean default false not null,
  last_health_check_at timestamptz,
  last_health_status text check (last_health_status in ('ok','error','unknown')),
  created_at timestamptz default now() not null
);

-- Daily usage aggregates pulled from provider APIs
create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  model text,
  date date not null,
  input_tokens bigint default 0,
  cached_input_tokens bigint default 0,
  output_tokens bigint default 0,
  requests_count bigint default 0,
  cost_usd numeric(12,6) default 0,
  raw_data jsonb,
  created_at timestamptz default now() not null,
  unique(user_id, provider, model, date, project_id)
);

-- Health check history
create table public.health_checks (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys(id) on delete cascade not null,
  status text not null check (status in ('ok','error')),
  latency_ms integer,
  error_message text,
  checked_at timestamptz default now() not null
);

-- Alerts
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  type text not null check (type in ('cost_threshold','api_error','quota_warning')),
  severity text not null check (severity in ('info','warning','critical')),
  message text not null,
  metadata jsonb,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- Cost thresholds (user-defined budgets)
create table public.cost_thresholds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  provider text,
  period text not null check (period in ('daily','monthly')),
  amount_usd numeric(10,2) not null,
  created_at timestamptz default now() not null
);

-- RLS
alter table public.projects enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_records enable row level security;
alter table public.health_checks enable row level security;
alter table public.alerts enable row level security;
alter table public.cost_thresholds enable row level security;

create policy "own projects" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own api_keys" on public.api_keys for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own usage_records" on public.usage_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own health_checks" on public.health_checks for select using (
  exists (select 1 from public.api_keys where api_keys.id = health_checks.api_key_id and api_keys.user_id = auth.uid())
);
create policy "own alerts" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cost_thresholds" on public.cost_thresholds for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_usage_records_user_date on public.usage_records(user_id, date desc);
create index idx_usage_records_project on public.usage_records(project_id);
create index idx_alerts_user_unread on public.alerts(user_id, is_read, created_at desc);
create index idx_health_checks_api_key on public.health_checks(api_key_id, checked_at desc);
