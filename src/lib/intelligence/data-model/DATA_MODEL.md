# CITADELLE INTELLIGENCE HUB — Modèle de données (Phase 0, SPEC)

> **Statut : DRAFT — NON APPLIQUÉ.** Aucune migration distante. Aucun `supabase db push` / `db reset`.
> Le fichier `intelligence_hub_foundation.draft.sql` est volontairement placé **hors** de
> `supabase/migrations/` pour qu'il ne puisse **jamais** être appliqué automatiquement.

## Principe

**Réutiliser avant de recréer.** L'audit (98 migrations) montre que l'événementiel
first-party existe déjà. Le Hub **n'introduit PAS** de table `intelligence_events`
(cela ferait un 3ᵉ schéma d'événements divergent). Il **adapte** les sources
existantes en lecture, et n'ajoute QUE les tables réellement manquantes.

## Sources existantes réutilisées (aucune création)

| Besoin | Source de vérité existante | Accès |
|---|---|---|
| Sessions / pages vues | `public.analytics_sessions`, `public.analytics_events` | service_role only |
| Funnel / tunnel | `chapelle.analytics_events` + vues `chapelle.v_*` | service_role only |
| Écoute podcast | `public.audio_listening_events` (+ lib `audio-analytics`) | service_role only |
| Visionnage LMS | `public.video_progress` | RLS par utilisateur |
| Live / vues vidéo / PDF | `public.activity_logs` (`/api/activity`) | service_role only |
| Graphe de contenu interne | `public.cms_document_links` (jonction FK-typée) | published-read |
| Accès premium | `public.user_entitlements` (`has_entitlement`) | service_role gated |
| Attribution canal | `detectSource()` (`src/lib/analytics-server.ts`, pur) | pur, sans I/O |

## Tables NOUVELLES (vrais gaps — DRAFT, non appliqué)

Toutes : `RLS enable`, **deny-by-default**, `service_role` uniquement, additives,
idempotentes (`create table if not exists`). Aucune n'écrit de PII brute.

1. `intelligence_channel_connections` — état de connexion d'un canal externe
   (GA4/GSC/YouTube/Meta). **Secrets stockés hors table** (vault/env server-side) ;
   la table ne conserve qu'un statut + métadonnées non sensibles.
2. `intelligence_channel_metric_snapshots` — instantanés de métriques normalisées
   par canal (une ligne = un MetricEnvelope agrégé), avec `freshness` + `measured_at`/`synced_at`.
3. `intelligence_channel_sync_runs` — journal des synchronisations (début/fin/statut/erreur),
   pour l'observabilité (pattern `cron_runs` existant).
4. `intelligence_seo_queries` — requêtes Search Console (query, clicks, impressions, ctr, position, date). SEO_DELAYED.
5. `intelligence_seo_pages` — pages Search Console (page, clicks, impressions, ctr, position, date). SEO_DELAYED.
6. `intelligence_campaigns` — campagnes marketing (nom, canal, dates).
7. `intelligence_campaign_links` — liens de campagne (utm_source/medium/campaign/content, url, campaign_id).
8. `intelligence_conversion_events` — conversions consolidées (type, session opaque, value, occurred_at).
9. `intelligence_attribution_touchpoints` — touches d'attribution (source/medium/campaign/entry_page/session opaque/occurred_at).

### Content graph — EXTENSION, pas duplication

- Le graphe **interne** Chapelle/Citadelle reste `public.cms_document_links`.
- Nouveauté = dimension **multi-plateforme** (destinations YouTube/Facebook/WhatsApp).
- DRAFT : `intelligence_content_destinations` (content_id logique, platform, external_id, url, campaign_id).
  `intelligence_content_entities` n'est ajoutée **que si** une clé de contenu transverse
  s'avère nécessaire au-delà des identités CMS existantes ; sinon on référence directement les tables CMS.

## Par table — grille d'évaluation (résumé)

| Table | PURPOSE | SOURCE_OF_TRUTH | RETENTION | PII | RLS | REALTIME | AGGREGATION |
|---|---|---|---|---|---|---|---|
| channel_connections | statut connecteur | Hub | permanent | non (secrets hors table) | service_role | non | non |
| channel_metric_snapshots | métriques par canal | connecteur→Hub | 18 mois (comme audio) | non | service_role | non | oui |
| channel_sync_runs | journal sync | Hub | 90 j | non | service_role | non | non |
| seo_queries / seo_pages | GSC | GSC | 16 mois (limite GSC) | non | service_role | non | oui |
| campaigns / campaign_links | marketing | Hub | permanent | non | service_role | non | non |
| conversion_events | conversions | first-party | 18 mois | session opaque | service_role | non | oui |
| attribution_touchpoints | attribution | first-party (detectSource) | 18 mois | session opaque | service_role | non | oui |
| content_destinations | diffusion multi-plateforme | Hub/CMS | permanent | non | published-read/service_role | non | non |

## Fraîcheur par source

- `REALTIME` : présence (heartbeat) — dérivé, pas de nouvelle table.
- `NEAR_REALTIME` : analytics_events / activity_logs / audio_listening_events.
- `SYNCED` : snapshots command-center, GA4, campagnes, conversions.
- `SEO_DELAYED` : Search Console, stats YouTube.
