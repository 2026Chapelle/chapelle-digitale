-- =============================================================================
-- CITADELLE INTELLIGENCE HUB — HUB-3 : dimensions de campagne durables (UTM)
-- Migration ADDITIVE. *** NON APPLIQUÉE EN DISTANT *** tant que Doxa n'a pas donné
-- le GO spécifique (aucun supabase db push / migration up / db reset distant).
--
-- Ajoute 4 colonnes UTM à analytics_sessions, écrites FIRST-TOUCH à l'insertion de
-- session (comme `source`), jamais mises à jour ensuite. Nullable, sans défaut :
-- les anciennes sessions et le trafic sans UTM restent NULL (aucun backfill).
--
-- IMPORTANT (compatibilité) : DEPLOY_REQUIRES_MIGRATION=YES. Le code d'ingestion
-- (/api/analytics/track) qui écrit ces colonnes DOIT être déployé APRÈS l'application
-- de cette migration : sinon l'INSERT échoue (colonne inconnue) et, l'erreur étant
-- avalée, TOUTE la capture de session serait perdue.
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
