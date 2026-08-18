-- =============================================================================
-- PODCAST-SPINE — modèle éditorial hiérarchique « La Voix du Royaume »
--   Émission → Série mensuelle → Saison thématique → Épisode
-- =============================================================================
-- Graduée après GO explicite (GO MIGRATION — PODCAST SHOWS / SERIES / SEASONS).
--
-- POURQUOI : le modèle actuel n'a qu'UN axe de regroupement (cms_podcasts.serie,
--            texte libre, migration 20260812153000) + un `saison INT` dormant.
--            L'architecture cible exige trois conteneurs éditoriaux nommés, avec
--            leurs propres slugs / couvertures / descriptions / ordre, plus une
--            typologie d'épisode (standard / special) et des champs pastoraux
--            optionnels par épisode. Ce lot pose UNIQUEMENT le SPINE DE DONNÉES.
--
-- PÉRIMÈTRE STRICT (cf. GO) :
--   • 100 % ADDITIF. Aucune colonne existante modifiée/supprimée. Aucun DROP.
--   • AUCUN backfill, AUCUNE curation : ni Émission, ni Série, ni Saison créées.
--     Les tables parents restent VIDES → l'app live ignore simplement les
--     nouvelles colonnes (toutes NULL / defaults) et sert le legacy `serie`.
--   • access_level / destinations / home_instant / is_featured : INCHANGÉS.
--     Cette migration ne lit ni ne recalcule aucun niveau d'accès.
--   • Compat legacy : series_id IS NULL ⇒ fallback legacy `cms_podcasts.serie`.
--     Les nouveaux FK sont NULLABLES → tous les épisodes existants restent NULL.
--
-- SÉCURITÉ (discipline projet, privilèges FINS — jamais GRANT ALL) :
--   • Tables parents = contenu éditorial PUBLIC : RLS activée, lecture
--     anon/authenticated LIMITÉE à status='published' (une entité `draft` ne
--     devient jamais publique par accident). service_role = CRUD admin serveur.
--   • cms_podcasts : PODCAST-SEC (20260813090000) a reconstruit le SELECT
--     anon/authenticated en LISTE EXPLICITE de colonnes (verrou média audio_url/
--     youtube_url). Les nouvelles colonnes seraient donc INVISIBLES à anon/auth.
--     → On RÉ-EXÉCUTE le même bloc dynamique (toutes colonnes SAUF les 2 médias)
--       pour ré-accorder le SELECT en incluant les nouvelles colonnes. On
--       n'ouvre RIEN de plus que le périmètre déjà public.
--
-- IDEMPOTENT : `create table if not exists`, `add column if not exists`,
--   contraintes gardées, `drop policy if exists`. Rejouable via `supabase db
--   reset` / `migration up` selon les conventions du projet.
-- =============================================================================

-- =============================================================================
-- 1) TABLE PARENT — cms_podcast_shows (ÉMISSION)
--    Une Émission regroupe plusieurs Séries.
-- =============================================================================
create table if not exists public.cms_podcast_shows (
  id                uuid        primary key default gen_random_uuid(),
  slug              text        not null unique,                 -- identifiant éditorial stable, unique global (peu de shows)
  title             text        not null,
  short_description text,
  description       text,
  cover_url         text,                                        -- optionnelle (le front a un fallback)
  sort_order        int         not null default 0,              -- ordre éditorial explicite (jamais dérivé d'un timestamp)
  status            text        not null default 'draft'
                    check (status in ('draft','published')),     -- draft | published (pas de scheduled : non nécessaire ici)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.cms_podcast_shows is
  'PODCAST-SPINE : Émission (niveau 1). Conteneur éditorial de Séries. Contenu public publié uniquement (RLS).';

-- =============================================================================
-- 2) TABLE PARENT — cms_podcast_series (SÉRIE MENSUELLE)
--    Chaque Série appartient à une Émission. Slug unique PAR émission
--    (deux émissions distinctes peuvent légitimement réutiliser un même slug).
-- =============================================================================
create table if not exists public.cms_podcast_series (
  id                uuid        primary key default gen_random_uuid(),
  show_id           uuid        not null references public.cms_podcast_shows(id) on delete cascade,
  slug              text        not null,
  title             text        not null,
  short_description text,
  description       text,
  cover_url         text,
  editorial_period  text,                                        -- ex: "Août 2026" (série mensuelle) — libre, optionnel
  sort_order        int         not null default 0,
  status            text        not null default 'draft'
                    check (status in ('draft','published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint cms_podcast_series_show_slug_uniq unique (show_id, slug)
);

create index if not exists idx_cms_podcast_series_show
  on public.cms_podcast_series (show_id);

comment on table public.cms_podcast_series is
  'PODCAST-SPINE : Série mensuelle (niveau 2). Appartient à une Émission (show_id). slug unique par émission.';

-- =============================================================================
-- 3) TABLE PARENT — cms_podcast_seasons (SAISON THÉMATIQUE)
--    Chaque Saison appartient à une Série. Identifiant = season_number,
--    unique PAR série. (La navigation front se fait par ?saison=N.)
-- =============================================================================
create table if not exists public.cms_podcast_seasons (
  id                uuid        primary key default gen_random_uuid(),
  series_id         uuid        not null references public.cms_podcast_series(id) on delete cascade,
  season_number     int         not null,
  title             text,                                        -- thème de saison (nullable : fallback "Saison N")
  short_description text,
  description       text,
  cover_url         text,                                        -- optionnelle
  sort_order        int         not null default 0,
  status            text        not null default 'draft'
                    check (status in ('draft','published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint cms_podcast_seasons_series_number_uniq unique (series_id, season_number)
);

create index if not exists idx_cms_podcast_seasons_series
  on public.cms_podcast_seasons (series_id);

comment on table public.cms_podcast_seasons is
  'PODCAST-SPINE : Saison thématique (niveau 3). Appartient à une Série (series_id). Identifiant season_number unique par série.';

-- =============================================================================
-- 4) EXTENSION cms_podcasts — FK hiérarchiques + typologie + champs pastoraux
--    Tous NULLABLES (episode_type a un défaut). ON DELETE SET NULL : supprimer
--    un conteneur ne DÉTRUIT JAMAIS un épisode — il retombe sur le legacy `serie`.
-- =============================================================================
alter table public.cms_podcasts
  add column if not exists show_id          uuid,
  add column if not exists series_id        uuid,
  add column if not exists season_id        uuid,
  add column if not exists episode_type     text not null default 'standard',   -- existant ⇒ 'standard'
  add column if not exists a_retenir        text,                               -- « À retenir » (optionnel, CMS)
  add column if not exists prayer_text      text,                               -- prière (optionnel, CMS)
  add column if not exists declaration_text text;                               -- déclaration (optionnel, CMS)

-- Contrainte de valeur episode_type (gardée : ne casse pas l'existant → 'standard').
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cms_podcasts_episode_type_chk'
  ) then
    alter table public.cms_podcasts
      add constraint cms_podcasts_episode_type_chk
      check (episode_type in ('standard','special'));
  end if;
end$$;

-- FK hiérarchiques (gardées). ON DELETE SET NULL = non destructif pour l'épisode.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cms_podcasts_show_id_fk') then
    alter table public.cms_podcasts
      add constraint cms_podcasts_show_id_fk
      foreign key (show_id) references public.cms_podcast_shows(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cms_podcasts_series_id_fk') then
    alter table public.cms_podcasts
      add constraint cms_podcasts_series_id_fk
      foreign key (series_id) references public.cms_podcast_series(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cms_podcasts_season_id_fk') then
    alter table public.cms_podcasts
      add constraint cms_podcasts_season_id_fk
      foreign key (season_id) references public.cms_podcast_seasons(id) on delete set null;
  end if;
end$$;

-- Index de résolution (partiels : ignorent la majorité legacy à FK NULL).
create index if not exists idx_cms_podcasts_show_id
  on public.cms_podcasts (show_id)   where show_id   is not null;
create index if not exists idx_cms_podcasts_series_id
  on public.cms_podcasts (series_id) where series_id is not null;
create index if not exists idx_cms_podcasts_season_id
  on public.cms_podcasts (season_id) where season_id is not null;
create index if not exists idx_cms_podcasts_episode_type
  on public.cms_podcasts (episode_type) where episode_type = 'special';

-- =============================================================================
-- 5) updated_at — réutilise le trigger CMS existant (public.cms_touch_updated_at)
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['cms_podcast_shows','cms_podcast_series','cms_podcast_seasons'] loop
    execute format('drop trigger if exists trg_%1$s_touch on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_touch before update on public.%1$s
         for each row execute function public.cms_touch_updated_at();', t);
  end loop;
end$$;

-- =============================================================================
-- 6) RLS + GRANTS — tables parents (lecture publique = publié uniquement)
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['cms_podcast_shows','cms_podcast_series','cms_podcast_seasons'] loop
    execute format('alter table public.%I enable row level security;', t);
    -- Lecture publique restreinte au statut publié (draft jamais exposé).
    execute format('drop policy if exists %1$s_read on public.%1$s;', t);
    execute format(
      'create policy %1$s_read on public.%1$s for select
         to anon, authenticated using (status = ''published'');', t);
    -- Privilèges FINS : lecture publique ; écriture réservée à service_role (admin serveur).
    execute format('grant select on public.%I to anon, authenticated;', t);
    execute format('grant select, insert, update, delete on public.%I to service_role;', t);
  end loop;
end$$;

-- =============================================================================
-- 7) cms_podcasts — RÉ-ACCORDER le SELECT colonne à anon/authenticated
--    (inclut les NOUVELLES colonnes ; conserve le verrou média PODCAST-SEC).
--    Bloc IDENTIQUE à 20260813090000 : révoque le SELECT table puis ré-accorde
--    toutes les colonnes SAUF audio_url / youtube_url (liste dynamique).
-- =============================================================================
do $$
declare
  safe_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into safe_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name  = 'cms_podcasts'
    and column_name not in ('audio_url', 'youtube_url');

  execute 'revoke select on public.cms_podcasts from anon, authenticated';
  execute format('grant select (%s) on public.cms_podcasts to anon, authenticated', safe_cols);
end;
$$;

-- service_role conserve son SELECT table complet (PODCAST-SEC) → nouvelles
-- colonnes automatiquement lisibles. Écriture admin inchangée (service_role).

-- =============================================================================
-- ROLLBACK (purement additif, sûr — pour référence, NON exécuté) --------------
-- alter table public.cms_podcasts
--   drop constraint if exists cms_podcasts_show_id_fk,
--   drop constraint if exists cms_podcasts_series_id_fk,
--   drop constraint if exists cms_podcasts_season_id_fk,
--   drop constraint if exists cms_podcasts_episode_type_chk;
-- alter table public.cms_podcasts
--   drop column if exists show_id, drop column if exists series_id,
--   drop column if exists season_id, drop column if exists episode_type,
--   drop column if exists a_retenir, drop column if exists prayer_text,
--   drop column if exists declaration_text;
-- drop table if exists public.cms_podcast_seasons;
-- drop table if exists public.cms_podcast_series;
-- drop table if exists public.cms_podcast_shows;
-- =============================================================================
