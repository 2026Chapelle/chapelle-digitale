# CITADELLE_INTELLIGENCE_HUB_3_PRE_RELEASE_REPORT

_Date : 2026-08-20 — Superviseur : Claude (Opus 4.8). Étape : réconciliation + revalidation + audit Supabase distant READ-ONLY. AUCUNE mutation distante, aucun push, aucun merge vers main, aucun déploiement._

## 1. Réconciliation avec origin/main

```
HUB3_HEAD_BEFORE=210904d
ORIGIN_MAIN=1089964  (PR#27 « feat/citadelle-living-books-security-acl-fix »)
MERGE_BASE=86cce52
NEW_MAIN_COMMITS=2 (352f655 fix(living-books) restrict premium RPC exec ; 1089964 merge PR#27)
NEW_MAIN_FILES=1 (supabase/migrations/20260819150000_lbsec_fix_books_premium_execute_acl.sql, +27, ADDITIF)
OVERLAP_WITH_INTELLIGENCE=NONE ; touche aucune dépendance HUB (analytics/profiles/completions/audio/helpers/nav)
MERGE_RESULT=SUCCÈS (ort, 0 conflit)
RECONCILIATION_HEAD=665940c  (parents 210904d + 1089964)
PHASE0/HUB1/HUB2/HUB3 SHAs préservés=YES (5be5575, b9e0eb6, 1fc617f, 4423a61, 210904d)
BRANCH vs origin/main = 7 ahead / 0 behind ; worktree clean
```

## 2. Revalidation des gates (post-merge)

```
TSC=PASS (tsc --noEmit exit 0)
TESTS=PASS (vitest run : 123 fichiers / 1436 tests)
LINT=PASS (intelligence + ingestion : No ESLint warnings or errors)
BUILD=PASS (0 erreur ; routes campaigns + acquisition + overview + admin/intelligence + api/analytics/track compilées)
```

## 3. Audit Supabase DISTANT — READ-ONLY

Méthode : `supabase link --project-ref nvyuyffywnuollaxguen` (métadonnées, écrit uniquement le `.temp` local gitignoré) puis `supabase migration list` (LECTURE de `supabase_migrations.schema_migrations`). **Aucune commande de mutation** (pas de `db push`, `migration up`, `db reset`).

```
REMOTE_PROJECT=nvyuyffywnuollaxguen
REMOTE_APPLIED_JUSQU_A=20260819150000_lbsec_fix_books_premium_execute_acl (= état de origin/main 1089964)
  → PDF-2 (20260819120000), Living Books foundation (20260819140000), Living Books ACL (20260819150000) : APPLIQUÉES distant.
PENDING (Local, non Remote)=20260820120000_hub3_campaign_utm  ← UNIQUE migration en attente
DRIFT=AUCUN (toutes les migrations locales ≤ 20260819150000 sont RECORDED distant ; aucune version remote-only)
```

**Conséquence prouvée sur l'état réel :** la seule migration ajoutant les colonnes `utm_*` (`20260820120000`) n'est PAS appliquée → `public.analytics_sessions` distant NE possède PAS `utm_medium/utm_campaign/utm_content/utm_term`. Donc l'ingestion HUB-3 (qui écrit ces colonnes à l'INSERT) échouerait silencieusement en prod tant que la migration n'est pas appliquée → **DEPLOY_REQUIRES_MIGRATION=YES confirmé contre le distant.**

### Analyse de sûreté de la migration en attente
- 4× `ALTER TABLE public.analytics_sessions ADD COLUMN IF NOT EXISTS … text` : nullable, sans défaut ⇒ **metadata-only, instantané** (pas de réécriture de table).
- `CREATE INDEX IF NOT EXISTS idx_asess_utm_campaign … WHERE utm_campaign IS NOT NULL` : partiel ; à la création, toutes les lignes ont `utm_campaign=NULL` ⇒ **index vide**, coût = un scan de table sous verrou SHARE (bloque les écritures, pas les lectures) le temps du scan (négligeable à l'échelle actuelle).
- Aucun DROP / RENAME / ALTER COLUMN / UPDATE / backfill. Additif, idempotent. RLS héritée (service_role only) ; aucune policy/grant ajoutée.
- **Option de durcissement (facultative)** : si l'on veut zéro verrou d'écriture sur une table à fort trafic, appliquer d'abord les `ADD COLUMN` puis créer l'index `CONCURRENTLY` en étape séparée (hors transaction). L'index n'est PAS requis par l'agrégation quotidienne (group-by JS) — il peut aussi être différé.

## 4. ORDRE EXACT DE RELEASE (migration UTM → smoke DB → déploiement)

**Impératif : migration AVANT déploiement** (sinon perte totale de capture de session).

```
ÉTAPE 0 — GATE : GO explicite de Doxa pour muter le distant (à ce jour REMOTE_SUPABASE_MUTATED=NO).

ÉTAPE 1 — APPLIQUER LA MIGRATION (distant) :
  supabase migration up            # applique la seule pending 20260820120000
  (ou : supabase db push)
  [option durcie : ADD COLUMN via migration, puis CREATE INDEX ... CONCURRENTLY à part]

ÉTAPE 2 — SMOKE DB (READ-ONLY, post-migration) :
  a) supabase migration list       # 20260820120000 doit apparaître RECORDED distant
  b) vérifier colonnes : information_schema.columns pour analytics_sessions
     → utm_medium/utm_campaign/utm_content/utm_term présentes
  c) vérifier index idx_asess_utm_campaign présent (pg_indexes)
  d) vérifier RLS inchangée (service_role only ; pas d'exposition anon)

ÉTAPE 3 — DÉPLOYER L'APP (build de la branche) — APRÈS smoke DB OK :
  active l'ingestion (écriture UTM first-touch) + l'endpoint /api/intelligence/campaigns.

ÉTAPE 4 — SMOKE APP (post-déploiement) :
  a) GET /api/intelligence/campaigns (cookie admin) → 200, demoMode=false (ou tableau vide « Aucune donnée »), pas d'error:read_failed.
  b) confirmer que les NOUVELLES sessions capturent utm_* (une visite avec ?utm_campaign=test → ligne apparaît).
  c) confirmer /api/intelligence/acquisition (HUB-2) et /api/analytics/track toujours 200 (non-régression).
```

Rollback : la migration étant purement additive, un rollback DB n'est pas nécessaire ; en cas de problème applicatif, redéployer la version précédente de l'app (les colonnes utm_* additives restent inertes).

## 5. Isolation / non-mutation (cette étape)

```
MAIN_LOCAL_MUTATED=NO (2d5a255)
ORIGIN_MAIN_MUTATED_BY_THIS_STEP=NO
OTHER_WORKTREES_WRITTEN=NO
REMOTE_SUPABASE_MUTATED=NO  (uniquement `link` [métadonnées/.temp local] + `migration list` [lecture] ; aucun push/up/reset)
PRODUCTION_MUTATED=NO
PUSHED=NO
MERGED_TO_MAIN=NO
DEPLOYED=NO
```

## 6. Verdict

```
RECONCILED_WITH_ORIGIN_MAIN=YES (665940c)
ALL_GATES_GREEN=YES (tsc/tests 1436/lint/build)
REMOTE_AUDIT_DONE=YES (read-only ; 1 seule migration pending = HUB-3 utm ; 0 drift)
RELEASE_ORDER_ESTABLISHED=YES (migration → smoke DB → déploiement, ordre impératif)
BLOCKERS=NONE

READY_FOR_HUB3_DB_RELEASE=YES
```

La release DB HUB-3 est **prête** : artefacts figés et revalidés, distant audité en lecture seule (unique migration additive en attente, sans dérive), ordre exact établi. **Elle n'attend qu'un GO explicite de Doxa** pour l'ÉTAPE 1 (application de la migration distante), suivie du smoke DB puis du déploiement — dans cet ordre impératif.

## STOP

Aucune mutation distante, aucun push, aucun merge, aucun déploiement effectué. En attente du GO explicite de Doxa pour la release DB (migration UTM) puis le déploiement.
