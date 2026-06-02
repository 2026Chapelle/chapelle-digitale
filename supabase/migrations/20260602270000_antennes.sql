-- ============================================================================
-- MULTI-ANTENNES — Chapelle Royale Abidjan / Canada / Europe (+ futures)
-- ----------------------------------------------------------------------------
-- Fondation du Centre de Commandement Apostolique : chaque antenne a son
-- responsable, ses membres, ses événements, ses statistiques — le Super Admin
-- pilote l'ensemble. Conçu pour l'échelle (multi-pays, multi-devises).
-- Additif et idempotent. Réutilise profiles (rattachement via antenne_id).
-- ============================================================================

create table if not exists public.antennes (
  id             uuid        primary key default gen_random_uuid(),
  nom            text        not null,
  slug           text        unique not null,
  pays           text,                                   -- code pays (CI, CA, FR…)
  ville          text,
  fuseau         text,                                   -- ex. 'Africa/Abidjan'
  devise         text        not null default 'FCFA',    -- devise locale par défaut
  responsable_id uuid        references public.profiles(id) on delete set null,
  parent_id      uuid        references public.antennes(id) on delete set null, -- hiérarchie (antenne mère)
  description    text,
  cover_url      text,
  actif          boolean     not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists idx_antennes_pays on public.antennes (pays);
create index if not exists idx_antennes_responsable on public.antennes (responsable_id);
create index if not exists idx_antennes_actif on public.antennes (actif);
alter table public.antennes enable row level security;
drop policy if exists antennes_read on public.antennes;
create policy antennes_read on public.antennes for select to anon, authenticated using (actif = true);
-- Écriture : service role (back-office) uniquement.

-- Rattachement d'un membre à une antenne (additif, scope du Centre de Commandement).
alter table public.profiles add column if not exists antenne_id uuid references public.antennes(id) on delete set null;
create index if not exists idx_profiles_antenne on public.profiles (antenne_id);

-- Rattachement optionnel des événements / dons à une antenne (stats par antenne).
alter table public.evenements add column if not exists antenne_id uuid references public.antennes(id) on delete set null;
alter table public.dons add column if not exists antenne_id uuid references public.antennes(id) on delete set null;

-- Seed des antennes connues (idempotent).
insert into public.antennes (nom, slug, pays, ville, fuseau, devise) values
  ('Chapelle Royale Abidjan', 'abidjan', 'CI', 'Abidjan', 'Africa/Abidjan', 'FCFA'),
  ('Chapelle Royale Canada', 'canada', 'CA', 'Montréal', 'America/Toronto', 'CAD'),
  ('Chapelle Royale Europe', 'europe', 'FR', 'Paris', 'Europe/Paris', 'EUR')
on conflict (slug) do nothing;
