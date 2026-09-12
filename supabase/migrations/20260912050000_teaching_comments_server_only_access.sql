-- ============================================================================
-- CITADELLE — LOT ENSEIGNEMENTS 2.2
-- Commentaires enseignements : accès serveur uniquement
--
-- Les clients anon/authenticated ne doivent pas lire ni écrire directement
-- dans cette table.
--
-- Toutes les lectures et écritures passent par les routes serveur Citadelle,
-- qui appliquent :
-- - l'accès Public / Member / Premium de l'enseignement ;
-- - la publication des seuls commentaires modérés ;
-- - l'identité vérifiée pour les soumissions.
-- ============================================================================

drop policy if exists cms_teaching_comments_read
on public.cms_teaching_comments;

revoke all privileges
on table public.cms_teaching_comments
from anon, authenticated;

grant all privileges
on table public.cms_teaching_comments
to service_role;

comment on table public.cms_teaching_comments is
'Commentaires modérés liés aux enseignements Citadelle. Accès direct client interdit ; lecture et écriture via routes serveur uniquement.';