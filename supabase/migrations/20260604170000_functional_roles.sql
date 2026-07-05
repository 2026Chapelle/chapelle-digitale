-- ============================================================================
-- RBAC — RÔLES FONCTIONNELS (additif)
-- ----------------------------------------------------------------------------
-- Rend assignables les rôles fonctionnels utilisés par le contrôle d'accès.
-- Additif et conservateur : n'enlève aucune valeur, ne touche aucune donnée.
-- La journalisation des changements de rôle réutilise public.pastoral_actions_log
-- (action = 'set_role'). Aucune nouvelle table.
-- ============================================================================

alter type public.user_role add value if not exists 'formateur';
alter type public.user_role add value if not exists 'responsable_integration';
alter type public.user_role add value if not exists 'responsable_national';
alter type public.user_role add value if not exists 'pasteur_national';

notify pgrst, 'reload schema';
