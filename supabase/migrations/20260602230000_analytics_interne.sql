-- ============================================================================
-- ANALYTICS INTERNE CITADELLE — présence temps réel + parcours + conversions
-- ----------------------------------------------------------------------------
-- Objectif : relier l'activité du site aux membres, dons, formations, lives et
-- parcours spirituels — au-delà de Google Analytics.
--
-- CONFIDENTIALITÉ (strict) :
--  - Aucune IP brute stockée : seulement pays/ville dérivés (header CDN) + une
--    clé de session aléatoire (aucune PII pour les visiteurs anonymes).
--  - Ces tables ne contiennent JAMAIS le contenu des prières ni de la cure
--    d'âme : uniquement des catégories d'action (don, live, formation, pdf…).
--  - RLS activée SANS policy publique : lecture/écriture réservées au service
--    role (API). Aucun membre ne peut lire l'activité d'un autre.
-- ============================================================================

-- ── Sessions (une par visiteur/onglet, mise à jour par heartbeat 30s) ──
create table if not exists public.analytics_sessions (
  id            uuid        primary key default gen_random_uuid(),
  session_key   text        unique not null,                 -- aléatoire, généré client
  user_id       uuid        references public.profiles(id) on delete set null,
  is_auth       boolean     not null default false,
  device        text,                                        -- mobile | tablet | desktop
  browser       text,
  os            text,
  source        text,                                        -- direct|whatsapp|facebook|youtube|google|email|instagram|tiktok|referral
  referrer      text,
  landing_path  text,
  pays          text,
  ville         text,
  page_views    integer     not null default 0,
  events_count  integer     not null default 0,
  duration_sec  integer     not null default 0,              -- temps actif cumulé
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);
create index if not exists idx_asess_lastseen on public.analytics_sessions (last_seen desc);
create index if not exists idx_asess_user on public.analytics_sessions (user_id);
create index if not exists idx_asess_pays on public.analytics_sessions (pays);
create index if not exists idx_asess_source on public.analytics_sessions (source);
create index if not exists idx_asess_first on public.analytics_sessions (first_seen desc);
alter table public.analytics_sessions enable row level security;
-- (aucune policy → accès uniquement via service role)

-- ── Événements (append-only) ──
create table if not exists public.analytics_events (
  id           bigint      generated always as identity primary key,
  session_key  text        not null,
  user_id      uuid        references public.profiles(id) on delete set null,
  type         text        not null,                          -- pageview|heartbeat|click|download|video|conversion
  category     text,                                          -- live|don|formation|pdf|evenement|inscription|ressource…
  path         text,
  label        text,
  value        numeric,                                       -- montant (don), progression % (video/formation)…
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
-- (aucune policy → accès uniquement via service role)
