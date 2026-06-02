-- ============================================================================
-- LOT 4 — CENTRE DE PRIÈRE MONDIAL (Mahanaïm)
-- ----------------------------------------------------------------------------
-- Système complet de prise en charge spirituelle :
--   Demande → Assignation → Intercession → Suivi → Réponse → Témoignage → Impact
-- International dès maintenant (pays/ville/langue). Aucune donnée fictive.
-- Étend priere_demandes (migration 100800) + nouvelles tables. NOUVELLE migration.
-- ============================================================================

-- 0) Rôles Mahanaïm (idempotent, hors transaction d'usage) -------------------
alter type public.user_role add value if not exists 'intercesseur';
alter type public.user_role add value if not exists 'responsable_mahanaim';
alter type public.user_role add value if not exists 'coordinateur';

-- 1) Extension de priere_demandes -------------------------------------------
alter table public.priere_demandes add column if not exists priorite text not null default 'normale';   -- normale | important | urgent | tres_urgent
alter table public.priere_demandes add column if not exists pays text;
alter table public.priere_demandes add column if not exists ville text;
alter table public.priere_demandes add column if not exists langue text not null default 'fr';
alter table public.priere_demandes add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.priere_demandes add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
alter table public.priere_demandes add column if not exists assigned_at timestamptz;
alter table public.priere_demandes add column if not exists responsable_id uuid references public.profiles(id) on delete set null;
alter table public.priere_demandes add column if not exists derniere_action text;
alter table public.priere_demandes add column if not exists derniere_action_at timestamptz;
alter table public.priere_demandes add column if not exists is_public boolean not null default false;
alter table public.priere_demandes add column if not exists prayers_count int not null default 0;
alter table public.priere_demandes add column if not exists reference text;
-- Statut élargi (texte libre) : nouvelle | recue | assignee | en_intercession |
-- en_suivi | reponse_recue | temoignage_soumis | temoignage_valide | archivee
-- (rétro-compatible avec en_priere/traitee/temoignage déjà utilisés).
create index if not exists idx_priere_priorite on public.priere_demandes (priorite);
create index if not exists idx_priere_assigned on public.priere_demandes (assigned_to);
create index if not exists idx_priere_pays on public.priere_demandes (pays);

-- Mur public : lecture des demandes explicitement rendues publiques (validées),
-- en plus de l'ancienne règle (non-anonyme + en cours). Aucune donnée sensible.
drop policy if exists priere_public_read on public.priere_demandes;
create policy priere_public_read on public.priere_demandes for select
  to anon, authenticated
  using (is_public = true or (anonyme = false and statut in ('nouvelle', 'en_priere', 'en_intercession')));

-- 2) Catégories de prière (administrables) -----------------------------------
create table if not exists public.priere_categories (
  id     uuid primary key default gen_random_uuid(),
  slug   text unique not null,
  label  text not null,
  ordre  int  not null default 0,
  actif  boolean not null default true
);
alter table public.priere_categories enable row level security;
drop policy if exists priere_cat_read on public.priere_categories;
create policy priere_cat_read on public.priere_categories for select to anon, authenticated using (true);
insert into public.priere_categories (slug, label, ordre) values
  ('salut','Salut',0),('famille','Famille',1),('mariage','Mariage',2),('sante','Santé',3),
  ('finances','Finances',4),('travail','Travail',5),('etudes','Études',6),('delivrance','Délivrance',7),
  ('direction','Direction divine',8),('ministere','Ministère',9),('nation','Nation',10),('autre','Autre',11)
on conflict (slug) do nothing;

-- 3) Assignations d'intercesseurs (plusieurs par demande + historique) -------
create table if not exists public.priere_assignations (
  id               uuid primary key default gen_random_uuid(),
  demande_id       uuid not null references public.priere_demandes(id) on delete cascade,
  intercesseur_id  uuid references public.profiles(id) on delete set null,
  role             text not null default 'intercesseur',  -- intercesseur | responsable | coordinateur
  assigned_at      timestamptz not null default now(),
  derniere_action  text,
  derniere_action_at timestamptz,
  actif            boolean not null default true
);
create index if not exists idx_priere_assign_demande on public.priere_assignations (demande_id);
create index if not exists idx_priere_assign_inter on public.priere_assignations (intercesseur_id);
alter table public.priere_assignations enable row level security;
drop policy if exists priere_assign_select_own on public.priere_assignations;
create policy priere_assign_select_own on public.priere_assignations for select
  to authenticated using (intercesseur_id = auth.uid());
-- Gestion (création/maj) via service role (back-office Mahanaïm).

-- 4) Témoignages liés (alimentent site / événements / campagnes / stats) -----
create table if not exists public.temoignages (
  id           uuid primary key default gen_random_uuid(),
  demande_id   uuid references public.priere_demandes(id) on delete set null,
  user_id      uuid references public.profiles(id) on delete set null,
  categorie    text,
  titre        text,
  corps        text not null,
  auteur       text,
  pays         text,
  ville        text,
  langue       text not null default 'fr',
  statut       text not null default 'soumis',   -- soumis | valide | rejete
  is_public    boolean not null default false,
  valide_par   uuid references public.profiles(id) on delete set null,
  valide_le    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_temoignages_statut on public.temoignages (statut, is_public);
alter table public.temoignages enable row level security;
-- Lecture publique des témoignages validés ET publics (mur / site / campagnes).
drop policy if exists temoignages_public_read on public.temoignages;
create policy temoignages_public_read on public.temoignages for select
  to anon, authenticated using (statut = 'valide' and is_public = true);
-- Soumission publique (anon/authenticated) ; modération via service role.
drop policy if exists temoignages_insert on public.temoignages;
create policy temoignages_insert on public.temoignages for insert
  to anon, authenticated with check (statut = 'soumis');
