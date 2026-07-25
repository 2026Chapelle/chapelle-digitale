# OFFLINE 1.2 — RAPPORT DE RECETTE PLAYWRIGHT (environnement isolé)

> **VERDICT : `OFFLINE_1_2_PLAYWRIGHT_VALIDATED` → `READY_FOR_REVIEW_BEFORE_PUSH`**
> Harnais préparé **ET exécuté** en environnement isolé non-production ; tous les
> scénarios passent (12/12). Aucune poussée effectuée.

---

## 1. Environnement

| Champ | Valeur |
|---|---|
| Commit | `568bbc41ef2f0fedf819c9f2fcf58e56e2cc261c` (HEAD, branche `stabilisation-p0-recette-citadelle`) |
| OS | Microsoft Windows 11 Famille — build 10.0.26200.0 |
| Navigateur | Playwright Chromium — Chrome for Testing **151.0.7922.34** |
| Playwright | **1.62.0** (`@playwright/test`) |
| Node | v24.15.0 |
| URL locale | `http://127.0.0.1:3100` (loopback strict) |
| Mode | build **production local** (`output: standalone`, `next start -p 3100`) |
| Supabase | **vide** → `IS_DEMO_MODE=true` (aucune tentative réseau Supabase) |
| Compte | **aucun compte réel** — contexte d'auth factice `offline-e2e-user` |
| Endpoints offline | **mockés** (Playwright `context.route`), fixtures locales |
| Horodatage | 2026-07-25 |

## 2. Résultat global

```
Running 12 tests using 1 worker
12 passed (30.1s)
results.json : expected 12 · unexpected 0 · flaky 0 · skipped 0
```

Contrôles obligatoires exécutés **avant** verdict :

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| Tests unitaires offline (`vitest src/lib/offline`) | ✅ 60/60 (dont 15 garde-fou) |
| Suite unitaire complète (`npm test`) | ✅ 958/958 (78 fichiers) |
| Garde-fou production (Vitest + Playwright) | ✅ testé et **déclenché pour de vrai** en cours de MAP |
| `npm run build:offline-e2e` | ✅ Compiled successfully |
| `npm run test:offline-e2e` (Playwright) | ✅ 12/12 |
| `git diff --check` | ✅ aucun problème d'espaces |

## 3. Tableau PASS/FAIL par scénario

| Scénario | Spec | Résultat |
|---|---|---|
| A — Installation service worker | `offline-service-worker.spec.ts` | ✅ PASS — `SERVICE_WORKER_ACTIVE` |
| B — PDF hors ligne | `offline-pdf.spec.ts` | ✅ PASS — `OFFLINE_PDF_OK` |
| C — Audio hors ligne | `offline-audio.spec.ts` | ✅ PASS — `OFFLINE_AUDIO_OK` |
| D — Rechargement à froid hors ligne | `offline-cold-reload.spec.ts` | ✅ PASS — `OFFLINE_COLD_RELOAD_OK` |
| E — Cache Storage | `offline-cache-storage.spec.ts` | ✅ PASS — `CACHE_STORAGE_OK` |
| F — IndexedDB | `offline-indexeddb.spec.ts` | ✅ PASS — `INDEXEDDB_OK` |
| G — Retour en ligne | `offline-online-recovery.spec.ts` | ✅ PASS — `ONLINE_RECOVERY_OK` |
| Garde-fou production (5 tests) | `offline-production-guard.spec.ts` | ✅ PASS |

### Détail des assertions vérifiées

- **A** : `/sw.js` 200 (type JS) ; `serviceWorker.ready` résout ; `active.state==='activated'` ;
  scope `/` ; `controller` présent après reload ; cache `citadelle-shell-v1` présent ;
  **0 erreur console**.
- **B** : autorisation (mock) ; item IndexedDB `completed` (type=pdf, mime `application/pdf`,
  taille 594 o, `userId=offline-e2e-user`) ; blob stocké ; **lecture offline du blob**
  (en-tête `%PDF-`, taille exacte) ; ouverture `OfflinePdfViewer` en `blob:` **sans
  aucune requête `/api/member/offline/download`**.
- **C** : item IndexedDB (type=audio, mime `audio/*`, 8044 o) ; source `blob:` ;
  `play` → `currentTime>0` ; `pause` ; reprise ; **aucune requête réseau**.
- **D** : offline + route `/member/dashboard/route-inexistante-e2e` → fallback `/offline`
  (« Tu es hors connexion ») ; corps non vide ; pas de motif d'erreur Chromium ; statut < 400.
- **E** : `citadelle-shell-v1` contient `/offline`, `/manifest.json`, `/icon-192.png`,
  `/icon-512.png`, `/images/logo-mark.png` ; **aucune** entrée `/api/`, `/_next/data/`, `_rsc=`.
- **F** : 2 items + 2 blobs ; suppression du PDF via bouton « Supprimer » → item **et** blob
  réellement retirés ; l'audio reste `completed`.
- **G** : cycle `setOffline(true)`→`setOffline(false)` ; reload → page harnais 200 (pas de
  fallback) ; item PDF préservé (`completed`, 594 o, blob présent) ; UI « Disponible hors ligne ».
- **Garde-fou** : refus (throw) pour URL Supabase de prod, domaine de prod, clé `sb_secret_` ;
  acceptation de l'env local sain ; serveur servant bien la page en local (`baseURL` loopback).

## 4. Captures / traces d'échec

**Aucune** — la config `screenshot: only-on-failure`, `video/trace: retain-on-failure`
ne produit d'artefacts qu'en cas d'échec, et il n'y a **aucun échec**. Rapports
générés : `artifacts/offline-playwright/html-report/`, `results.json`.

> Note historique honnête : lors de la mise au point, des échecs intermédiaires ont
> été rencontrés et corrigés — (1) `import.meta` en CJS ; (2) le **garde-fou a
> légitimement bloqué** (500) tant que `.env.local` (production) injectait l'URL
> Supabase réelle ; (3) un **serveur résiduel** sur le port 3100 était réutilisé.
> Corrections : `__dirname`, génération d'un `.env.production.local` temporaire qui
> prime sur `.env.local` (voir SECURITY-GUARDS §4), et `reuseExistingServer:false`.
> Le run final ci-dessus est propre.

## 5. Preuve que la production n'a PAS été contactée

- Environnement forcé en **loopback** (`127.0.0.1:3100`) + Supabase **vide**
  (`IS_DEMO_MODE=true`) → aucune configuration de prod n'atteint build ni runtime.
- Le **garde-fou** `assertOfflineE2ESafe` lève à la moindre valeur de prod ; il a
  effectivement empêché tout démarrage tant que l'URL Supabase réelle traînait.
- Les octets PDF/audio proviennent de `tests/fixtures/offline/` (mocks réseau),
  jamais d'un stockage réel ; aucun appel `*.supabase.co` réel n'est nécessaire.
- `baseURL` loopback **asserté** dans `offline-production-guard.spec.ts`.

## 6. Empreinte dépôt (fichiers créés/modifiés par ce lot)

**Modifiés (par moi) :** `package.json` (+3 scripts, +devDep `@playwright/test`),
`package-lock.json`, `src/components/providers/AuthProvider.tsx` (**+`export`** sur
`AuthContext`, additif).

**Non versionnés (gitignorés) :** `.env.offline-e2e` (env factice, aucun secret —
recréable depuis `docs/offline/OFFLINE-E2E-PLAYWRIGHT-PLAN.md §3.1`), et les sorties
Playwright lourdes `artifacts/offline-playwright/{html-report,results.json,test-results}`.
Seul ce rapport `.md` est versionné.

**Créés (par moi, versionnés) :** `playwright.offline.config.ts`,
`src/lib/offline/e2e-guard.ts`, `src/lib/offline/__tests__/e2e-guard.test.ts`,
`src/app/offline-e2e/{page.tsx,OfflineE2EHarness.tsx}`, `scripts/offline-e2e/{with-env.mjs,gen-fixtures.mjs}`,
`tests/offline-e2e/*` (helpers + 8 specs), `tests/fixtures/offline/{sample.pdf,sample.wav,fixtures.json}`,
`docs/offline/{OFFLINE-E2E-PLAYWRIGHT-PLAN.md,OFFLINE-E2E-SECURITY-GUARDS.md}`,
`artifacts/offline-playwright/*` (ce rapport + html-report + results.json).

**Modifs PRÉ-EXISTANTES (PAS de mon fait, déjà présentes au début de session) :**
`.claude/settings.local.json`, `scripts/deploy-homepage-v3-remote.sh`, et les
non-suivis `artifacts/chapelle-home-*`, `docs-migration-wp/WM-3.1/`,
`scripts/deploy-chapelle-home-release.sh`, `scripts/preflight-chapelle-home-remote.sh`.
Aucun de ces fichiers « intouchables » n'a été modifié par ce lot.

**Fichier temporaire** `.env.production.local` : généré puis **supprimé
automatiquement** à chaque run (gitignoré ; absent en fin d'exécution).

## 7. Verdict

```
OFFLINE_1_2_PLAYWRIGHT_VALIDATED
READY_FOR_REVIEW_BEFORE_PUSH
```

Aucune poussée, aucun déploiement, aucune migration n'ont été effectués.
