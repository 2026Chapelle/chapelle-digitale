-- ============================================================================
-- ÉVÉNEMENTS — lien de diffusion dédié (ne pas rediriger vers /live)
-- ----------------------------------------------------------------------------
-- Additif & idempotent. `lien_live` = URL réelle du direct de l'événement
-- (YouTube/Zoom/…), ouverte uniquement à partir de l'heure de début.
-- ============================================================================

alter table public.cms_events add column if not exists lien_live text;
