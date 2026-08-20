-- =============================================================================
-- CITADELLE INTELLIGENCE HUB — Migration de FONDATION (Phase 0)
-- STATUT : DRAFT — *** NON APPLIQUÉ ***.
--   - Placé HORS de supabase/migrations/ : le CLI Supabase ne le verra JAMAIS.
--   - Aucune exécution : ni `supabase db push`, ni `supabase db reset`.
--   - Additif, idempotent, RLS deny-by-default, service_role uniquement.
--   - N'introduit PAS de table `intelligence_events` (réutilise l'existant).
-- À réviser + appliquer seulement sur GO explicite (phase ultérieure), en distant,
-- selon le protocole de vérification read-only du projet.
-- =============================================================================

-- 1) État de connexion des canaux externes (secrets stockés HORS table).
create table if not exists public.intelligence_channel_connections (
  id             uuid primary key default gen_random_uuid(),
  channel        text not null check (channel in
                   ('google_analytics','google_search_console','youtube','meta','whatsapp_attribution')),
  status         text not null default 'disconnected'
                   check (status in ('disconnected','connected','error')),
  display_name   text,
  last_sync_at   timestamptz,
  meta           jsonb not null default '{}'::jsonb, -- non sensible uniquement
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (channel)
);

-- 2) Instantanés de métriques normalisées (1 ligne = 1 MetricEnvelope agrégé).
create table if not exists public.intelligence_channel_metric_snapshots (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null,
  metric       text not null,
  value        double precision not null,
  unit         text not null check (unit in ('count','ratio','percent','seconds','currency_xof')),
  freshness    text not null check (freshness in ('REALTIME','NEAR_REALTIME','SYNCED','SEO_DELAYED')),
  dimensions   jsonb not null default '{}'::jsonb,
  measured_at  timestamptz not null,
  synced_at    timestamptz not null default now()
);
create index if not exists idx_intel_metric_snap_channel_metric
  on public.intelligence_channel_metric_snapshots (channel, metric, measured_at desc);

-- 3) Journal des synchronisations (observabilité).
create table if not exists public.intelligence_channel_sync_runs (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running','success','error')),
  rows_ingested integer not null default 0,
  error        text
);

-- 4/5) Search Console (SEO_DELAYED).
create table if not exists public.intelligence_seo_queries (
  id           uuid primary key default gen_random_uuid(),
  query        text not null,
  clicks       integer not null default 0,
  impressions  integer not null default 0,
  ctr          double precision not null default 0,
  position     double precision,
  date         date not null,
  synced_at    timestamptz not null default now(),
  unique (query, date)
);
create table if not exists public.intelligence_seo_pages (
  id           uuid primary key default gen_random_uuid(),
  page         text not null,
  clicks       integer not null default 0,
  impressions  integer not null default 0,
  ctr          double precision not null default 0,
  position     double precision,
  date         date not null,
  synced_at    timestamptz not null default now(),
  unique (page, date)
);

-- 6/7) Campagnes + liens de campagne.
create table if not exists public.intelligence_campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  channel      text,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz not null default now()
);
create table if not exists public.intelligence_campaign_links (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid references public.intelligence_campaigns(id) on delete set null,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  url           text not null,
  created_at    timestamptz not null default now()
);

-- 8) Conversions consolidées (session OPAQUE, pas de PII).
create table if not exists public.intelligence_conversion_events (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in
                 ('signup','live_attendance','parcours_enrollment','donation','premium')),
  session      text not null,           -- clé de session opaque, jamais d'identité
  value        double precision,        -- ex : montant FCFA
  occurred_at  timestamptz not null default now()
);
create index if not exists idx_intel_conv_type_time
  on public.intelligence_conversion_events (type, occurred_at desc);

-- 9) Touches d'attribution (session OPAQUE ; source alignée sur detectSource()).
create table if not exists public.intelligence_attribution_touchpoints (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,
  medium       text not null,
  campaign     text,
  content      text,
  entry_page   text not null,           -- chemin uniquement
  session      text not null,           -- clé de session opaque
  occurred_at  timestamptz not null default now()
);
create index if not exists idx_intel_attr_session_time
  on public.intelligence_attribution_touchpoints (session, occurred_at);

-- Content graph — EXTENSION multi-plateforme (le graphe interne reste cms_document_links).
create table if not exists public.intelligence_content_destinations (
  id           uuid primary key default gen_random_uuid(),
  content_id   text not null,           -- clé de contenu logique transverse
  platform     text not null check (platform in
                 ('chapelle','citadelle','youtube','facebook','whatsapp')),
  external_id  text,
  url          text not null,
  campaign_id  uuid references public.intelligence_campaigns(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (content_id, platform, external_id)
);

-- -----------------------------------------------------------------------------
-- RLS : deny-by-default, service_role uniquement (pattern analytics/audio existant).
-- Aucune policy pour anon/authenticated ⇒ aucune lecture/écriture publique.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'intelligence_channel_connections',
    'intelligence_channel_metric_snapshots',
    'intelligence_channel_sync_runs',
    'intelligence_seo_queries',
    'intelligence_seo_pages',
    'intelligence_campaigns',
    'intelligence_campaign_links',
    'intelligence_conversion_events',
    'intelligence_attribution_touchpoints',
    'intelligence_content_destinations'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
    execute format('grant select, insert, update, delete on public.%I to service_role;', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- HUB-1 — index de SUPPORT sur une table EXISTANTE (perf), additif & idempotent.
-- Le comptage quotidien des complétions filtre module_completions.completed_at,
-- non couvert par les index actuels ((user_id, formation_id) / (user_id)) ⇒ seq scan.
-- Cet index le convertit en parcours d'index. NON APPLIQUÉ (revue perf HUB-1).
-- -----------------------------------------------------------------------------
create index if not exists idx_modcompl_completed
  on public.module_completions (completed_at desc);

-- FIN DRAFT — NE PAS APPLIQUER SANS GO EXPLICITE.
