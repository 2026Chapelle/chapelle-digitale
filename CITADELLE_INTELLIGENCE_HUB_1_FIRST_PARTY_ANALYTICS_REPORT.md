# CITADELLE_INTELLIGENCE_HUB_1_FIRST_PARTY_ANALYTICS_REPORT

_Date : 2026-08-19 — Superviseur : Claude (Opus 4.8). Principe : **FIRST-PARTY TRUTH BEFORE EXTERNAL CHANNELS.**_

## Base & tête

```
PHASE0_BASE_COMMIT=5be55750e564d258de0cd84cfed5a85c4b9c7b3b  (checkpoint Phase 0, parent origin/main 38328ce)
HUB1_HEAD=<voir commit ci-dessous>   (même worktree, même branche feat/citadelle-intelligence-hub-foundation)
WORKTREE=C:/Users/Révérend Doxa/Desktop/cier-platform-intelligence-hub
```

## Contrat d'événements — couverture réelle (audit 6 agents read-only)

```
CANONICAL_EVENTS_TOTAL=19
```

Cartographie de chaque événement canonique sur une **source de vérité existante**
(aucune nouvelle table d'ingestion). Extrait décisif pour la Vue générale :

| Événement | Source réelle | Qualité |
|---|---|---|
| page_view | `public.analytics_events` `type='pageview'` | available |
| session_start | `analytics_sessions.first_seen` | partial |
| signup_start | `chapelle.analytics_events` `sign_up_started` | partial |
| signup_complete | `profiles.created_at` (trigger) | available |
| login | `analytics_sessions.is_auth` / `auth.users.last_sign_in_at` | partial (pas d'event fiable) |
| live_view_start | `activity_logs` `live_view` (auth only) | available |
| live_view_30s / 5m | dérivé heartbeat (site-wide) | partial |
| live_complete | — | gap |
| podcast_play / complete | `audio_listening_events` | available |
| pdf_open | `activity_logs` `pdf_download` / `analytics_events` `download` | partial |
| pdf_progress / complete | — (pas de document_progress) | gap |
| parcours_start | `inscriptions_formation`⋈`parcours_formations` | partial (ambigu) |
| lesson_start | — (video_progress = état, pas de start) | gap |
| lesson_complete | `module_completions.completed_at` (immuable) | available |
| cta_click | `analytics_events` `click` / `chapelle` `cta_click` | available |
| outbound_click | non systématiquement capté | partial |

```
AVAILABLE=8   PARTIAL=7   GAPS=4
```

## Métriques implémentées (Vue générale)

```
REAL_METRICS_IMPLEMENTED=5
  - Visites            (analytics_events type='pageview', jour UTC)          NEAR_REALTIME
  - Sessions actives   (analytics_sessions.last_seen ≥ now-90s)              REALTIME
  - Inscriptions       (profiles.created_at, jour UTC — source canonique)    SYNCED
  - Écoutes podcast    (audio_listening_events play_start+play_resume)       NEAR_REALTIME
  - Progressions parcours (module_completions.completed_at, jour UTC)        SYNCED
DEMO_METRICS_REMAINING=0 en prod (mode démo global uniquement si Supabase non configuré : toutes cartes source → DEMO explicite)
UNAVAILABLE_METRICS=2
  - Connexions      → « Indisponible » (aucun event login fiable ; sign_in_started réétiqueté 'custom')
  - Lectures vidéo  → « Indisponible » (proxy type='video' surcompte les checkpoints)
```

Chaque carte est **Réel / Démo / Indisponible** de façon déterministe. Aucun nombre
fictif n'est présenté comme réel ; les indisponibles n'affichent jamais un « 0 » trompeur.

### Décisions de mesure honnêtes (issues de la revue Data-Accuracy)
- **Sessions actives, pas « Utilisateurs »** : compte des sessions (`analytics_sessions`,
  inclut l'anonyme, 1/onglet). Libellé corrigé pour ne pas surévaluer.
- **« Aujourd'hui » = jour UTC** (≈ Abidjan/GMT), indépendant du fuseau serveur.
- **Écoutes podcast** = `play_start`+`play_resume` (plays/écoutes, cohérent avec le
  `total_plays` canonique d'`audio-analytics`), documenté comme volume d'écoutes.

## Sources & schéma

```
DATA_SOURCES_USED=public.analytics_events, public.analytics_sessions, public.profiles,
  public.audio_listening_events, public.module_completions  (toutes RLS service_role only)
TABLES_CREATED=0
TABLES_REUSED=5  (aucune nouvelle table ; lecture via adapters count(head:true))
MIGRATIONS_CREATED=0 appliquées ; DRAFT non appliqué enrichi d'un index de support
  (idx_modcompl_completed sur module_completions.completed_at) — flag perf, NON appliqué.
REMOTE_MIGRATIONS_APPLIED=NO
```

## Fichiers

```
FILES_CREATED=9
  src/app/api/intelligence/overview/route.ts
  src/lib/intelligence/adapters/{count-specs,supabase-reader,index}.ts
  src/lib/intelligence/adapters/__tests__/{count-specs,supabase-reader}.test.ts
  src/lib/intelligence/metrics/{overview,index}.ts
  src/lib/intelligence/metrics/__tests__/overview.test.ts
FILES_MODIFIED=4 (tous des artefacts intelligence de la Phase 0)
  src/app/(admin)/admin/intelligence/page.tsx        (Vue générale réelle + états)
  src/lib/intelligence/types/events.ts               (réconciliation contrat 'login')
  src/lib/intelligence/data-model/DATA_MODEL.md       (définitions HUB-1)
  src/lib/intelligence/data-model/intelligence_hub_foundation.draft.sql (index de support, non appliqué)
OUT_OF_SCOPE_FILES=0
```

## Architecture (flux)

```
stores existants → adapters (count-specs PUR + supabase-reader IMPUR, port injecté)
  → metrics (buildOverview PUR : Réel/Démo/Indisponible)
  → API /api/intelligence/overview (admin-only, service_role, count-only, cache 30s)
  → cockpit /admin/intelligence (Vue générale ; l'UI ignore les tables)
```

## Gates

```
TSC=PASS (tsc --noEmit exit 0)
TESTS=PASS (vitest run : 112 fichiers / 1354 tests ; dont 47 intelligence)
LINT=PASS (next lint intelligence : No ESLint warnings or errors)
BUILD=PASS (next build : ✓ Compiled successfully, 0 erreur, /admin/intelligence + /api/intelligence/overview compilés)
```

## Reviewers de fin (6, indépendants, en parallèle)

```
ARCHITECTURE_REVIEW=PASS   (findings low : DTO dupliqué → import type ; union discriminée → countKey! supprimé ; corrigés)
SECURITY_REVIEW=PASS       (0 finding : admin-only fail-closed, pas de service_role client, count-only sans PII, aucune migration)
DATA_ACCURACY_REVIEW=PASS  (MED sessions≠users → relabel CORRIGÉ ; LOW timezone → UTC CORRIGÉ ; LOW podcast def → documenté)
PERFORMANCE_REVIEW=PASS    (MED index completed_at → capturé dans le draft NON appliqué ; head:true, Promise.all, cache stable)
PARALLEL_CONFLICT_REVIEW=PASS (9 new + Phase-0 modifiés uniquement ; 0 hors périmètre ; 0 migration ajoutée)
QA_EVIDENCE_REVIEW=PASS    (caveats honnêtes : preuve unitaire via faux DB, pas d'intégration live ; podcast = plays défini)
```

## Ce que Citadelle sait mesurer réellement (aujourd'hui)

1. **Visites** du jour, **sessions actives** (temps réel 90s), **inscriptions** du jour,
   **écoutes podcast** du jour, **progressions de parcours** (leçons complétées) du jour.
2. Le tout **first-party**, sans dépendre d'aucun canal externe, avec fraîcheur explicite.

## Ce qui manque encore (gaps honnêtes)

- **Connexions** : pas d'event de login fiable (dériver de `is_auth`/`last_sign_in_at` = chantier ultérieur, sans tracker intrusif).
- **Lectures vidéo** : pas d'event de démarrage fiable (le proxy surcompte) → instrumentation dédiée nécessaire.
- **live_complete, pdf_progress/complete, lesson_start** : non captés (gaps de schéma documentés).
- **Attribution** : contrat prêt (`detectSource`, sessions opaques) ; agrégation UTM à brancher en HUB-2.

## Isolation / non-mutation

```
MAIN_UNCHANGED=YES (local 2d5a255 ; origin/main 38328ce)
OTHER_WORKTREES_UNCHANGED=YES
PRODUCTION_MUTATED=NO
REMOTE_SUPABASE_MUTATED=NO
```

## Recommandations pour la suite

```
NEXT_RECOMMENDED_PHASE=
  A) Combler les gaps first-party à forte valeur : login fiable (is_auth/last_sign_in_at, non intrusif),
     puis instrumentation "video start" propre (au lieu du proxy).
  B) HUB-2 : attribution first-party (agrégats UTM via detectSource, sessions opaques).
  C) Sur GO explicite : appliquer l'index de support (idx_modcompl_completed) puis, plus tard,
     les tables du draft (channels/seo/campaigns/conversion) quand les connecteurs externes seront demandés.
  D) Câblage nav admin (avec renommage désambiguïsant vs /admin/intelligence-pastorale).
```

## STOP

HUB-1 terminé et prouvé. **Aucun** enchaînement vers Google / SEO / connecteurs sociaux.
Aucun déploiement, merge, push, migration distante ou mutation production. En attente du
prochain GO explicite de Doxa.
