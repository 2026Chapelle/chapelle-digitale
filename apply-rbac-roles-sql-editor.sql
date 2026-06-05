-- ============================================================================
-- RBAC — RÔLES FONCTIONNELS (à exécuter dans Supabase SQL Editor)
-- Rend assignables les rôles fonctionnels. Additif, idempotent.
-- Si une erreur « cannot run inside a transaction block » apparaît, exécuter
-- chaque ligne ALTER séparément. La journalisation réutilise pastoral_actions_log.
-- ============================================================================

alter type public.user_role add value if not exists 'formateur';
alter type public.user_role add value if not exists 'responsable_integration';
alter type public.user_role add value if not exists 'responsable_national';
alter type public.user_role add value if not exists 'pasteur_national';

notify pgrst, 'reload schema';
