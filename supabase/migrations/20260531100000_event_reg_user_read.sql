-- ============================================================================
-- Lot 1 — Inscriptions événements : lecture de SES propres inscriptions
-- ----------------------------------------------------------------------------
-- Permet à un membre authentifié de lire ses propres inscriptions (pour savoir
-- s'il est déjà inscrit / a posé un rappel). L'insertion publique reste ouverte
-- (policy evtreg_insert). La lecture admin passe par la service role.
-- NOUVELLE migration — ne modifie rien de validé.
-- ============================================================================

drop policy if exists evtreg_select_own on public.event_registrations;
create policy evtreg_select_own on public.event_registrations for select
  to authenticated
  using (user_id = auth.uid());

-- Idem pour les demandes d'adhésion de groupe (le membre voit l'état des siennes).
drop policy if exists gjr_select_own on public.group_join_requests;
create policy gjr_select_own on public.group_join_requests for select
  to authenticated
  using (user_id = auth.uid());
