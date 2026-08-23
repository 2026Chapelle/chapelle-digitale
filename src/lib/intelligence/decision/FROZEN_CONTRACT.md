# CITADELLE INTELLIGENCE — 5B · CONTRAT GELÉ & CARTE DE PROPRIÉTÉ

**Base :** `main = c2f195e` (5A complet). **Branche :** `feat/citadelle-intelligence-5b`.

La Couche Décision transforme le hub 5A (tableau de bord véridique) en **surface
de décision véridique**, sans jamais fabriquer causalité, attribution, ou convertir
`NO_DATA → 0`. Vocabulaire gelé dans `contract.ts` + seuils dans `thresholds.ts`.

## Règle d'or (Evidence First)

Toute affirmation de décision porte **EVIDENCE + SOURCE + PERIOD + SCOPE**.
`COMPARISON / CONFIDENCE / ACTION` sont optionnels et n'apparaissent que si
**déterministiquement** justifiés. Aucun LLM au runtime. Agrégat uniquement (pas de PII).

## Parallélisme — propriété DISJOINTE des fichiers

Les agents travaillent **en parallèle** contre les types gelés. Chaque agent ne
crée QUE des fichiers dans son périmètre ; seul l'Agent 4 touche `page.tsx`.

| Agent | Périmètre (fichiers créés) | Livrable |
|------|-----------------------------|----------|
| **Superviseur (gelé)** | `decision/contract.ts`, `decision/thresholds.ts`, `decision/__tests__/contract.test.ts`, ce fichier | Contrat + seuils |
| **Agent 1 — Funnel** | `decision/funnel/*.ts` (+ `__tests__`) | `buildDecisionFunnel(inputs): DecisionFunnelPayload` PUR + lecteur des comptes (réutilise readers existants) |
| **Agent 2 — Signaux** | `decision/signals/*.ts` (+ `__tests__`), `decision/data-quality.ts` (+ test) | `evaluateSignals(inputs): DecisionSignalsPayload` PUR + `buildDataQuality(): DataQualityContext` |
| **Agent 3 — Canaux** | `decision/channels/*.ts` (+ `__tests__`) | `buildChannelValue(inputs): DecisionChannelsPayload` PUR |
| **Agent 4 — UX** | `components/admin/intelligence/decision/*.tsx`, **édite** `app/(admin)/admin/intelligence/page.tsx` | Onglet « Décision » + composants (funnel, signaux, canaux, drill-down, qualité) |
| **Agent 5 — Adversaire** | *(lecture seule)* | Revue Evidence First — peut bloquer |
| **Superviseur (intégration)** | `app/api/intelligence/decision/route.ts` | Agrégateur : lit le réel, appelle les 3 builders, renvoie `DecisionSurfacePayload` |

## Contrats de fonctions (signatures attendues des builders PURS)

```ts
// Agent 1
buildDecisionFunnel(input: FunnelBuildInput): DecisionFunnelPayload      // PUR
// Agent 2
evaluateSignals(input: SignalsBuildInput): DecisionSignalsPayload        // PUR
buildDataQuality(input: DataQualityBuildInput): DataQualityContext       // PUR
// Agent 3
buildChannelValue(input: ChannelsBuildInput): DecisionChannelsPayload    // PUR
```

Chaque agent définit son propre type `*BuildInput` (entrées déjà lues + horloge
injectée `nowIso`). **Aucune I/O dans les builders** : la lecture réelle vit dans
l'agrégateur superviseur (réutilise `readConversionCounts`, `readAcquisition`,
connecteurs `getYouTube*`, `getWhatsApp*`). Le mode démo se propage honnêtement.

## Sources réelles disponibles (rappel 5A — ne rien inventer)

- **first-party** : `analytics_events` (pageview), `analytics_sessions` (source/referrer),
  `profiles.created_at`, `audio_listening_events` (play_start/resume), `module_completions`,
  `event_registrations`, `priere_demandes`, `dons` (statut='complete').
- **Google** : GSC (`sc-domain`) + GA4 (487705498) — CONNECTÉS, read-only server-only.
- **YouTube** : CONNECTÉ (OAuth read-only). **WhatsApp** : attribution first-party ACTIVE.
- **Meta** : `BLOCKED_EXTERNAL_OWNER_ONLY` / honnête indisponible — NE PAS toucher.

## Interdits 5B (hors périmètre — ne PAS implémenter)

Objectifs mensuels, prévisions, détection d'anomalie, baselines historiques,
saisonnalité (→ 5C). Suggestions de sujets éditoriaux/sermons/podcasts (→ 6A).
Moteur de décision par LLM. Mutation GSC/sitemap. Toute action Meta.

## Gardes de vérité (rappel, testés partout)

1. Étape funnel non instrumentée ⇒ `UNAVAILABLE` (jamais 0).
2. Taux seulement si num REAL + dénom REAL + dénom > 0 + cohortes comparables.
3. Métrique de plateforme ≠ résultat Citadelle (colonnes séparées).
4. `unattributed` reste `unattributed` (jamais réattribué).
5. `REAL_ZERO` préservé ; `NO_DATA` préservé ; `DEMO` jamais confondu avec réel.
6. Classement seulement si ≥ 2 canaux comparables, sinon `NOT_AVAILABLE`.
7. LOW / INSUFFICIENT_DATA jamais en recommandation confiante ni action prioritaire.
