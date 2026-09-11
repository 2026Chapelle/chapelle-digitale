-- =============================================================================
-- CITADELLE — LOT ENSEIGNEMENTS 1
-- TEACHING EDITORIAL SPINE
--
-- Série → Saison → Enseignement
-- + access_level public/member/premium
-- + is_featured
--
-- PRINCIPES
--   • séries/saisons propres aux enseignements ; jamais les tables Podcast
--   • series_id / season_id facultatifs sur cms_teachings
--   • suppression d'un conteneur ne détruit jamais un enseignement
--   • accès protégé FAIL-CLOSED :
--       anon/authenticated ne lisent directement que access_level='public'
--   • écriture réservée au service_role via l'administration serveur
-- =============================================================================

-- =============================================================================
-- 1. SERIES D'ENSEIGNEMENTS
-- =============================================================================

create table if not exists public.cms_teaching_series (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  title             text not null,
  short_description text,
  description       text,
  cover_url         text,
  status            text not null default 'draft'
                    check (status in ('draft', 'published')),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint cms_teaching_series_slug_uniq unique (slug)
);

create index if not exists idx_cms_teaching_series_status_order
  on public.cms_teaching_series (status, sort_order);

comment on table public.cms_teaching_series is
  'Conteneur éditorial de premier niveau pour les enseignements, ex. École du Royaume.';

-- =============================================================================
-- 2. SAISONS D'ENSEIGNEMENTS
-- =============================================================================

create table if not exists public.cms_teaching_seasons (
  id                uuid primary key default gen_random_uuid(),
  series_id         uuid not null
                    references public.cms_teaching_series(id)
                    on delete cascade,
  season_number     integer not null check (season_number > 0),
  title             text,
  short_description text,
  description       text,
  cover_url         text,
  status            text not null default 'draft'
                    check (status in ('draft', 'published')),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint cms_teaching_seasons_series_number_uniq
    unique (series_id, season_number)
);

create index if not exists idx_cms_teaching_seasons_series
  on public.cms_teaching_seasons (series_id);

create index if not exists idx_cms_teaching_seasons_status_order
  on public.cms_teaching_seasons (status, sort_order);

comment on table public.cms_teaching_seasons is
  'Saison éditoriale facultative appartenant à une série d''enseignements.';

-- =============================================================================
-- 3. EXTENSION CMS_TEACHINGS
-- =============================================================================

alter table public.cms_teachings
  add column if not exists series_id uuid,
  add column if not exists season_id uuid,
  add column if not exists access_level text not null default 'public',
  add column if not exists is_featured boolean not null default false;

-- Valeurs d'accès canoniques Citadelle.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_teachings_access_level_chk'
  ) then
    alter table public.cms_teachings
      add constraint cms_teachings_access_level_chk
      check (access_level in ('public', 'member', 'premium'));
  end if;
end
$$;

-- Un enseignement avec saison doit nécessairement avoir une série.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_teachings_season_requires_series_chk'
  ) then
    alter table public.cms_teachings
      add constraint cms_teachings_season_requires_series_chk
      check (season_id is null or series_id is not null);
  end if;
end
$$;

-- FK non destructives.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_teachings_series_id_fk'
  ) then
    alter table public.cms_teachings
      add constraint cms_teachings_series_id_fk
      foreign key (series_id)
      references public.cms_teaching_series(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_teachings_season_id_fk'
  ) then
    alter table public.cms_teachings
      add constraint cms_teachings_season_id_fk
      foreign key (season_id)
      references public.cms_teaching_seasons(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_cms_teachings_series_id
  on public.cms_teachings (series_id)
  where series_id is not null;

create index if not exists idx_cms_teachings_season_id
  on public.cms_teachings (season_id)
  where season_id is not null;

create index if not exists idx_cms_teachings_access_level
  on public.cms_teachings (access_level);

create index if not exists idx_cms_teachings_featured
  on public.cms_teachings (is_featured, sort_order)
  where is_featured = true;

-- =============================================================================
-- 4. COHERENCE SAISON → SERIE
--
-- Si season_id est renseigné :
--   • la saison doit exister ;
--   • series_id doit correspondre à sa série.
-- =============================================================================

create or replace function public.cms_validate_teaching_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_series_id uuid;
begin
  if new.season_id is null then
    return new;
  end if;

  select s.series_id
    into expected_series_id
  from public.cms_teaching_seasons s
  where s.id = new.season_id;

  if expected_series_id is null then
    raise exception 'TEACHING_SEASON_NOT_FOUND';
  end if;

  if new.series_id is null then
    new.series_id := expected_series_id;
  elsif new.series_id <> expected_series_id then
    raise exception 'TEACHING_SERIES_SEASON_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cms_teachings_validate_hierarchy
  on public.cms_teachings;

create trigger trg_cms_teachings_validate_hierarchy
before insert or update of series_id, season_id
on public.cms_teachings
for each row
execute function public.cms_validate_teaching_hierarchy();

-- =============================================================================
-- 4B. COHERENCE LORS DU DEPLACEMENT D'UNE SAISON
--
-- Si une saison change de série, tous les enseignements déjà liés à cette
-- saison héritent automatiquement de la nouvelle series_id.
--
-- Cela empêche un état incohérent :
--   teaching.series_id = ancienne série
--   teaching.season_id = saison désormais rattachée à une autre série
-- =============================================================================

create or replace function public.cms_sync_teaching_season_series()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.series_id is distinct from old.series_id then
    update public.cms_teachings
    set series_id = new.series_id
    where season_id = new.id
      and series_id is distinct from new.series_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cms_teaching_season_sync_series
  on public.cms_teaching_seasons;

create trigger trg_cms_teaching_season_sync_series
after update of series_id
on public.cms_teaching_seasons
for each row
execute function public.cms_sync_teaching_season_series();
-- =============================================================================
-- 5. UPDATED_AT
-- Réutilise le trigger CMS existant.
-- =============================================================================

drop trigger if exists trg_cms_teaching_series_touch
  on public.cms_teaching_series;

create trigger trg_cms_teaching_series_touch
before update on public.cms_teaching_series
for each row execute function public.cms_touch_updated_at();

drop trigger if exists trg_cms_teaching_seasons_touch
  on public.cms_teaching_seasons;

create trigger trg_cms_teaching_seasons_touch
before update on public.cms_teaching_seasons
for each row execute function public.cms_touch_updated_at();

-- =============================================================================
-- 6. RLS DES CONTENEURS
-- Métadonnées publiques uniquement lorsque publiées.
-- =============================================================================

alter table public.cms_teaching_series enable row level security;
alter table public.cms_teaching_seasons enable row level security;

drop policy if exists cms_teaching_series_read
  on public.cms_teaching_series;

create policy cms_teaching_series_read
on public.cms_teaching_series
for select
to anon, authenticated
using (status = 'published');

drop policy if exists cms_teaching_seasons_read
  on public.cms_teaching_seasons;

create policy cms_teaching_seasons_read
on public.cms_teaching_seasons
for select
to anon, authenticated
using (status = 'published');

-- =============================================================================
-- 7. RLS CMS_TEACHINGS — FAIL CLOSED
--
-- L'accès direct Supabase ne donne accès qu'aux enseignements PUBLICS publiés.
-- Les contenus MEMBER / PREMIUM devront être résolus côté serveur après
-- authentification et décision d'accès, sur le modèle PODCAST-SEC.
-- =============================================================================

alter table public.cms_teachings enable row level security;

drop policy if exists cms_teachings_read
  on public.cms_teachings;

create policy cms_teachings_read
on public.cms_teachings
for select
to anon, authenticated
using (
  status = 'published'
  and access_level = 'public'
);

-- =============================================================================
-- 8. GRANTS
-- =============================================================================

grant select on public.cms_teaching_series
  to anon, authenticated;

grant select on public.cms_teaching_seasons
  to anon, authenticated;

-- Défense en profondeur :
-- les rôles publics peuvent LIRE les métadonnées publiées via RLS,
-- mais ne peuvent jamais administrer les conteneurs éditoriaux.
revoke insert, update, delete, truncate, references, trigger
  on public.cms_teaching_series
  from PUBLIC, anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.cms_teaching_seasons
  from PUBLIC, anon, authenticated;

grant select, insert, update, delete
  on public.cms_teaching_series
  to service_role;

grant select, insert, update, delete
  on public.cms_teaching_seasons
  to service_role;

-- cms_teachings conserve son modèle d'administration serveur existant.
grant select, insert, update, delete
  on public.cms_teachings
  to service_role;

-- Fonction de validation : aucune utilisation directe nécessaire côté client.
revoke all on function public.cms_validate_teaching_hierarchy()
  from PUBLIC, anon, authenticated;

grant execute on function public.cms_validate_teaching_hierarchy()
  to service_role;

revoke all on function public.cms_sync_teaching_season_series()
  from PUBLIC, anon, authenticated;

grant execute on function public.cms_sync_teaching_season_series()
  to service_role;

-- =============================================================================
-- FIN
-- =============================================================================