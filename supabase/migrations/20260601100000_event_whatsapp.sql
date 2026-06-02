-- ============================================================================
-- Événements — champ WhatsApp (numéro ou lien du groupe)
-- ----------------------------------------------------------------------------
-- Permet aux participants de rejoindre le groupe WhatsApp de l'événement ou de
-- recevoir les informations. Affiché côté membre dans « Mes Événements ».
-- Additif et idempotent : aucune régression.
-- ============================================================================
alter table public.cms_events add column if not exists whatsapp text;
