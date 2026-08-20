# CITADELLE_INTELLIGENCE_HUB_3_DB_MIGRATION_APPLIED_REPORT

_Date : 2026-08-20 — Superviseur : Claude (Opus 4.8). Étape : application de la migration UTM en DISTANT (GO explicite Doxa) + smoke DB READ-ONLY. **Aucun déploiement, aucun push, aucun merge vers main.**_

## Contexte

```
BRANCH=feat/citadelle-intelligence-hub-foundation  (worktree cier-platform-intelligence-hub, clean)
HEAD=184fb14 (pre-release) ; RECONCILIATION_HEAD=665940c (origin/main 1089964)
PROJET DISTANT=nvyuyffywnuollaxguen (pooler aws-0-eu-west-3)
MIGRATION=20260820120000_hub3_campaign_utm.sql (additive : ADD COLUMN utm_* ×4 + index partiel)
```

## 1. Dry-run (avant application)

```
supabase db push --linked --dry-run
→ « Would push these migrations: 20260820120000_hub3_campaign_utm.sql »  (UNIQUE)
```

## 2. Application (MUTATION distante — autorisée)

```
supabase db push --linked --yes
→ « Applying migration 20260820120000_hub3_campaign_utm.sql... Finished »  (exit 0)
```

Vérification ledger (read-only) :
```
supabase migration list → 20260820120000 | 20260820120000 | 2026-08-20 12:00:00   (RECORDED distant)
```
(Un timeout réseau transitoire s'est produit sur une lecture de vérification ; retry immédiat OK — l'application, elle, s'était terminée exit 0.)

## 3. Smoke DB — READ-ONLY (BEGIN READ ONLY + ROLLBACK, via pooler)

```
UTM_COLUMNS : utm_campaign / utm_content / utm_medium / utm_term
              → tous text, is_nullable=YES, column_default=NULL   ✓ (conforme à la conception)
INDEX       : idx_asess_utm_campaign = CREATE INDEX ... ON analytics_sessions (utm_campaign) WHERE (utm_campaign IS NOT NULL)   ✓
RLS         : analytics_sessions relrowsecurity=true             ✓ (RLS activée)
POLICIES    : pg_policy sur analytics_sessions = []              ✓ (AUCUNE policy → deny-by-default : service_role only)
NO_NEW_ANON_EXPOSURE : parité de grants colonne — `source` (préexistante) anon=4/auth=4 grants ;
              `utm_campaign` (nouvelle) anon=4/auth=4 grants → IDENTIQUES. La migration n'a ajouté
              AUCUN grant ni policy ; les nouvelles colonnes héritent des grants table préexistants,
              neutralisés par la RLS (0 policy) qui refuse toute ligne hors service_role.  ✓
```

**Conclusion smoke : PASS.** Les 4 colonnes existent (nullable, sans défaut), l'index partiel existe,
la RLS reste activée sans policy publique (service_role only), et aucune exposition anon nouvelle
n'a été introduite (posture identique aux colonnes préexistantes).

## 4. État & isolation

```
REMOTE_SUPABASE_MUTATED=YES  (migration additive 20260820120000 appliquée — autorisée par GO Doxa)
  → analytics_sessions distant possède désormais utm_medium/utm_campaign/utm_content/utm_term + index partiel.
MIGRATION_RECORDED_REMOTE=YES
PENDING_MIGRATIONS=0
DATA_LOSS=NO (additif, colonnes NULL sur toutes les lignes existantes)
RLS_REGRESSION=NO
PRODUCTION_APP_DEPLOYED=NO
PUSHED=NO ; MERGED_TO_MAIN=NO
MAIN_LOCAL_UNCHANGED=YES (2d5a255)
```

## 5. Prochaine étape (NON exécutée ici)

La base est prête pour le déploiement de l'app HUB-3 (ingestion écrivant les UTM first-touch +
endpoint `/api/intelligence/campaigns`). **Ordre déjà établi** : la migration étant maintenant
appliquée, le déploiement de l'app est désormais SÛR (l'INSERT de session avec colonnes utm ne
peut plus échouer sur colonne inconnue). Reste, sur GO de déploiement :
```
1. Déployer le build de la branche (N0C / runbook habituel).
2. Smoke app : GET /api/intelligence/campaigns (admin) → 200 ; nouvelles sessions capturent utm ;
   /api/intelligence/acquisition et /api/analytics/track toujours 200 (non-régression).
```

## STOP

Migration UTM appliquée en distant + smoke DB read-only PASS. Aucun déploiement d'app, aucun push,
aucun merge effectué. En attente du GO explicite de Doxa pour le **déploiement de l'app HUB-3**.
