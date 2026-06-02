-- ============================================================================
-- FINITION OUVERTURE — Correction récursion RLS (profiles / formations)
-- ----------------------------------------------------------------------------
-- Les policies « Admins can view all profiles » (profiles) et « Admins manage
-- formations » (formations) faisaient un EXISTS (SELECT … FROM profiles …) EN
-- LIGNE → « infinite recursion detected in policy for relation profiles » dès
-- qu'un client anon lisait ces tables (profil membre, liste des formations).
-- On les réécrit avec is_staff() (SECURITY DEFINER → bypass RLS, sans récursion).
-- Découvert par la QA runtime d'ouverture. Aucune nouvelle table.
-- ============================================================================

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for all using (public.is_staff());

drop policy if exists "Admins manage formations" on public.formations;
create policy "Admins manage formations" on public.formations
  for all using (public.is_staff());
