-- =============================================================================
-- LIVE-VIDEO PHASE 1F-A — FONDATION `live_programs` + FK `cms_lives.program_id`
-- =============================================================================
-- Décision architecturale : OPTION A (raffinée) — voir
--   LIVE_VIDEO_PHASE_1E_ARCHITECTURE_DECISION_REPORT.md
--
--   live_programs  = DÉFINITION permanente d'une émission/programme récurrent.
--   cms_lives      = OCCURRENCE réelle d'un Live (+ replay). RÔLE INCHANGÉ.
--   Relation       : live_programs 1 → N cms_lives (cms_lives.program_id NULLABLE).
--
-- 100 % ADDITIVE et backward-compatible :
--   • aucune colonne existante modifiée/supprimée ;
--   • cms_lives.program_id NULLABLE (default NULL) ⇒ toutes les lignes existantes
--     et les Live « spéciaux » (conférence, veillée, cérémonie) restent valides
--     sans programme parent ;
--   • aucune donnée seedée (les constantes legacy divergentes — Matinale, Vendredi —
--     seront arbitrées puis importées dans une phase séparée).
--
-- Réutilise les conventions CMS existantes (gen_random_uuid, slug unique, status,
-- sort_order, timestamps, fonction public.cms_touch_updated_at, RLS lecture
-- publiée / écriture service_role only).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) TABLE live_programs — définition permanente
-- -----------------------------------------------------------------------------
create table if not exists public.live_programs (
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        not null unique,                 -- identifiant éditorial stable
  title               text        not null,
  description         text,
  image_url           text,                                        -- couverture (le front a un fallback)

  -- Récurrence : jours (0=dim … 6=sam) + heure locale + fuseau. weekdays vide =
  -- programme irrégulier (cf. schedule_note). Même heure sur tous les jours listés
  -- (cas 100 % observé — ex. Matinale = {1,3,5} à start_time). Si un jour un
  -- programme exige des heures différentes par jour → table schedules additive (Option C, différée).
  weekdays            smallint[]  not null default '{}',
  start_time          time,                                        -- heure locale récurrente (NULL si irrégulier)
  timezone            text        not null default 'Africa/Abidjan', -- identifiant IANA
  schedule_note       text,                                        -- éditorial / exceptions (« Selon programmation »)

  youtube_playlist_id text,                                        -- 0 ou 1 playlist (scalaire ; jamais N observé)

  is_active           boolean     not null default true,           -- désactivable sans suppression
  status              text        not null default 'draft'
                      check (status in ('draft','published')),
  sort_order          int         not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Domaine des jours : tout élément doit être dans 0..6 (vide autorisé = irrégulier).
  constraint live_programs_weekdays_valid
    check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
);

comment on table public.live_programs is
  'LIVE-VIDEO : définition permanente d''une émission/programme récurrent. Les occurrences réelles vivent dans cms_lives (cms_lives.program_id). Lecture publique si status=published & is_active ; écriture service_role only.';
comment on column public.live_programs.weekdays is
  'Jours de récurrence 0=dimanche..6=samedi. Vide = irrégulier (voir schedule_note).';
comment on column public.live_programs.youtube_playlist_id is
  'ID de playlist YouTube (paramètre list=). Public-safe. 0 ou 1 par programme.';

-- updated_at : réutilise la fonction CMS existante (aucune nouvelle fonction).
drop trigger if exists trg_live_programs_touch on public.live_programs;
create trigger trg_live_programs_touch
  before update on public.live_programs
  for each row execute function public.cms_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 2) cms_lives.program_id — occurrence → programme (additif, non destructif)
-- -----------------------------------------------------------------------------
alter table public.cms_lives
  add column if not exists program_id uuid
    references public.live_programs(id) on delete set null;

comment on column public.cms_lives.program_id is
  'FK NULLABLE vers live_programs. NULL = occurrence sans programme (Live spécial / événement ponctuel). ON DELETE SET NULL : la suppression d''un programme n''efface jamais l''occurrence.';

-- Index de jointure « occurrences / replays d''un programme » (requête réelle 1F-B+).
create index if not exists idx_cms_lives_program
  on public.cms_lives (program_id);

-- -----------------------------------------------------------------------------
-- 3) RLS — aligné sur le pattern CMS (lecture publiée / écriture service_role)
-- -----------------------------------------------------------------------------
alter table public.live_programs enable row level security;

drop policy if exists live_programs_read on public.live_programs;
create policy live_programs_read on public.live_programs for select
  to anon, authenticated using (status = 'published' and is_active = true);

-- Aucune policy insert/update/delete pour anon/authenticated ⇒ écriture service_role
-- uniquement (bypass RLS). cms_lives conserve sa policy cms_lives_read existante
-- inchangée (la nouvelle colonne program_id est exposée par le SELECT * public —
-- non sensible : simple FK).

-- Privilèges FINS (doctrine la plus récente du dépôt : spine podcast + vagues de
-- durcissement anon — jamais GRANT ALL). La RLS filtre les LIGNES ; le GRANT ouvre
-- l'accès TABLE. Sans ce grant, la policy `to anon` resterait inopérante.
grant select on public.live_programs to anon, authenticated;
grant select, insert, update, delete on public.live_programs to service_role;

-- =============================================================================
-- ROLLBACK (référence — NON exécuté) :
--   alter table public.cms_lives drop column if exists program_id;
--   drop index if exists public.idx_cms_lives_program;
--   drop table if exists public.live_programs;   -- (drop trigger/policy en cascade)
-- =============================================================================
