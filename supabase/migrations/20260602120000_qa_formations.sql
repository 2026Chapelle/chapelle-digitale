-- ============================================================================
-- Q&A FORMATIONS — questions des apprenants & réponses des formateurs
-- ----------------------------------------------------------------------------
-- Table dédiée (remplace l'usage détourné de contact_messages). Additif, RLS.
-- ============================================================================

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
  is_public    boolean     not null default true,        -- visible aux autres apprenants une fois répondue
  created_at   timestamptz not null default now()
);
create index if not exists idx_fq_formation on public.formation_questions (formation_id, created_at desc);
create index if not exists idx_fq_statut on public.formation_questions (statut);

alter table public.formation_questions enable row level security;

-- Soumission : un membre connecté pose SA question.
drop policy if exists fq_insert_own on public.formation_questions;
create policy fq_insert_own on public.formation_questions for insert
  to authenticated with check (user_id = auth.uid());

-- Lecture : ses propres questions OU les questions publiques déjà répondues.
drop policy if exists fq_select on public.formation_questions;
create policy fq_select on public.formation_questions for select
  to authenticated using (user_id = auth.uid() or (is_public = true and statut = 'repondue'));

-- Réponses / modération via service role (back-office formateur).
