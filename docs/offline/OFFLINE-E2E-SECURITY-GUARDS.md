# Harnais Playwright OFFLINE — Garde-fous de sécurité (Lot 1.2)

Ce document explique pourquoi le harnais **ne peut pas** s'exécuter contre la
production, et comment cette garantie est vérifiée par test.

## 1. Interdits (rappel)

Le harnais ne doit JAMAIS utiliser : l'URL/clé Supabase de production, un cookie
ou compte membre réel, le domaine `citadelle.chapelleduroyaume.org`, ni aucun
endpoint de production. Aucune donnée Supabase de production ne doit être touchée.

## 2. Aucun contournement activable en production

Le seul mécanisme « spécial » est la page `/offline-e2e` et l'auth factice
qu'elle injecte. Il est **inerte en production** par construction :

- **Page gardée** : `src/app/offline-e2e/page.tsx` appelle `isOfflineE2EServer()`
  qui, si `OFFLINE_E2E_MODE !== 'true'`, renvoie `false` → `notFound()` (404).
  En production, la variable `OFFLINE_E2E_MODE` **n'existe pas** (elle n'est
  présente que dans `.env.offline-e2e`, jamais dans les env de prod). Donc la page
  est un simple **404** en prod.
- **Auth factice confinée** : le contexte d'auth factice n'est fourni que dans
  `OfflineE2EHarness`, rendu uniquement par cette page 404-par-défaut. Aucun autre
  composant ne le voit. `AuthProvider`/`useAuth` de production restent inchangés.
- **Routes serveur intactes** : `/api/member/offline/{authorize,download}` ne sont
  **pas** modifiées ; elles restent pleinement authentifiées en production. Le
  harnais les mocke au **réseau** (Playwright), pas dans le code serveur.
- **Seule modif de fichier existant hors scripts** : `AuthProvider.tsx` exporte
  désormais `AuthContext` (mot-clé `export` ajouté). C'est purement **additif** —
  aucun changement de comportement, aucune logique d'auth modifiée.

## 3. Garde-fou BLOQUANT (`src/lib/offline/e2e-guard.ts`)

Quand `OFFLINE_E2E_MODE=true`, `assertOfflineE2ESafe(env)` **lève** si l'une des
variables surveillées contient un signal de production :

- Variables surveillées : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`.
- Signaux refusés : `nvyuyffywnuollaxguen` (réf. projet Supabase réel),
  `chapelleduroyaume.org` (domaine), `sb_secret_` / `sb_publishable_` (**format**
  d'une clé réelle — on ne committe JAMAIS la valeur secrète, seulement le format),
  `production`, `prod-`.
- De plus, `NEXT_PUBLIC_SITE_URL` **doit** être loopback (`127.0.0.1`/`localhost`).

Le garde-fou est **testé** :
- unitaire (Vitest) : `src/lib/offline/__tests__/e2e-guard.test.ts` (15 tests) ;
- E2E (Playwright) : `tests/offline-e2e/offline-production-guard.spec.ts`.

> **Ce garde-fou a été déclenché pour de vrai** pendant la mise au point : il a
> refusé de rendre la page tant que l'URL Supabase de production restait présente
> dans l'environnement (voir §4). C'est la preuve vivante qu'il protège.

## 4. Le piège `.env.local` (et sa neutralisation NON invasive)

`.env.local` (présent sur cette machine) contient les **valeurs de production**
(URL Supabase réelle, domaine, service role). Or Next charge **toujours**
`.env.local`, et — règle de précédence `@next/env` — ses clés **écrasent** ce
qu'on met dans `process.env`. Pré-exporter des variables ne suffit donc pas :
au runtime, `NEXT_PUBLIC_SUPABASE_URL` redevenait la valeur de production, et le
garde-fou refusait (500) — comportement **correct**.

Neutralisation retenue, **sans jamais toucher `.env.local`** : on exploite la
précédence de Next. L'ordre de chargement est

```
.env.production.local  >  .env.local  >  .env.production  >  .env
```

`scripts/offline-e2e/with-env.mjs` génère donc un **`.env.production.local`
temporaire** à partir de `.env.offline-e2e` (valeurs factices) : chargé en
premier, il **gagne** sur `.env.local`. Propriétés :

- `.env.production.local` est **gitignoré** → jamais committé, invisible en
  `git status`.
- Créé au lancement, **supprimé automatiquement** à la sortie (`exit`, `SIGINT`,
  `SIGTERM`, `SIGHUP`, `uncaughtException`) et au démarrage s'il traîne.
- **Anti-écrasement** : si un `.env.production.local` sans notre marqueur existe
  déjà, le lanceur **abandonne** plutôt que de l'écraser.
- Supabase laissé **vide** → `IS_DEMO_MODE=true` → **aucune** tentative réseau
  Supabase au build comme au runtime. (Les composants offline lisent malgré tout
  `isDemo=false` depuis le contexte factice, donc l'UII reste testable.)

## 5. Preuve que la production n'est pas contactée

- Env forcé en **loopback** + Supabase **vide** (démo) : aucune configuration de
  prod n'atteint le build ni le runtime (garde-fou en sentinelle).
- `baseURL` = `http://127.0.0.1:3100` (asserté dans la spec garde-fou).
- Les 2 endpoints offline sont **mockés** (Playwright `context.route`) : les octets
  proviennent de `tests/fixtures/offline/`, jamais d'un stockage réel.
- Aucune requête cross-origin vers `*.supabase.co` réel ni `chapelleduroyaume.org`
  n'est nécessaire au déroulé (le SW laisse d'ailleurs le cross-origin au réseau,
  et il n'y en a pas).

## 6. Empreinte sur le dépôt

| Fichier existant | Nature du changement |
|---|---|
| `src/components/providers/AuthProvider.tsx` | **+`export`** sur `AuthContext` (additif, 0 comportement) |
| `package.json` | +3 scripts `*:offline-e2e`, +devDep `@playwright/test` |

Tout le reste est **nouveau** et isolé (`src/app/offline-e2e/`, `src/lib/offline/e2e-guard.ts`,
`tests/offline-e2e/`, `tests/fixtures/offline/`, `scripts/offline-e2e/`,
`playwright.offline.config.ts`, `.env.offline-e2e`, `docs/offline/`).
