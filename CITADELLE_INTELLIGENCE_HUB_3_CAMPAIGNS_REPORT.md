# CITADELLE_INTELLIGENCE_HUB_3_CAMPAIGNS_REPORT

_Date : 2026-08-20 — Superviseur : Claude (Opus 4.8). Principe : **SOURCE TELLS US WHERE THEY CAME FROM. CAMPAIGN TELLS US WHAT BROUGHT THEM.**_

## Base & tête

```
HUB2_HEAD=1fc617f
RECONCILIATION_HEAD=4423a61
HUB3_HEAD=<voir commit ci-dessous>   (même worktree, même branche feat/citadelle-intelligence-hub-foundation)
ORIGIN_MAIN_AT_START=86cce52 (inchangé pendant HUB-3)
MERGE_BASE=86cce52 (branche 5 en avance / 0 en retard avant HUB-3)
```

## Agents & reviewers

```
AGENTS_USED=7 audit read-only (schéma / ingestion / normalisation UTM / attribution / privacy / perf / UX)
REVIEWERS_USED=8 (architecture, sécurité, privacy, data-accuracy, performance, migration-safety, git-conflict, QA)
```

## Modèle

```
CURRENT_SESSION_SCHEMA=analytics_sessions : source (canal dérivé, first-touch), referrer, landing_path (pathname), user_id, session_key, first_seen…
  → PAS de colonnes utm_* aujourd'hui.
NEW_CAMPAIGN_COLUMNS=utm_medium, utm_campaign, utm_content, utm_term (text, nullable, sans défaut, sans backfill)
MIGRATION_CREATED=supabase/migrations/20260820120000_hub3_campaign_utm.sql (ADDITIVE : ADD COLUMN IF NOT EXISTS ×4 + index partiel idx_asess_utm_campaign)
MIGRATION_APPLIED_REMOTE=NO
```

### First-touch (immuable comme `source`)

```
FIRST_TOUCH_SOURCE=analytics_sessions.source (détecté via detectSource, figé à l'INSERT)
FIRST_TOUCH_MEDIUM=utm_medium (INSERT only) → dérivé à la lecture vers ATTRIBUTION_MEDIUMS
FIRST_TOUCH_CAMPAIGN=utm_campaign (INSERT only, normalisé/borné/sans PII)
FIRST_TOUCH_CONTENT=utm_content (INSERT only, casse préservée)
FIRST_TOUCH_TERM=utm_term (INSERT only, stocké ; non surfacé dans le DTO campagne — réserve §12)
```

Ingestion : `/api/analytics/track` écrit les 4 colonnes au **branchement INSERT uniquement**
(jamais sur l'update → immuabilité). Normalisation via `normalizeUtmBundle` (trim → vide=null →
strip contrôle/`<>` → scrub PII email+téléphone → casing → borne 32/64). Les campagnes datées
type `culte_20260823` sont préservées (seuls les tokens 100% numériques 7-15 = téléphone sont écartés).

## Livrables

```
CAMPAIGN_URL_HELPER=src/lib/intelligence/attribution/campaign-url.ts (buildCampaignUrl : préserve la query,
  encode, ignore les champs vides, refuse non http(s)). Testé.
CAMPAIGN_API=GET /api/intelligence/campaigns (admin-only isAdminRequest, service_role, jour UTC, cache 60s,
  lectures bornées+Promise.all, sortie agrégée par (source, campagne) — 0 PII). Fail-safe démo si migration non appliquée.
CAMPAIGN_DASHBOARD=onglet Acquisition, segmenté [Par source | Par campagne] ; tableau (source, campagne) ×
  Visites/Inscriptions/Écoutes/Progressions + medium + drill-down contenus + ligne « sans campagne » + états démo/indispo.
```

## Attribution

```
REAL_CAMPAIGN_METRICS=Visites par (source, campagne) = RÉEL (first-touch natif).
  Inscriptions / Écoutes podcast / Progressions par (source, campagne) = PARTIEL (jointure first-touch,
  split attribué/non-attribué explicite).
GROUPING_KEY=(source, campagne) ; medium = dominant du groupe ; content = drill-down. Multi-source = lignes distinctes.
UNKNOWN/NULL=campagne absente → null (« sans campagne »), jamais 'direct'/'organic'. 'internal' exclu (nav interne).
UNATTRIBUTED_BEHAVIOR=conversions non rattachables (ou résolues 'internal') comptées dans `unattributed`, jamais réattribuées.
CONVERSION_RATE_AVAILABLE=NO (maintenu : cohortes visites-jour vs first-touch-antérieur incompatibles ; slicing plus fin les aggrave).
```

## Fichiers

```
FILES_CREATED=10
  src/lib/intelligence/attribution/{utm,campaign-url}.ts (+ __tests__/{utm,campaign-url}.test.ts)
  src/lib/intelligence/metrics/campaigns.ts (+ __tests__/campaigns.test.ts)
  src/lib/intelligence/adapters/campaign-reader.ts (+ __tests__/campaign-reader.test.ts)
  src/app/api/intelligence/campaigns/route.ts
  supabase/migrations/20260820120000_hub3_campaign_utm.sql
FILES_MODIFIED=7
  src/app/api/analytics/track/route.ts        (INGESTION : écriture UTM first-touch — édition partagée sanctionnée, CONFLICT_RISK=NONE)
  src/app/(admin)/admin/intelligence/page.tsx (onglet campagnes)
  src/lib/intelligence/attribution/resolve.ts (SessionSourceRow += utm optionnels ; resolveConversionRow)
  src/lib/intelligence/attribution/{index,__tests__/resolve.test}.ts, metrics/index.ts, adapters/index.ts
OUT_OF_SCOPE_FILES=0
```

## Gates (preuves réelles)

```
TSC=PASS (tsc --noEmit exit 0)
TESTS=PASS (vitest run : 123 fichiers / 1436 tests ; ~27 HUB-3)
LINT=PASS (intelligence + ingestion : No ESLint warnings or errors)
BUILD=PASS (0 erreur ; routes campaigns + acquisition + overview + admin/intelligence + api/analytics/track compilées)
```

Tests §25 couverts : UTM_MEDIUM/CAMPAIGN/CONTENT_CAPTURED, UTM_VALUES_NORMALIZED, EMPTY_UTM_TO_NULL,
OVERSIZED_UTM_TRUNCATED_SAFELY, FIRST_TOUCH_CAMPAIGN_PRESERVED, INTERNAL_NAV_DOES_NOT_OVERWRITE_CAMPAIGN,
OLD_SESSION_WITH_NULL_CAMPAIGN, DIRECT_WITHOUT_CAMPAIGN, CAMPAIGN_GROUPING_DETERMINISTIC,
UNATTRIBUTED_CONVERSIONS_PRESERVED, BUILD_CAMPAIGN_URL_ENCODES_VALUES/PRESERVES_QUERY, NO_PII_IN_CAMPAIGN_DTO.
UTM_TERM_CAPTURED = normalisé+écrit (non surfacé, réserve §12). NO_RAW_QUERY_STRING / CAMPAIGN_API / DASHBOARD =
gates de câblage couverts par TSC+BUILD+revue.

## Reviewers (8, parallèles) — tous PASS

```
ARCHITECTURE_REVIEW=PASS   (HUB2 inchangé ; reader séparé isole la dépendance migration ; 0 blocage)
SECURITY_REVIEW=PASS       (0 finding : admin-only fail-closed, 0 injection, buildCampaignUrl refuse non-http(s), <> strip, bornes)
PRIVACY_REVIEW=PASS        (0 PII en sortie ; scrub email/téléphone ; pas de query string brute ; anti stored-XSS)
DATA_ACCURACY_REVIEW=PASS  (0 finding : source≠campaign, null≠direct, internal exclu, multi-source séparé, first-touch, no rate, sentinel NUL sûr)
PERFORMANCE_REVIEW=PASS    (bornes + Promise.all + cache stable ; pas de N+1 ; 0 charge ajoutée sur /acquisition)
MIGRATION_REVIEW=PASS      (additive only ; ordonnancement OK ; DEPLOY_REQUIRES_MIGRATION=YES ; read path gracieux ; non appliqué distant)
PARALLEL_CONFLICT_REVIEW=PASS (10 new + 7 modif ; 0 hors périmètre ; ingestion : 0 conflit parallèle ; 1 seule migration ajoutée)
QA_EVIDENCE_REVIEW=PASS    (§25 couverts ; 3 hardening tests ajoutés : first-touch campagne, internal-nav campagne, NO_PII shape)
```

## Compatibilité & déploiement

```
DEPLOY_REQUIRES_MIGRATION=YES
  L'ingestion écrit les colonnes utm_* à l'INSERT ; sans la migration, l'INSERT échoue silencieusement
  (erreur non inspectée / avalée) et TOUTE la capture de session serait perdue. La migration DOIT être
  appliquée AVANT tout déploiement de ce code. La lecture (campaigns) dégrade en démo si colonnes absentes,
  et l'endpoint /acquisition (HUB-2) n'est pas impacté (reader séparé).
```

## Isolation / non-mutation

```
MAIN_LOCAL_MUTATED=NO (2d5a255)
ORIGIN_MAIN_MUTATED_BY_HUB3=NO (86cce52 inchangé)
OTHER_WORKTREES_WRITTEN=NO
REMOTE_SUPABASE_MUTATED=NO (migration additive LOCALE, non appliquée)
PRODUCTION_MUTATED=NO
PUSHED=NO
```

## Ce que Citadelle sait dire désormais

```
WhatsApp └── culte_20260823 ├── main_cta └── reminder
Facebook └── culte_20260823 └── reel
YouTube  └── culte_20260823 └── description_link
```
relié (quand la donnée le permet) aux visites / inscriptions / écoutes podcast / progressions parcours,
avec la part non attribuée affichée honnêtement, et sans jamais afficher de taux de conversion trompeur.

## Gaps & risques

```
GAPS=
 - utm_term stocké mais non surfacé dans le tableau (réserve §12, campagnes payantes futures).
 - Attribution signup/parcours = user_id (client-asserté à l'ingestion, non vérifié serveur) → partielle.
 - Podcast anon dépend de la coïncidence des espaces de session_key (documenté).
 - Cohorte visites-jour vs first-touch-antérieur ⇒ pas de taux (une ligne campagne peut avoir visits=0 + conversions>0).
 - Rétention analytics non bornée (élargie par les colonnes utm) — recommandation purge (non appliquée).
 - looksLikePii écarte un identifiant de campagne 100% numérique 7-15 chiffres (les alphanumériques/datés passent).
RISKS=aucun bloquant ; tout additif, borné, admin-only, sans PII ni mutation distante. DEPLOY_REQUIRES_MIGRATION=YES.
NEXT_RECOMMENDED_PHASE=
 A) Sur GO : appliquer la migration additive utm_* en distant PUIS déployer l'ingestion (ordre impératif).
 B) Fiabiliser session↔user (user_id vérifié serveur) pour durcir signup/parcours attribution.
 C) Rétention/purge analytics_sessions (couvrant les colonnes utm).
 D) Câblage nav admin (désambiguïsation vs /admin/intelligence-pastorale).
 E) Plus tard seulement : connecteurs externes (GA4/GSC/YouTube/Meta/WhatsApp).
```

## STOP

HUB-3 terminé et prouvé. **Aucune** application de migration distante, **aucun** déploiement, push, merge,
ou mutation production/Supabase. Aucun démarrage automatique de GA4 / Search Console / YouTube Analytics /
Meta / WhatsApp. En attente du prochain GO explicite de Doxa.
