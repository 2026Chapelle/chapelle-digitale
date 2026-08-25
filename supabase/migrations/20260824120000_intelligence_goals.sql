-- Intelligence 5C-2: canonical human-defined goals.
-- Additive only. No remote application in this lot.

create table if not exists public.intelligence_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric_key text not null,
  target_value integer not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  constraint intelligence_goals_metric_key_check
    check (metric_key in ('visits', 'signups', 'podcastStarts', 'progressions')),
  constraint intelligence_goals_target_value_check
    check (target_value > 0),
  constraint intelligence_goals_period_check
    check (period_end >= period_start),
  constraint intelligence_goals_status_check
    check (status in ('ACTIVE', 'ARCHIVED'))
);

create unique index if not exists intelligence_goals_org_metric_period_key
  on public.intelligence_goals (organization_id, metric_key, period_start, period_end);

alter table public.intelligence_goals enable row level security;

create trigger intelligence_goals_updated_at
  before update on public.intelligence_goals
  for each row execute function public.update_updated_at();

