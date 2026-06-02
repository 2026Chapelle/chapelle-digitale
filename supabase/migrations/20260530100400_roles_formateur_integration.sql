-- ============================================================================
-- RÔLES — Formateur & Responsable intégration
-- ----------------------------------------------------------------------------
-- Étend l'enum public.user_role avec deux rôles métiers nécessaires aux
-- dashboards spécialisés. `ADD VALUE IF NOT EXISTS` est idempotent (PG 12+).
-- Aucune utilisation de ces valeurs dans la même migration (contrainte PG).
-- ============================================================================

alter type public.user_role add value if not exists 'formateur';
alter type public.user_role add value if not exists 'responsable_integration';
