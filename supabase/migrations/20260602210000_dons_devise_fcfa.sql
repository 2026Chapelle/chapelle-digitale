-- ============================================================================
-- DONS — devise par défaut FCFA (au lieu d'EUR hérité du schéma initial)
-- Additif & non destructif (ne modifie pas les lignes existantes).
-- ============================================================================
alter table public.dons alter column devise set default 'FCFA';
