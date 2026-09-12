-- ============================================================================
-- CITADELLE — LOT ENSEIGNEMENTS 2.2
-- Hardening des privilèges cms_teaching_comments
--
-- Objectif :
-- anon/authenticated = SELECT uniquement.
-- service_role       = tous privilèges serveur.
--
-- Aucune mutation de données.
-- ============================================================================

revoke all privileges
on table public.cms_teaching_comments
from anon, authenticated;

grant select
on table public.cms_teaching_comments
to anon, authenticated;

grant all privileges
on table public.cms_teaching_comments
to service_role;