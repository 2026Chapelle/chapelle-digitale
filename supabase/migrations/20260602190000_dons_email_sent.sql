-- ============================================================================
-- DONS — horodatage d'envoi du reçu email (anti double-envoi + traçabilité)
-- Additif & idempotent.
-- ============================================================================
alter table public.dons add column if not exists email_sent_at timestamptz;
