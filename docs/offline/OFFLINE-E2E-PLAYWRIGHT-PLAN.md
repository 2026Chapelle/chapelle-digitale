# Harnais Playwright OFFLINE — Plan (Lot Offline 1.2)

Recette navigateur **automatisée et isolée** du lot Offline 1 + 1.1, sans
production, sans compte réel, sans données Supabase réelles.

## 1. Principe

On teste la **chaîne offline réelle de production** (service worker `public/sw.js`,
IndexedDB `src/lib/offline/db.ts`, orchestration `manager.ts`, lecteurs
`OfflineAudioPlayer`/`OfflinePdfViewer`, boutons `OfflineDownloadButton`,
bibliothèque `OfflineLibrary`, fallback `/offline`) contre un **build de
production local** servi sur `http://127.0.0.1:3100`.

Deux seules choses sont neutralisées, aux frontières :

| Élément réel | Traitement E2E | Pourquoi |
|---|---|---|
| Session membre (`useAuth`) | Contexte d'auth **factice** injecté dans un sous-arbre gardé | Pas de compte réel ; `manager.ts` prend déjà `userId` en paramètre |
| `/api/member/offline/{authorize,download}` | **Mockés au réseau** par Playwright (`context.route`) | Routes serveur de prod **inchangées** ; on sert des fixtures locales |

Aucun autre code de production n'est modifié (voir `OFFLINE-E2E-SECURITY-GUARDS.md`).

## 2. Composants du harnais

```
.env.offline-e2e                       Env FACTICE local (GITIGNORÉ — cf. §3.1)
scripts/offline-e2e/with-env.mjs       Lanceur : génère un .env.production.local
                                       temporaire (gagne sur .env.local prod),
                                       garde-fou, nettoyage garanti
scripts/offline-e2e/gen-fixtures.mjs   Génère sample.pdf + sample.wav + manifest
tests/fixtures/offline/                sample.pdf, sample.wav, fixtures.json
src/lib/offline/e2e-guard.ts           Garde-fou production (autonome, testé)
src/app/offline-e2e/page.tsx           Page GARDÉE (notFound sauf OFFLINE_E2E_MODE)
src/app/offline-e2e/OfflineE2EHarness  Monte les vrais composants + auth factice
playwright.offline.config.ts           Config dédiée (Chromium, workers 1, artefacts
                                       échec seulement)
tests/offline-e2e/_helpers.ts          Mocks réseau, lecture IndexedDB/Cache, SW
tests/offline-e2e/*.spec.ts            8 fichiers de specs (voir §4)
```

## 3. Commandes

```bash
npm run gen:offline-e2e-fixtures   # (ré)génère les fixtures déterministes
npm run build:offline-e2e          # build de prod avec env FACTICE
npm run test:offline-e2e           # démarre le serveur + lance les specs
# variante manuelle : npm run start:offline-e2e (serveur seul sur :3100)
```

Prérequis navigateur : `npx playwright install chromium` (une fois).

### 3.1 Recréer `.env.offline-e2e` (gitignoré, 100 % factice, aucun secret)

Ce fichier n'est **pas** versionné (règle « aucun `.env` committé »). Le recréer à
la racine avec ce contenu exact :

```dotenv
NODE_ENV=production
OFFLINE_E2E_MODE=true
NEXT_PUBLIC_OFFLINE_E2E_MODE=true
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3100
# Supabase laissé VIDE → IS_DEMO_MODE=true (aucune tentative réseau)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_ACCESS_CODE=offline-e2e-fake-admin-code
ADMIN_SESSION_TOKEN=offline-e2e-fake-admin-token
```

Le garde-fou (`e2e-guard.ts`) refuse le démarrage si l'une de ces valeurs contenait
un signal de production.

> ⚠️ Le port **3100** doit être libre : la config utilise `reuseExistingServer:false`
> pour ne JAMAIS réutiliser un serveur résiduel (qui pourrait être prod-leaké).
> Si un serveur traîne : le tuer avant de relancer.

## 4. Scénarios → specs → assertions

| Scénario | Spec | Assertions clés |
|---|---|---|
| A — Service worker | `offline-service-worker.spec.ts` | `/sw.js` 200 ; `serviceWorker.ready` ; `active.state==='activated'` ; scope `/` ; `controller` après reload ; cache `citadelle-shell-v1` ; **0 erreur console** |
| B — PDF hors ligne | `offline-pdf.spec.ts` | téléchargement autorisé (mock) ; item IndexedDB (type/mime/taille/user) + blob stocké ; **blob lisible offline** (en-tête `%PDF-`, taille exacte, lecture directe IndexedDB) ; ouverture via `OfflinePdfViewer` en `blob:` **sans requête réseau** |
| C — Audio hors ligne | `offline-audio.spec.ts` | item IndexedDB ; source `blob:` ; `play`/`pause`/reprise via le vrai lecteur ; `currentTime>0` ; **aucune requête réseau** |
| D — Rechargement à froid | `offline-cold-reload.spec.ts` | offline + route membre non cachée → fallback `/offline` (« Tu es hors connexion ») ; ni erreur Chromium, ni écran blanc |
| E — Cache Storage | `offline-cache-storage.spec.ts` | shell présent (`/offline`, `/manifest.json`, icônes, logo) ; **aucune** entrée `/api/`, `/_next/data/`, `_rsc=` |
| F — IndexedDB | `offline-indexeddb.spec.ts` | 2 ressources stockées ; suppression d'une via l'UI **réellement** répercutée (item + blob) ; l'autre intacte |
| G — Retour en ligne | `offline-online-recovery.spec.ts` | cycle offline→online ; reprise (page 200, pas de fallback) ; contenus offline préservés |
| Garde-fou prod | `offline-production-guard.spec.ts` | refus URL/domaine/clé de prod (`assertOfflineE2ESafe` lève) ; serveur sert bien la page en local |

## 5. Fixtures (déterministes, 100 % factices)

| contentId | Fichier | Type | MIME | Taille | Notes |
|---|---|---|---|---|---|
| `e2e-pdf-001` | `sample.pdf` | pdf | application/pdf | 594 o | PDF 1 page valide |
| `e2e-audio-001` | `sample.wav` | audio | audio/wav | 8044 o | WAV PCM 8 bits 1 s @ 8 kHz |

> Choix du **WAV** plutôt que MP3 : `audio/wav` est whitelisté côté offline
> (`ALLOWED_OFFLINE_MIME`) et se décode de façon **fiable en Chromium headless**,
> ce qui rend l'assertion de lecture (`currentTime>0`) déterministe. Le manifest
> `fixtures.json` fige id/titre/mime/taille/sha256/date/autorisation.

## 6. Limites assumées

- Les **routes serveur** `authorize`/`download` sont mockées (approche B, explicitement
  autorisée) : leur logique d'autorisation reste couverte par les tests unitaires
  purs (`policy.test.ts`, `sw-policy.test.ts`) et par le code de prod **inchangé**.
- Le **rendu visuel** du PDF dans l'`<iframe blob:>` dépend de la CSP `frame-src`
  de production (qui ne liste pas `blob:`). Le harnais prouve la **lisibilité des
  octets hors ligne** (lecture IndexedDB) et l'attribution d'une source `blob:` ;
  le rendu pixel du PDF reste à confirmer en recette manuelle si nécessaire.
- `next start` émet un avertissement « does not work with output: standalone » :
  bénin ici (le serveur sert correctement le build ; la recette passe).
