-- ============================================================================
-- APPLY — ANALYTICS INTERNE (à exécuter dans Supabase → SQL Editor)
-- ----------------------------------------------------------------------------
-- CAUSE RACINE de « Connectés maintenant = 0 / Visiteurs = 0 » : la migration
-- 20260602230000_analytics_interne.sql n'est PAS encore appliquée en prod, donc
-- les tables public.analytics_sessions / analytics_events n'existent pas et le
-- heartbeat (/api/analytics/track, service role) échoue silencieusement.
--
-- Le service role (utilisé par l'API) CONTOURNE la RLS : aucune policy n'est
-- nécessaire pour que l'écriture/lecture serveur fonctionne — il suffit que les
-- tables existent. Ce script est IDEMPOTENT (réexécutable sans risque).
-- ============================================================================

create table if not exists public.analytics_sessions (
  id            uuid        primary key default gen_random_uuid(),
  session_key   text        unique not null,
  user_id       uuid        references public.profiles(id) on delete set null,
  is_auth       boolean     not null default false,
  device        text,
  browser       text,
  os            text,
  source        text,
  referrer      text,
  landing_path  text,
  pays          text,
  ville         text,
  page_views    integer     not null default 0,
  events_count  integer     not null default 0,
  duration_sec  integer     not null default 0,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);
create index if not exists idx_asess_lastseen on public.analytics_sessions (last_seen desc);
create index if not exists idx_asess_user on public.analytics_sessions (user_id);
create index if not exists idx_asess_pays on public.analytics_sessions (pays);
create index if not exists idx_asess_source on public.analytics_sessions (source);
create index if not exists idx_asess_first on public.analytics_sessions (first_seen desc);
alter table public.analytics_sessions enable row level security;

create table if not exists public.analytics_events (
  id           bigint      generated always as identity primary key,
  session_key  text        not null,
  user_id      uuid        references public.profiles(id) on delete set null,
  type         text        not null,
  category     text,
  path         text,
  label        text,
  value        numeric,
  pays         text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_aevt_created on public.analytics_events (created_at desc);
create index if not exists idx_aevt_type on public.analytics_events (type);
create index if not exists idx_aevt_category on public.analytics_events (category);
create index if not exists idx_aevt_session on public.analytics_events (session_key);
create index if not exists idx_aevt_user on public.analytics_events (user_id);
alter table public.analytics_events enable row level security;

-- Vérification rapide après exécution :
--   select count(*) from public.analytics_sessions;
--   select count(*) from public.analytics_sessions where last_seen >= now() - interval '90 seconds';
