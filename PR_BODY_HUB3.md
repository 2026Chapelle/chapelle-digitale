# feat(intelligence): add first-party analytics and campaign attribution

Ensemble cohérent **CITADELLE INTELLIGENCE** — chantier isolé, 100 % **additif**, intégré sous `/admin/intelligence`. Aucune nouvelle app, aucun sous-domaine, aucune 2ᵉ base, aucune nouvelle authentification.

## Contenu de la PR

- **Phase 0 — Foundation** : contrats de domaine purs (freshness, metrics, event-contract, content-graph, attribution), helpers purs, interfaces de connecteurs + `NullConnector` sans secret/réseau, shell `/admin/intelligence`.
- **HUB-1 — First-party analytics** : Vue générale = **5 métriques réelles** (Visites, Sessions actives, Inscriptions, Écoutes podcast, Progressions parcours) + **2 honnêtement « Indisponible »** (Connexions, Lectures vidéo). Lecture `count(head:true)` sur les stores existants (0 nouvelle table). API admin-only `/api/intelligence/overview`.
- **HUB-2 — First-party attribution** : Acquisition **par source** (first-touch, `analytics_sessions.source` immuable ; normalisation `internal`/`chapelle`/`unknown`), conversions partielles avec **split attribué / non-attribué**, **aucun taux de conversion** (cohortes différentes). API admin-only `/api/intelligence/acquisition`.
- **HUB-3 — Durable campaign attribution** : capture UTM **first-touch** à l'ingestion, agrégation **par (source, campagne)** (medium dominant, drill-down contenus, ligne « sans campagne », unattributed, **pas de taux**), helper `buildCampaignUrl`, API admin-only `/api/intelligence/campaigns`, onglet cockpit **[Par source | Par campagne]**.

Édition partagée sanctionnée (seule) hors `src/lib/intelligence/**` : `src/app/api/analytics/track/route.ts` (écriture UTM first-touch à l'INSERT uniquement) — `CONFLICT_RISK=NONE` (aucun autre chantier ne touche ce fichier).

## Base de données — DÉJÀ APPLIQUÉE

```
DB_MIGRATION_ALREADY_APPLIED_REMOTE=YES
```
La migration **`supabase/migrations/20260820120000_hub3_campaign_utm.sql`** (additive : `ADD COLUMN IF NOT EXISTS utm_medium/utm_campaign/utm_content/utm_term text` + index partiel `idx_asess_utm_campaign`) a été **appliquée en distant le 2026-08-20** (`supabase db push`, prod `nvyuyffywnuollaxguen`). **NE PAS réappliquer, NE PAS inverser l'ordre de release.**

```
DB_SMOKE=PASS
```
Smoke DB read-only (BEGIN READ ONLY, pooler) :
- Colonnes `utm_medium/utm_campaign/utm_content/utm_term` présentes — `text`, nullable, **sans défaut** ✓
- Index `idx_asess_utm_campaign` présent (partiel `WHERE utm_campaign IS NOT NULL`) ✓
- RLS `analytics_sessions` **activée**, **0 policy** → deny-by-default (service_role only) ✓
- **Aucune exposition anon nouvelle** : parité de grants colonne avec `source` préexistante ; la migration n'ajoute ni grant ni policy ✓
- `PENDING_MIGRATIONS=0` (« Remote database is up to date. ») · `DATA_LOSS=NO`

## Ordre de release — DÉJÀ RESPECTÉ

L'ordre impératif **migration UTM → smoke DB → déploiement app** est respecté : la migration est
appliquée et le smoke DB est PASS **AVANT** ce merge/déploiement. Le déploiement de cette app est
donc désormais **sûr** (l'INSERT de session avec colonnes utm ne peut plus échouer sur colonne
inconnue). `DEPLOY_REQUIRES_MIGRATION=YES` — condition **satisfaite**.

## Gates (locaux, sur la branche)

```
TSC=PASS     (tsc --noEmit exit 0)
TESTS=PASS   (vitest run : 123 fichiers / 1436 tests)
LINT=PASS    (No ESLint warnings or errors)
BUILD=PASS   (next build : 0 erreur ; routes overview + acquisition + campaigns + admin/intelligence + api/analytics/track compilées)
```

## Non-régression

- HUB-1 et HUB-2 **inchangés** : le lecteur campagne est **séparé** (ne sélectionne les colonnes utm que pour `/campaigns`) → `/api/intelligence/overview` et `/api/intelligence/acquisition` ne dépendent pas des nouvelles colonnes et ne régressent pas.
- Ingestion `/api/analytics/track` : ajout UTM à l'INSERT uniquement (immuable, comme `source`) ; branche update inchangée ; write-only, rate-limitée, 204 ; posture de sécurité inchangée.
- Aucune modification de Live / Podcast / PDF / Parcours / homepage / auth / middleware / CMS / nav globale / `app.js` / `.htaccess`.
- 0 PII exposée (sorties agrégées par source/campagne) ; sessions opaques ; pas de fingerprinting ; pas de faux taux de conversion.

## Revues (cumulées, toutes PASS)

Architecture · Sécurité · Privacy · Data-Accuracy · Performance · Migration-Safety · Conflits Git · QA (revues adversariales par lot P0/HUB-1/HUB-2/HUB-3 + réconciliations origin/main).

## Réconciliation

Branche réconciliée avec `origin/main` (Living Books PR#25 et PR#27, disjoints de l'Intelligence) par **merge** (jamais de rebase des checkpoints attestés) ; SHAs de checkpoints préservés.

## Checklist de smoke PRODUCTION (après merge + déploiement depuis `origin/main`)

Déployer via la procédure Citadelle éprouvée (préserver `app.js` / `.env` / `.htaccess` / `logs` ; **pas** de `rsync --delete` ; pas de nouveau mécanisme). Puis, dans l'ordre :

- **A. Santé** : `/` et `/admin` démarrent correctement.
- **B. Overview** : `/admin/intelligence` = **200**, `/api/intelligence/overview` = **200** (auth admin).
- **C. Acquisition (non-régression HUB-2)** : `/api/intelligence/acquisition` = **200**.
- **D. Campaigns (HUB-3)** : `/api/intelligence/campaigns` = **200** — **pas** de `500` / `missing column` / `schema cache error` / `permission denied`.
- **E. Smoke UTM réel** : visiter, sur une **nouvelle session**,
  `?utm_source=whatsapp&utm_medium=channel&utm_campaign=hub3_smoke&utm_content=release_test`,
  puis vérifier **en base (read-only)** : `source=whatsapp`, `utm_medium=channel`, `utm_campaign=hub3_smoke`,
  `utm_content=release_test`, `utm_term=NULL`. **Ne pas éditer la ligne à la main** — elle doit provenir de l'ingestion réelle.
- **F. First-touch immutability** : dans la **même session**, naviguer vers une page interne **sans UTM** →
  `source/medium/campaign/content` **INCHANGÉS** (`FIRST_TOUCH_PRESERVED=YES`, `INTERNAL_NAV_OVERWRITE=NO`).
- **G. Sécurité** : `/api/intelligence/campaigns` en **anonyme** → **refusé (401)** ; la réponse admin n'est jamais exposée à un visiteur anonyme (`CAMPAIGNS_ADMIN_ONLY=YES`, `ANON_CAMPAIGN_API_ACCESS=DENIED`, `RAW_PII_EXPOSED=NO`, `SERVICE_ROLE_CLIENT_EXPOSED=NO`).
- **H. Non-régression tracking** : `/api/analytics/track` OK, capture de session OK, pas de hausse anormale des erreurs serveur.

## Rollback

DB **additive** : en cas de défaut applicatif → **rollback app uniquement** vers le dernier artefact
Citadelle stable. **Ne pas** supprimer les colonnes UTM. **Ne pas** rollback la migration distante
(sauf incident exceptionnel démontré) — les colonnes restent inertes avec l'ancienne version de l'app.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
