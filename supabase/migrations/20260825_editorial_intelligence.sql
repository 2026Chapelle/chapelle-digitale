-- CITADELLE 6A-1 — Editorial Intelligence foundation.
-- Additive only. No remote application in this lot.

create or replace function public.editorial_recommendations_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.editorial_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recommendation_kind text not null,
  content_kind text not null,
  target_channel text not null,
  status text not null default 'PROPOSED',
  priority_band text not null default 'NORMALE',
  window_start date not null,
  window_end date not null,
  scheduled_for date null,
  batch_id uuid null,
  parent_recommendation_id uuid null references public.editorial_recommendations(id) on delete set null,
  dedupe_key text not null,
  source_content_id text null,
  source_content_type text null,
  source_title text null,
  source_snapshot_jsonb jsonb not null default '{}'::jsonb,
  signals_jsonb jsonb not null default '[]'::jsonb,
  why_jsonb jsonb not null default '[]'::jsonb,
  human_title_override text null,
  human_notes text null,
  human_edit_jsonb jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  last_refreshed_at timestamptz null,
  last_human_action_at timestamptz null,
  accepted_at timestamptz null,
  scheduled_at timestamptz null,
  completed_at timestamptz null,
  rejected_at timestamptz null,
  archived_at timestamptz null,
  performance_snapshot_jsonb jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_recommendations_kind_check
    check (recommendation_kind in ('CREATE', 'REPURPOSE', 'PROMOTE')),
  constraint editorial_recommendations_status_check
    check (status in ('PROPOSED', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'ARCHIVED')),
  constraint editorial_recommendations_priority_band_check
    check (priority_band in ('FORTE', 'NORMALE', 'A_SURVEILLER')),
  constraint editorial_recommendations_content_kind_check
    check (length(trim(content_kind)) > 0),
  constraint editorial_recommendations_target_channel_check
    check (length(trim(target_channel)) > 0),
  constraint editorial_recommendations_window_check
    check (window_end >= window_start),
  constraint editorial_recommendations_scheduled_window_check
    check (scheduled_for is null or (scheduled_for >= window_start and scheduled_for <= window_end)),
  constraint editorial_recommendations_scheduled_status_check
    check (
      status not in ('SCHEDULED', 'COMPLETED')
      or scheduled_for is not null
    ),
  constraint editorial_recommendations_parent_self_check
    check (parent_recommendation_id is null or parent_recommendation_id <> id)
);

create unique index if not exists editorial_recommendations_org_dedupe_key_key
  on public.editorial_recommendations (organization_id, dedupe_key);

create index if not exists editorial_recommendations_org_status_scheduled_for_idx
  on public.editorial_recommendations (organization_id, status, scheduled_for);

create index if not exists editorial_recommendations_org_window_idx
  on public.editorial_recommendations (organization_id, window_start, window_end);

create index if not exists editorial_recommendations_org_batch_idx
  on public.editorial_recommendations (organization_id, batch_id);

create index if not exists editorial_recommendations_org_updated_at_idx
  on public.editorial_recommendations (organization_id, updated_at desc);

create trigger editorial_recommendations_updated_at
  before update on public.editorial_recommendations
  for each row execute function public.editorial_recommendations_set_updated_at();

create table if not exists public.editorial_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recommendation_id uuid not null references public.editorial_recommendations(id) on delete cascade,
  event_type text not null,
  payload_jsonb jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint editorial_recommendation_events_type_check
    check (event_type in ('PROPOSED', 'ACCEPTED', 'MODIFIED', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'ARCHIVED', 'PERFORMANCE_CAPTURED', 'REFRESHED'))
);

create index if not exists editorial_recommendation_events_org_recommendation_created_idx
  on public.editorial_recommendation_events (organization_id, recommendation_id, created_at desc);

create table if not exists public.editorial_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  timezone text not null default 'UTC',
  refresh_mode text not null default 'manual',
  refresh_time_local text null,
  weekly_capacity_jsonb jsonb not null default '{}'::jsonb,
  channel_capacity_jsonb jsonb not null default '{}'::jsonb,
  content_kind_capacity_jsonb jsonb not null default '{}'::jsonb,
  manual_refresh_enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_settings_refresh_mode_check
    check (refresh_mode in ('manual', 'daily'))
);

create trigger editorial_settings_updated_at
  before update on public.editorial_settings
  for each row execute function public.editorial_recommendations_set_updated_at();

alter table public.editorial_recommendations enable row level security;
alter table public.editorial_recommendation_events enable row level security;
alter table public.editorial_settings enable row level security;

