-- ============================================================================
-- MARKETPLACE — lien d'achat Chariow (catalogue public → page de paiement)
-- ----------------------------------------------------------------------------
-- Chariow n'expose pas d'API de checkout : chaque produit pointe vers sa page
-- de vente Chariow. Après paiement, le webhook /api/webhook/chariow rapproche
-- `chariow_product_id` et crée le product_purchase (accès via /api/acces/[token]).
-- Additif, idempotent.
-- ============================================================================

alter table public.marketplace_products add column if not exists lien_achat text;
