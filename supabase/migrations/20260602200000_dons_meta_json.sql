-- ============================================================================
-- DONS — payload Chariow brut conservé sur la ligne du don (audit/débogage)
-- Additif & idempotent.
-- ============================================================================
alter table public.dons add column if not exists meta_json jsonb;
