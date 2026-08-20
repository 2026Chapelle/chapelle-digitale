# CITADELLE_INTELLIGENCE_HUB3_PRODUCTION_RELEASE_REPORT

_Date : 2026-08-20 — Superviseur : Claude (Opus 4.8). Étape : App Release HUB-3. **Bloqué à l'étape PUSH par une contrainte d'identité Git (voir §BLOCKER). Aucun push, PR, merge ou déploiement effectué.**_

## État DB (attesté, déjà appliqué)

```
DB_MIGRATION_APPLIED=YES  (20260820120000_hub3_campaign_utm)
DB_SMOKE=PASS  (colonnes utm_* nullable text, index partiel, RLS activée 0 policy, 0 exposition anon)
PENDING_MIGRATIONS=0  (« Remote database is up to date. »)
```

## §1 — Preflight Git

```
INTELLIGENCE_HEAD=6229e7d8510602c5d823957a789c578c44af80f5
ORIGIN_MAIN_NOW=108996475ec3d2ba57e4369443d1417e6122557c (1089964)
WORKTREE_CLEAN=YES
BEHIND_ORIGIN_MAIN=0  (merge-base = origin/main ; branche 9 ahead / 0 behind)
RECONCILIATION_REQUIRED=NO  (origin/main inchangé depuis la dernière réconciliation)
```

## §2 — Code ↔ DB

```
CODE_SCHEMA_MATCH=YES  (le code écrit/lit exactement utm_medium/campaign/content/term ; +utm_source via detectSource)
MIGRATION_SCHEMA_MATCH=YES
NO_ADDITIONAL_PENDING_DB_REQUIREMENT=YES
Aucune référence de code à une colonne utm NON appliquée.
```

## §BLOCKER — PUSH IMPOSSIBLE (identité Git)

```
git push -u origin feat/citadelle-intelligence-hub-foundation
→ remote: Permission to 2026Chapelle/chapelle-digitale.git denied to Homplou.
→ fatal: 403
```

L'environnement s'authentifie comme **Homplou** (pull-only sur ce dépôt). Le token `gh` a le scope
`repo` mais son compte actif est également pull-only ici. **Aucun token de push `2026Chapelle`**
n'est disponible (GH_TOKEN/GITHUB_TOKEN unset). Conformément à la règle projet établie, **push/merge
se font via le compte `2026Chapelle`**, non disponible dans cet environnement.

En conséquence, les étapes §3 (push), §4 (PR), §5-6 (review/merge), §7-8 (deploy depuis main),
§9-13 (smoke prod) **ne peuvent pas être exécutées par l'agent**. Je m'arrête ici SANS contourner
la contrainte d'identité.

```
BRANCH_PUSHED=NO (403 Homplou pull-only)
PR_NUMBER=— ; PR_STATE=NON CRÉÉE
MERGE_SHA=— 
DEPLOY_SOURCE=— ; DEPLOY_COMMIT=— ; DEPLOY_SUCCESS=NO
ADMIN_INTELLIGENCE=— ; OVERVIEW_API=— ; ACQUISITION_API=— ; CAMPAIGNS_API=—
UTM_SMOKE_*=— ; FIRST_TOUCH_PRESERVED=— ; INTERNAL_NAV_OVERWRITE=—
TRACK_REGRESSION=— ; SECURITY_SMOKE=—
PRODUCTION_STATUS=NOT_DEPLOYED
ROLLBACK_REQUIRED=NO (rien déployé)
HUB3_RELEASE=BLOCKED (identité push ; code + DB PRÊTS, aucun défaut)
```

## HANDOFF — étapes à exécuter par Doxa (compte 2026Chapelle)

Tout est prêt côté code (gates verts) et DB (migration appliquée + smoke PASS). Reste, avec le
compte autorisé :

```bash
# 1) PUSH de la branche (jamais directement sur main)
git -C "C:/Users/Révérend Doxa/Desktop/cier-platform-intelligence-hub" push -u origin feat/citadelle-intelligence-hub-foundation

# 2) PR vers main (gh authentifié 2026Chapelle) — corps ci-dessous
gh pr create --repo 2026Chapelle/chapelle-digitale \
  --base main --head feat/citadelle-intelligence-hub-foundation \
  --title "feat(intelligence): add first-party analytics and campaign attribution" \
  --body-file PR_BODY_HUB3.md

# 3) Après CI verte + review : merge selon le workflow canonique
gh pr merge <PR#> --repo 2026Chapelle/chapelle-digitale --merge   # ou --squash selon convention

# 4) Déploiement depuis origin/main (procédure de prod Citadelle éprouvée)
#    DEPLOY_SOURCE=origin/main ; vérifier DEPLOY_COMMIT == MERGE_SHA avant deploy.
#    Préserver app.js / .env / .htaccess / logs ; PAS de rsync --delete ; pas de nouveau mécanisme.
```

### Corps de PR recommandé (PR_BODY_HUB3.md)

```
Ensemble cohérent Intelligence (worktree isolé, additif) :
- Phase 0 foundation (contrats, connecteurs, shell /admin/intelligence)
- HUB-1 first-party analytics (Vue générale : 5 métriques réelles + 2 honnêtement indisponibles)
- HUB-2 first-party attribution (Acquisition par source, first-touch, no rate)
- HUB-3 durable campaign attribution (UTM first-touch, /api/intelligence/campaigns, onglet campagnes)

Migration incluse : supabase/migrations/20260820120000_hub3_campaign_utm.sql
DB_MIGRATION_ALREADY_APPLIED_REMOTE=YES  (appliquée le 2026-08-20, ne PAS réappliquer/inverser)
DB_SMOKE=PASS (colonnes utm_* nullable, index partiel, RLS 0 policy service_role-only, 0 exposition anon)

Gates locaux : TSC=PASS ; TESTS=1436/1436 ; LINT=PASS ; BUILD=PASS.
Reviewers cumulés (tous PASS) : architecture, sécurité, privacy, data-accuracy, performance, migration-safety, conflits git, QA.
Aucune mutation hors périmètre ; aucune régression HUB-1/HUB-2 ; 0 PII exposée ; pas de faux taux de conversion.
```

### Smoke prod à réaliser APRÈS déploiement (ordre §9-13)

```
A. Santé : / , /admin (démarrage OK)
B. /admin/intelligence = 200 ; /api/intelligence/overview = 200 (auth admin)
C. /api/intelligence/acquisition = 200 (non-régression HUB-2)
D. /api/intelligence/campaigns = 200 (pas de 500 / missing column / schema cache / permission denied)
E. Smoke UTM réel : visiter ?utm_source=whatsapp&utm_medium=channel&utm_campaign=hub3_smoke&utm_content=release_test
   (NOUVELLE session) → vérifier EN BASE (read-only) : source=whatsapp, utm_medium=channel,
   utm_campaign=hub3_smoke, utm_content=release_test, utm_term=NULL. Ne PAS éditer la ligne à la main.
F. First-touch : dans la même session, naviguer sur une page interne SANS UTM →
   source/medium/campaign/content INCHANGÉS (FIRST_TOUCH_PRESERVED=YES, INTERNAL_NAV_OVERWRITE=NO).
G. Sécurité : /api/intelligence/campaigns en anonyme → 401/refusé ; réponse admin non exposée à l'anonyme.
```

## Isolation (cette étape)

```
REMOTE_SUPABASE_MUTATED=NO (dans cette étape ; la migration l'avait été à l'étape précédente, autorisée)
PRODUCTION_APP_DEPLOYED=NO
PUSHED=NO (403 identité) ; MERGED_TO_MAIN=NO
MAIN_LOCAL_UNCHANGED=YES (2d5a255)
```

## STOP

Release bloquée à l'étape PUSH par la contrainte d'identité Git (Homplou pull-only). **Code et DB
prêts, aucun défaut.** Handoff fourni pour exécution par Doxa via le compte `2026Chapelle`. Je ne
contourne pas la contrainte d'identité et n'effectue aucun push/merge/déploiement.
```
HUB3_RELEASE=BLOCKED_AT_PUSH (credential)
```
