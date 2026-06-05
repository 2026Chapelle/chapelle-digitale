-- ============================================================================
-- STABILISATION LOT A — SCHÉMA (à exécuter dans Supabase SQL Editor)
-- ----------------------------------------------------------------------------
-- Crée les tables manquantes nécessaires au flux d'intégration :
--   1) formation_questions  (Q&A des apprenants) — corrige l'erreur
--      « Could not find the table public.formation_questions ».
--   2) membre_statut_history (historique des montées de statut).
-- Idempotent (create table IF NOT EXISTS). Recharge le cache PostgREST à la fin.
-- ============================================================================

-- 1) Q&A FORMATIONS ----------------------------------------------------------
create table if not exists public.formation_questions (
  id           uuid        primary key default gen_random_uuid(),
  formation_id uuid        references public.formations(id) on delete cascade,
  module_id    uuid        references public.formation_modules(id) on delete set null,
  user_id      uuid        references public.profiles(id) on delete set null,
  auteur       text,
  email        text,
  question     text        not null,
  reponse      text,
  repondu_par  uuid        references public.profiles(id) on delete set null,
  repondu_le   timestamptz,
  statut       text        not null default 'ouverte',  -- ouverte | repondue
  is_public    boolean     not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_fq_formation on public.formation_questions (formation_id, created_at desc);
create index if not exists idx_fq_statut on public.formation_questions (statut);

alter table public.formation_questions enable row level security;
drop policy if exists fq_insert_own on public.formation_questions;
create policy fq_insert_own on public.formation_questions for insert
  to authenticated with check (user_id = auth.uid());
drop policy if exists fq_select on public.formation_questions;
create policy fq_select on public.formation_questions for select
  to authenticated using (user_id = auth.uid() or (is_public = true and statut = 'repondue'));

-- 2) HISTORIQUE STATUT MEMBRE ------------------------------------------------
create table if not exists public.membre_statut_history (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  ancien_statut  text,
  nouveau_statut text        not null,
  source         text,
  created_at     timestamptz  not null default now()
);
create index if not exists idx_msh_user on public.membre_statut_history (user_id, created_at desc);

alter table public.membre_statut_history enable row level security;
drop policy if exists msh_select_own on public.membre_statut_history;
create policy msh_select_own on public.membre_statut_history for select
  to authenticated using (user_id = auth.uid());

-- 3) Recharge le cache de schéma (sinon PostgREST ne « voit » pas les tables) -
notify pgrst, 'reload schema';
