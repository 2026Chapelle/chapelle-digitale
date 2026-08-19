# CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)

Cockpit **SEO · Audience · Acquisition · Contenu · Conversion · Intelligence**,
intégré à Citadelle sous `/admin/intelligence`. **Pas** d'app séparée, pas de
sous-domaine, pas de 2ᵉ Supabase, pas de nouvelle authentification.

## Principe directeur

**DATA BEFORE DECORATION.** La Phase 0 répond à : quelles données existent ? qui en
est la source de vérité ? où sont-elles ? quelle fraîcheur ? comment les connecter
sans dupliquer ? — avant tout dashboard.

## Périmètre (additif, isolé)

```
src/app/(admin)/admin/intelligence/   → shell/prototype (URL directe, pas dans la nav globale)
src/lib/intelligence/types/           → contrats de domaine (purs)
src/lib/intelligence/core/            → helpers purs (fraîcheur, enveloppe, contrat, démo)
src/lib/intelligence/connectors/      → interfaces + NullConnector (sans secret, sans réseau)
src/lib/intelligence/data-model/      → SPEC + migration DRAFT **non appliquée**
src/lib/intelligence/**/__tests__/    → tests co-localisés (vitest)
```

## Décisions d'architecture (revue transverse)

1. **Pas de nouvelle table d'événements.** `public.analytics_events`,
   `chapelle.analytics_events`, `audio_listening_events`, `activity_logs`,
   `video_progress` existent déjà. `FirstPartyEvent` est un **contrat de lecture /
   normalisation** (adapter → `MetricEnvelope`), pas un schéma d'ingestion.
2. **Graphe de contenu = extension de `cms_document_links`.** Le graphe interne
   existe ; le Hub n'ajoute que la dimension multi-plateforme (destinations externes).
3. **Attribution = surface `detectSource()`** (pure, UTM/referrer), sans
   fingerprinting. Sessions **opaques**, jamais de PII brute.
4. **Connecteurs = contrats + NullConnector** : aucun `process.env`, aucun réseau,
   `available()` = false en Phase 0. Les impls réelles (secrets, SERVER-ONLY) sont
   différées.
5. **Fraîcheur explicite** : `REALTIME | NEAR_REALTIME | SYNCED | SEO_DELAYED`. Une
   donnée Search Console n'est jamais montrée comme temps réel.
6. **Nav globale non touchée** (zone protégée + test anti-régression `admin-nav`).
   Le câblage nav est différé à HUB-1, avec renommage pour désambiguïser vs
   `/admin/intelligence-pastorale`.

## Flux des connecteurs

```
API externe → Connector → Normalisation (MetricEnvelope) → Storage/Aggregation → Service → UI
```

L'UI ne dépend jamais du format brut d'une API externe.

## Sécurité

Admin-only (middleware + `admin-auth`), secrets server-side uniquement (aucun en
Phase 0), jamais de service-role dans le navigateur, RLS deny-by-default sur les
tables futures, connecteurs READ-ONLY, agrégation/anonymisation privilégiées.

## Démo

Toute donnée de démonstration porte `source: 'demo'` (⇒ `demo: true`) et le shell
affiche le bandeau **« DONNÉES DE DÉMONSTRATION »**. Aucun nombre fictif ne peut
sembler provenir de la production.

## Prochaine étape

**STOP.** Attendre le GO explicite : **GO HUB-1 — FIRST-PARTY ANALYTICS**.
