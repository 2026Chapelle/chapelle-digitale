-- ============================================================================
-- FINITION OUVERTURE — Lecture publique des formations publiées
-- ----------------------------------------------------------------------------
-- La table public.formations n'exposait pas de lecture anon des formations
-- publiées : les membres ne voyaient donc aucune formation à rejoindre.
-- On ajoute une policy SELECT (anon + authenticated) limitée au statut 'publie'.
-- Aucune nouvelle table. Découvert par la QA runtime d'ouverture.
-- ============================================================================

alter table public.formations enable row level security;

drop policy if exists formations_public_read on public.formations;
create policy formations_public_read on public.formations for select
  to anon, authenticated
  using (statut = 'publie');
