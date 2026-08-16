-- ============================================================================
-- DONS — devise par défaut XOF (code ISO 4217 du franc CFA ; au lieu d'EUR hérité
-- du schéma initial). XOF est la valeur DB canonique (l'UI peut afficher « FCFA »).
-- Additif & non destructif (ne modifie pas les lignes existantes).
-- ============================================================================
alter table public.dons alter column devise set default 'XOF';
