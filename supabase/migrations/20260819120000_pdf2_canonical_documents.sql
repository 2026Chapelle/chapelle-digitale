-- ============================================================================
-- CITADELLE PDF-2 — Ressource PDF canonique + rattachement multi-destination
-- ----------------------------------------------------------------------------
-- OBJECTIF : faire de cms_media (type='pdf') l'ENTITÉ CANONIQUE unique des
-- documents PDF, et permettre « 1 document → N destinations » SANS dupliquer le
-- fichier, via une table de jonction à FK TYPÉES (intégrité référentielle réelle).
--
-- PRINCIPE (règle des acquis) : on ÉTEND, on ne remplace pas. Aucune table
-- concurrente à cms_media. 100 % ADDITIF : ADD COLUMN IF NOT EXISTS + nouvelle
-- table + index/RLS. AUCUN drop, AUCUN rename, AUCUNE colonne legacy retirée,
-- AUCUN déplacement Storage, AUCUNE donnée de masse migrée.
--
-- TROIS AXES SÉPARÉS (jamais confondus dans une colonne magique) :
--   • NATURE      → cms_media.document_type (livre|manuel|guide|déclaration…)
--   • DESTINATION → table cms_document_links (rattachement à des entités typées)
--   • ACCÈS       → cms_media.access_level (public|member|premium) — ÉDITORIAL
--                   uniquement en PDF-2 ; l'enforcement réel (bucket privé + URL
--                   signée + has_entitlement) relève de PDF-3. La RLS de
--                   cms_media n'est PAS modifiée ici (pas de fausse sécurité).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) cms_media — colonnes documentaires additives (toutes nullable/safe-default)
-- ----------------------------------------------------------------------------
alter table public.cms_media
  add column if not exists slug               text,
  add column if not exists document_type      text,
  add column if not exists description        text,
  add column if not exists page_count         int,
  add column if not exists author             text,
  add column if not exists access_level       text    not null default 'public',
  add column if not exists published_at       timestamptz,
  add column if not exists storage_bucket     text,
  add column if not exists storage_path       text,
  add column if not exists checksum_sha256    text,
  add column if not exists visible_in_library boolean not null default true;

comment on column public.cms_media.slug is
  'PDF-2 : identifiant lisible optionnel (unicité partielle). L''identité primaire reste id (uuid).';
comment on column public.cms_media.document_type is
  'PDF-2 : NATURE du document (livre|livret|manuel|workbook|support_cours|fiche_etude|guide|declaration|programme|ressource|autre). Distinct de cms_media.type (=type média).';
comment on column public.cms_media.access_level is
  'PDF-2 : métadonnée ÉDITORIALE (public|member|premium). N''est PAS un verrou : l''enforcement réel = PDF-3 (bucket privé + URL signée + has_entitlement).';
comment on column public.cms_media.storage_path is
  'PDF-2 : chemin objet Storage (bucket+key) — l''identité du document ne doit pas être son URL publique. Nullable (backfill best-effort).';
comment on column public.cms_media.visible_in_library is
  'PDF-2 : la bibliothèque est une VUE du registre — un document peut être masqué de la bibliothèque tout en restant rattaché à des destinations.';

-- Garde-fous de valeurs (tolèrent NULL — additif, ne casse aucune ligne existante).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cms_media_access_level_chk') then
    alter table public.cms_media
      add constraint cms_media_access_level_chk
      check (access_level in ('public','member','premium'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cms_media_document_type_chk') then
    alter table public.cms_media
      add constraint cms_media_document_type_chk
      check (document_type is null or document_type in
        ('livre','livret','manuel','workbook','support_cours','fiche_etude',
         'guide','declaration','programme','ressource','autre'));
  end if;
end$$;

-- Slug unique MAIS partiel (autorise l'immense majorité NULL des médias non-PDF).
create unique index if not exists idx_cms_media_slug
  on public.cms_media (slug) where slug is not null;

-- Chemin d'accès « bibliothèque » : PDF publiés visibles, triés.
create index if not exists idx_cms_media_library
  on public.cms_media (type, status, visible_in_library, sort_order);

-- ----------------------------------------------------------------------------
-- 2) cms_document_links — rattachement « 1 document → N destinations » (FK typées)
-- ----------------------------------------------------------------------------
-- Modèle : jonction dédiée, UNE colonne FK NULLABLE par famille de cible, +
-- contrainte « exactement UNE cible non-nulle ». Fusion des patterns éprouvés
-- parcours_formations (FK + CASCADE + unique) et audio_playlist_items (position).
-- PAS de resource_type/resource_id textuel (aucune intégrité) : chaque cible a
-- une PK uuid ⇒ FK réelle ⇒ orphelins impossibles.
create table if not exists public.cms_document_links (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.cms_media(id)            on delete cascade,

  -- Cibles typées (toutes NULLABLES ; exactement une renseignée par ligne).
  parcours_id       uuid references public.parcours(id)                      on delete cascade,
  formation_id      uuid references public.formations(id)                    on delete cascade,
  module_id         uuid references public.formation_modules(id)             on delete cascade,
  teaching_id       uuid references public.cms_teachings(id)                 on delete cascade,
  podcast_id        uuid references public.cms_podcasts(id)                  on delete cascade,
  show_id           uuid references public.cms_podcast_shows(id)             on delete cascade,
  series_id         uuid references public.cms_podcast_series(id)            on delete cascade,
  season_id         uuid references public.cms_podcast_seasons(id)           on delete cascade,
  event_id          uuid references public.cms_events(id)                    on delete cascade,
  academy_module_id uuid references public.academy_modules(id)              on delete cascade,
  academy_lesson_id uuid references public.academy_lessons(id)              on delete cascade,

  role              text not null default 'attachment'
                      check (role in ('attachment','download','annexe','reference')),
  position          int  not null default 0,
  status            text not null default 'published'
                      check (status in ('draft','published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- « Exactement UNE cible non-nulle » : pas de lien ambigu, pas de pseudo-polymorphisme.
  constraint cms_document_links_one_target_chk check (
    ( (parcours_id       is not null)::int + (formation_id      is not null)::int
    + (module_id         is not null)::int + (teaching_id       is not null)::int
    + (podcast_id        is not null)::int + (show_id           is not null)::int
    + (series_id         is not null)::int + (season_id         is not null)::int
    + (event_id          is not null)::int + (academy_module_id is not null)::int
    + (academy_lesson_id is not null)::int ) = 1
  )
);

comment on table public.cms_document_links is
  'PDF-2 : rattachement « 1 document (cms_media) → N destinations » avec intégrité FK réelle. Supprimer un lien ≠ supprimer le document. Supprimer une cible → seul le lien concerné tombe (CASCADE).';

-- Index : « destinations d'un document » (document_id) + « documents d'une cible »
-- (index PARTIELS par famille, n'indexent que les lignes concernées → coût maîtrisé).
create index if not exists idx_cms_doc_links_document on public.cms_document_links (document_id);
create index if not exists idx_cms_doc_links_parcours  on public.cms_document_links (parcours_id)       where parcours_id       is not null;
create index if not exists idx_cms_doc_links_formation on public.cms_document_links (formation_id)      where formation_id      is not null;
create index if not exists idx_cms_doc_links_module    on public.cms_document_links (module_id)         where module_id         is not null;
create index if not exists idx_cms_doc_links_teaching  on public.cms_document_links (teaching_id)       where teaching_id       is not null;
create index if not exists idx_cms_doc_links_podcast   on public.cms_document_links (podcast_id)        where podcast_id        is not null;
create index if not exists idx_cms_doc_links_show      on public.cms_document_links (show_id)           where show_id           is not null;
create index if not exists idx_cms_doc_links_series    on public.cms_document_links (series_id)         where series_id         is not null;
create index if not exists idx_cms_doc_links_season    on public.cms_document_links (season_id)         where season_id         is not null;
create index if not exists idx_cms_doc_links_event     on public.cms_document_links (event_id)          where event_id          is not null;
create index if not exists idx_cms_doc_links_acadmod   on public.cms_document_links (academy_module_id) where academy_module_id is not null;
create index if not exists idx_cms_doc_links_acadles   on public.cms_document_links (academy_lesson_id) where academy_lesson_id is not null;

-- Anti-doublon : un document rattaché AU PLUS une fois à la même cible (par famille).
create unique index if not exists uq_cms_doc_links_parcours  on public.cms_document_links (document_id, parcours_id)       where parcours_id       is not null;
create unique index if not exists uq_cms_doc_links_formation on public.cms_document_links (document_id, formation_id)      where formation_id      is not null;
create unique index if not exists uq_cms_doc_links_module    on public.cms_document_links (document_id, module_id)         where module_id         is not null;
create unique index if not exists uq_cms_doc_links_teaching  on public.cms_document_links (document_id, teaching_id)       where teaching_id       is not null;
create unique index if not exists uq_cms_doc_links_podcast   on public.cms_document_links (document_id, podcast_id)        where podcast_id        is not null;
create unique index if not exists uq_cms_doc_links_show      on public.cms_document_links (document_id, show_id)           where show_id           is not null;
create unique index if not exists uq_cms_doc_links_series    on public.cms_document_links (document_id, series_id)         where series_id         is not null;
create unique index if not exists uq_cms_doc_links_season    on public.cms_document_links (document_id, season_id)         where season_id         is not null;
create unique index if not exists uq_cms_doc_links_event     on public.cms_document_links (document_id, event_id)          where event_id          is not null;
create unique index if not exists uq_cms_doc_links_acadmod   on public.cms_document_links (document_id, academy_module_id) where academy_module_id is not null;
create unique index if not exists uq_cms_doc_links_acadles   on public.cms_document_links (document_id, academy_lesson_id) where academy_lesson_id is not null;

-- Trigger updated_at (réutilise la fonction du CMS core — acquis).
drop trigger if exists trg_cms_document_links_touch on public.cms_document_links;
create trigger trg_cms_document_links_touch before update on public.cms_document_links
  for each row execute function public.cms_touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3) RLS — lecture publique des liens PUBLIÉS, écriture service_role uniquement
-- ----------------------------------------------------------------------------
-- (Aligné/plus strict que parcours_formations qui lit `using(true)`.) Pas de
-- fonction SECURITY DEFINER ajoutée : la dérivation « cible publiée » et le vrai
-- gate d'accès relèvent de PDF-3. Le document lui-même reste protégé par la RLS
-- de cms_media (status='published'), inchangée.
alter table public.cms_document_links enable row level security;

drop policy if exists cms_document_links_read on public.cms_document_links;
create policy cms_document_links_read on public.cms_document_links for select
  to anon, authenticated using (status = 'published');

-- Aucune policy insert/update/delete pour anon/authenticated : écriture réservée
-- au back-office via service_role (bypass RLS), exactement comme les autres CMS.
grant select on public.cms_document_links to anon, authenticated;
grant select, insert, update, delete on public.cms_document_links to service_role;
