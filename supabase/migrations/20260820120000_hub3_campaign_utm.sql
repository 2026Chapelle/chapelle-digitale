-- =============================================================================
-- CITADELLE INTELLIGENCE HUB — HUB-3 : dimensions de campagne durables (UTM)
-- Migration ADDITIVE. *** APPLIQUÉE EN DISTANT le 2026-08-20 *** (supabase db push,
-- prod nvyuyffywnuollaxguen) ; DB_SMOKE=PASS : colonnes présentes (text, nullable, sans
-- défaut), index partiel présent, RLS activée SANS policy (service_role only), aucune
-- exposition anon nouvelle, aucune perte de données.
--
-- Ajoute 4 colonnes UTM à analytics_sessions, écrites FIRST-TOUCH à l'insertion de
-- session (comme `source`), jamais mises à jour ensuite. Nullable, sans défaut :
-- les anciennes sessions et le trafic sans UTM restent NULL (aucun backfill).
--
-- COMPATIBILITÉ : DEPLOY_REQUIRES_MIGRATION=YES — condition désormais SATISFAITE (la
-- migration est appliquée AVANT tout déploiement de l'app). Rappel : le code d'ingestion
-- (/api/analytics/track) écrit ces colonnes ; il ne doit jamais tourner sur une base qui
-- ne les a pas (sinon l'INSERT échoue silencieusement → perte totale de capture de session).
-- =============================================================================

alter table public.analytics_sessions add column if not exists utm_medium   text;
alter table public.analytics_sessions add column if not exists utm_campaign text;
alter table public.analytics_sessions add column if not exists utm_content  text;
alter table public.analytics_sessions add column if not exists utm_term     text;

comment on column public.analytics_sessions.utm_medium   is 'HUB-3 first-touch UTM medium (normalisé, borné 32).';
comment on column public.analytics_sessions.utm_campaign is 'HUB-3 first-touch UTM campaign (normalisé, borné 64).';
comment on column public.analytics_sessions.utm_content  is 'HUB-3 first-touch UTM content (borné 64).';
comment on column public.analytics_sessions.utm_term     is 'HUB-3 first-touch UTM term (normalisé, borné 64).';

-- Index partiel : n'indexe que les sessions PORTANT une campagne (majorité NULL ignorée).
-- Utile si un jour on filtre WHERE utm_campaign = X ; l'agrégation quotidienne bornée
-- actuelle (group-by en JS) n'en dépend pas. Application distante = étape gatée séparée.
create index if not exists idx_asess_utm_campaign
  on public.analytics_sessions (utm_campaign)
  where utm_campaign is not null;

-- Les colonnes héritent de la RLS existante (deny-by-default, service_role only) :
-- aucune policy à ajouter. Re-grant des lectures colonne non nécessaire (grant table-level
-- service_role déjà en place). Rien d'autre.
