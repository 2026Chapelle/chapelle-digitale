-- ============================================================================
-- LOT 3 — LMS ecclésial : modules, progression réelle, parcours, certificats
-- ----------------------------------------------------------------------------
-- Objectif Royaume : accompagner Visiteur → Converti → Membre → Disciple →
-- Serviteur → Responsable → Envoyé. Tout est REbrançable multi-pays/langue
-- (colonnes langue/pays prévues) sans dette future. NOUVELLE migration.
-- ============================================================================

-- 1) Modules de formation ----------------------------------------------------
create table if not exists public.formation_modules (
  id            uuid        primary key default gen_random_uuid(),
  formation_id  uuid        not null references public.formations(id) on delete cascade,
  ordre         int         not null default 0,
  titre         text        not null,
  description   text,
  type          text        not null default 'video',  -- video | youtube | pdf | texte | quiz
  youtube_id    text,                                   -- vidéo YouTube NON répertoriée (id seul)
  video_url     text,
  pdf_url       text,                                   -- PDF attaché (Storage ou cms_media)
  contenu_texte text,
  duree_minutes int         not null default 0,
  acces_min_statut text     not null default 'membre',  -- public | membre | membre_actif | disciple | leader
  prerequis_module_id uuid  references public.formation_modules(id) on delete set null,
  langue        text        not null default 'fr',
  status        text        not null default 'published', -- draft | published
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_fmod_formation on public.formation_modules (formation_id, ordre);

alter table public.formation_modules enable row level security;
drop policy if exists fmod_read on public.formation_modules;
create policy fmod_read on public.formation_modules for select
  to anon, authenticated using (status = 'published');
-- Écriture via service role (back-office).

-- 2) Complétions de modules (progression RÉELLE par membre) ------------------
create table if not exists public.module_completions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  module_id     uuid        not null references public.formation_modules(id) on delete cascade,
  formation_id  uuid        references public.formations(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (user_id, module_id)
);
create index if not exists idx_modcompl_user on public.module_completions (user_id, formation_id);

alter table public.module_completions enable row level security;
drop policy if exists modcompl_select_own on public.module_completions;
create policy modcompl_select_own on public.module_completions for select
  to authenticated using (user_id = auth.uid());
drop policy if exists modcompl_insert_own on public.module_completions;
create policy modcompl_insert_own on public.module_completions for insert
  to authenticated with check (user_id = auth.uid());
drop policy if exists modcompl_delete_own on public.module_completions;
create policy modcompl_delete_own on public.module_completions for delete
  to authenticated using (user_id = auth.uid());

-- 3) Parcours de transformation (Nouveau Converti, Vie de Prière, Discipulat…) -
create table if not exists public.parcours (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        unique not null,
  titre         text        not null,
  description   text,
  categorie     text,        -- conversion | priere | saint_esprit | discipulat | leadership | ministere | famille | finances
  etape_tunnel  text,        -- visiteur | converti | membre | disciple | serviteur | responsable | envoye
  cover_url     text,
  langue        text        not null default 'fr',
  ordre         int         not null default 0,
  status        text        not null default 'published',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create table if not exists public.parcours_formations (
  id            uuid        primary key default gen_random_uuid(),
  parcours_id   uuid        not null references public.parcours(id) on delete cascade,
  formation_id  uuid        not null references public.formations(id) on delete cascade,
  ordre         int         not null default 0,
  unique (parcours_id, formation_id)
);
alter table public.parcours enable row level security;
alter table public.parcours_formations enable row level security;
drop policy if exists parcours_read on public.parcours;
create policy parcours_read on public.parcours for select to anon, authenticated using (status = 'published');
drop policy if exists parcours_form_read on public.parcours_formations;
create policy parcours_form_read on public.parcours_formations for select to anon, authenticated using (true);

-- 4) Certificats (fondation — validation pastorale) --------------------------
create table if not exists public.certificats (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  formation_id  uuid        references public.formations(id) on delete set null,
  parcours_id   uuid        references public.parcours(id) on delete set null,
  type          text        not null default 'formation', -- formation | parcours
  titre         text        not null,
  delivre_le    timestamptz not null default now(),
  valide_par    uuid        references public.profiles(id) on delete set null,
  reference     text
);
create index if not exists idx_certif_user on public.certificats (user_id);
alter table public.certificats enable row level security;
drop policy if exists certif_select_own on public.certificats;
create policy certif_select_own on public.certificats for select to authenticated using (user_id = auth.uid());

-- NB : badges déjà couverts par public.user_badges (migration 001).
