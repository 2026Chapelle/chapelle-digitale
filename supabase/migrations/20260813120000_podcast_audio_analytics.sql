-- =============================================================================
-- PODCAST-4 — Analytics d'écoute audio (« La Voix du Royaume »)
-- =============================================================================
-- HISTORIQUE d'événements d'écoute (append-only), DISTINCT de `audio_progress`
-- (état PERSONNEL de reprise, PODCAST-2). Ces deux modèles restent séparés :
--   audio_progress          = 1 ligne par (membre, épisode), MUTABLE, reprise perso.
--   audio_listening_events  = N événements immuables, source des agrégats admin.
--
-- CONFIDENTIALITÉ / SÉCURITÉ (strict) :
--  - Écriture UNIQUEMENT via service_role (API contrôlée /api/podcast/analytics) :
--    aucune policy anon/authenticated → un membre NE PEUT PAS insérer/modifier/
--    supprimer, ni forger un événement au nom d'autrui (RLS = deny par défaut).
--  - Le serveur dérive `user_id` de la session vérifiée (jamais le client) et
--    `access_context` de la base (jamais le client). `podcast_id` est contraint
--    par une FK → un épisode inexistant est rejeté.
--  - Jamais d'URL média / token signé stocké : seulement `podcast_id`.
--  - Visiteurs anonymes : `session_key` aléatoire (sessionStorage), aucune PII,
--    aucun fingerprint. `user_id` NULL. Unicité anon = LIMITÉE (par onglet).
--  - Append-only : aucune colonne PII, aucun contenu de prière / cure d'âme.
-- 100% ADDITIF. Réf. cms_podcasts / audio_playlists (aucune duplication).
-- =============================================================================

create table if not exists public.audio_listening_events (
  id               bigint      generated always as identity primary key,
  podcast_id       uuid        not null references public.cms_podcasts(id)   on delete cascade,
  user_id          uuid        references auth.users(id)                     on delete set null,   -- NULL = visiteur anonyme ; uid vérifié (auth), jamais fourni par le client
  session_key      text,                                                                            -- clé de session (anon dedup, jamais PII)
  event_type       text        not null
                   check (event_type in ('play_start','play_resume','progress_checkpoint','completed')),
  position_seconds integer     check (position_seconds is null or position_seconds >= 0),
  duration_seconds integer     check (duration_seconds is null or duration_seconds >= 0),
  percent_complete smallint    check (percent_complete is null or (percent_complete between 0 and 100)),
  playlist_id      uuid        references public.audio_playlists(id)         on delete set null,
  source_context   text        check (source_context is null or source_context in (
                     'catalog','featured','new_release','continue_listening',
                     'official_playlist','personal_playlist','homepage_instant','homepage_premium','direct')),
  access_context   text        check (access_context is null or access_context in ('public','member','premium')),
  occurred_at      timestamptz not null default now(),
  metadata         jsonb
);

-- ── Index (agrégations économes) ────────────────────────────────────────────
-- Épisode le plus écouté + fenêtre temporelle (top épisodes, tendance par épisode).
create index if not exists idx_ale_podcast_time on public.audio_listening_events (podcast_id, occurred_at desc);
-- Balayage par fenêtre (tendance globale, KPI période).
create index if not exists idx_ale_time         on public.audio_listening_events (occurred_at desc);
-- Filtre par type d'événement (plays vs completed).
create index if not exists idx_ale_type         on public.audio_listening_events (event_type);
-- Auditeurs uniques membres / reprise (partiel : ignore les lignes anon).
create index if not exists idx_ale_user_time     on public.audio_listening_events (user_id, occurred_at desc) where user_id is not null;
-- Dedup auditeur anonyme.
create index if not exists idx_ale_session       on public.audio_listening_events (session_key) where session_key is not null;
-- Analytics playlists officielles (partiel : ignore la majorité sans playlist).
create index if not exists idx_ale_playlist      on public.audio_listening_events (playlist_id) where playlist_id is not null;

-- ── RLS : append-only via service_role UNIQUEMENT ───────────────────────────
-- Aucune policy anon/authenticated, aucun grant table-level → deny par défaut.
-- service_role (backend Supabase) bypass RLS pour l'ingestion contrôlée et la
-- lecture agrégée admin. Les événements sont ainsi IMMUABLES côté client :
-- pas d'INSERT direct, pas d'UPDATE, pas de DELETE.
alter table public.audio_listening_events enable row level security;
revoke all on public.audio_listening_events from anon, authenticated;
-- service_role (backend, BYPASSRLS) : SELECT (agrégats admin) + INSERT (ingestion) UNIQUEMENT.
-- Pas d'UPDATE/DELETE même côté backend → append-only strict (une purge de rétention
-- éventuelle passerait par un rôle privilégié dédié, hors de ce lot). Rend l'ingestion
-- fonctionnelle indépendamment des privilèges par défaut de l'environnement.
grant select, insert on public.audio_listening_events to service_role;

comment on table public.audio_listening_events is
  'PODCAST-4 : événements d''écoute audio (append-only, service_role only). Distinct de audio_progress (reprise perso). Agrégats admin uniquement.';
