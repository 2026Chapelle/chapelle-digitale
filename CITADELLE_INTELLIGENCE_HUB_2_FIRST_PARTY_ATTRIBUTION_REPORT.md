# CITADELLE_INTELLIGENCE_HUB_2_FIRST_PARTY_ATTRIBUTION_REPORT

_Date : 2026-08-20 — Superviseur : Claude (Opus 4.8). Principe : **ATTRIBUTION BEFORE EXTERNAL ANALYTICS.**_

## Base & tête

```
HUB1_BASE=b9e0eb6598460e87f9aa39fc39521db99cfeb5ce
HUB2_HEAD=<voir commit ci-dessous>   (même worktree, même branche feat/citadelle-intelligence-hub-foundation)
PARENT_CHAIN=38328ce (origin/main) → 5be5575 (Phase 0) → b9e0eb6 (HUB-1) → HUB-2
```

## Agents

```
AGENTS_USED=13 (6 audit read-only en parallèle + 7 reviewers de fin en parallèle)
```

## Existant réutilisé (0 nouvelle table)

```
EXISTING_UTM_SUPPORT=client parse utm_source/medium/campaign/content/term (AnalyticsTracker) ; SERVEUR n'en garde que la SOURCE dérivée (detectSource) — medium/campaign/content NON stockés
EXISTING_REFERRER_SUPPORT=analytics_sessions.referrer (256c) + landing_path, écrits à l'INSERT uniquement
SESSION_MODEL=analytics_sessions.session_key (aléatoire opaque crypto.randomUUID, per-onglet), user_id nullable ; RLS service_role only ; PAS de PII/IP/cookie/fingerprint
ATTRIBUTION_MODEL=FIRST-TOUCH SESSION, normalisation à la LECTURE (analytics_sessions.source figé à l'INSERT = first-touch préservé, jamais écrasé par la nav interne)
```

## Modèle de source (normalisation pure)

```
SUPPORTED_SOURCES=whatsapp, facebook, instagram, youtube, google, tiktok, twitter, telegram, email, chapelle, referral, direct, other, unknown
  (+ 'internal' = bucket technique EXCLU de l'attribution)
Priorité : canal spécifique déjà déterminé (UTM-first) > raffinage par hôte du referrer > buckets.
DIRECT_RULE=source='direct' (aucun referrer). source vide/nulle → 'unknown' (JAMAIS 'direct').
INTERNAL_REFERRER_RULE=hôte = Citadelle (citadelle.chapelleduroyaume.org / localhost) → 'internal' (exclu) ;
  hôte *.chapelleduroyaume.org (site frère) → 'chapelle'. La nav interne n'écrase PAS le first-touch (session la plus ancienne par user).
Limites documentées : detectSource replie tous les moteurs de recherche dans 'google' ; utm_source arbitraire → 'other' ; body.source client-override existe à l'ingestion (non exploité, hors périmètre lecture).
```

## Attribution des conversions

```
VISIT_ATTRIBUTION=RÉEL (analytics_sessions.source natif à la session, first-touch ; jour UTC ; index idx_asess_first)
SIGNUP_ATTRIBUTION=PARTIEL (profiles.id → session la plus ancienne par user_id → source ; split attribué/non-attribué explicite)
PODCAST_ATTRIBUTION=PARTIEL (audio_listening_events → session_key prioritaire, sinon user_id → source)
PARCOURS_ATTRIBUTION=PARTIEL (module_completions.user_id → session la plus ancienne → source)
```

Honnêteté : chaque conversion non rattachable (ou résolue en 'internal') est comptée dans
`unattributed` (jamais réattribuée). **Aucun taux de conversion par source n'est affiché** :
les visites sont bornées au jour, mais le first-touch d'une conversion peut pointer une
session ANTÉRIEURE → cohortes différentes (taux > 100 % possible) ⇒ non fiable, donc non
affiché (GO §14). Le primitif sûr `conversionRate` (dénominateur 0 → null) reste testé pour usage futur.

## Base de données

```
DATABASE_REUSED=public.analytics_sessions, public.profiles, public.audio_listening_events, public.module_completions (toutes RLS service_role only)
NEW_TABLES=0
MIGRATIONS_DRAFTED=aucune nouvelle ; le draft NON appliqué conserve l'index de support module_completions.completed_at (perf, commun HUB-1/HUB-2)
REMOTE_MIGRATIONS_APPLIED=NO
COLUMN_GAP (documenté)=campagnes/medium/content : utm bruts non stockés → attribution par CAMPAGNE impossible aujourd'hui (colonnes additives futures, hors HUB-2)
```

## API & Dashboard

```
API_CREATED=GET /api/intelligence/acquisition — admin-only (isAdminRequest ; le middleware ne couvre pas /api/intelligence),
  service_role, lectures BORNÉES (limit 20000) + parallélisées (Promise.all 2 vagues), cache 60s, jour UTC.
  Sortie AGRÉGÉE PAR SOURCE uniquement : aucune PII (ni user_id, ni session_key, ni referrer, ni ville).
DASHBOARD_UPDATED=onglet « Acquisition » de /admin/intelligence : tableau Source × (Visites / Inscriptions / Écoutes / Progressions)
  + report « non attribué » et « nav interne exclue ». États Réel / Démo / « Aucune donnée attribuée ».
```

## Fichiers

```
FILES_CREATED=12
  src/lib/intelligence/attribution/{normalize,resolve,aggregate,index}.ts
  src/lib/intelligence/attribution/__tests__/{normalize,resolve,aggregate}.test.ts
  src/lib/intelligence/metrics/acquisition.ts (+ __tests__/acquisition.test.ts)
  src/lib/intelligence/adapters/acquisition-reader.ts (+ __tests__/acquisition-reader.test.ts)
  src/app/api/intelligence/acquisition/route.ts
FILES_MODIFIED=4
  src/app/(admin)/admin/intelligence/page.tsx           (onglet Acquisition)
  src/lib/intelligence/types/attribution.ts             (+ source 'chapelle')
  src/lib/intelligence/adapters/index.ts                (barrel export)
  src/lib/intelligence/metrics/index.ts                 (barrel export)
OUT_OF_SCOPE_FILES=0
```

## Gates (preuves réelles)

```
TSC=PASS (tsc --noEmit exit 0)
TESTS=PASS (vitest run : 117 fichiers / 1379 tests ; dont ~24 attribution/acquisition)
LINT=PASS (next lint intelligence : No ESLint warnings or errors)
BUILD=PASS (next build : 0 erreur, /api/intelligence/acquisition + overview + /admin/intelligence compilés)
```

Tests couvrant les noms imposés (GO §20) : UTM_SOURCE_WINS, EXTERNAL_REFERRER_DETECTED,
INTERNAL_REFERRER_IGNORED, DIRECT_DETECTED, UNKNOWN_SOURCE_TO_OTHER, FIRST_TOUCH_PRESERVED,
INTERNAL_NAV_DOES_NOT_OVERWRITE_SOURCE, WHATSAPP/FACEBOOK/YOUTUBE/GOOGLE/CHAPELLE_ATTRIBUTION,
ZERO_DENOMINATOR_SAFE, NO_DOUBLE_COUNTING, NO_PII_IN_ATTRIBUTION. SESSION_ID_OPAQUE = hérité de
l'ingestion (session_key = crypto.randomUUID, hors périmètre HUB-2). ACQUISITION_API / DASHBOARD =
gates d'intégration/câblage couverts par TSC+BUILD (pas de test unitaire dédié).

## Reviewers de fin (7, indépendants, en parallèle) — tous PASS

```
ARCHITECTURE_REVIEW=PASS   (LOW : exports morts supprimés ; dayBucket→hourBucket ; option-divergence documentée)
SECURITY_REVIEW=PASS       (0 finding : admin-only fail-closed, 0 injection [aucun param client → SQL], bornes, 0 secret)
DATA_ACCURACY_REVIEW=PASS  (MED cohortes → taux supprimé ; LOW départage déterministe → corrigé ; LOW def podcast → documentée)
PRIVACY_REVIEW=PASS        (0 finding : 0 PII en sortie, opaque, pas de cookie/IP/fingerprint, session server-side only)
PERFORMANCE_REVIEW=PASS    (LOW Promise.all → appliqué ; LOW index completed_at → dans le draft ; lectures bornées, pas de N+1)
PARALLEL_CONFLICT_REVIEW=PASS (12 new + 4 modif intelligence ; 0 hors périmètre ; 0 migration ajoutée)
QA_EVIDENCE_REVIEW=PASS    (data-accuracy solidement couverte ; ajout test NO_PII_IN_ATTRIBUTION ; API/DASHBOARD = TSC/BUILD)
```

## Ce que Citadelle sait dire désormais

1. **« Cette VISITE vient de cette source »** — réel, first-touch, par jour (WhatsApp / Facebook / YouTube / Google / Chapelle / Direct / …).
2. **« Ces inscriptions / écoutes / progressions viennent de cette source »** — partiel, avec la part non attribuée affichée honnêtement.
3. La nav interne n'est jamais comptée comme une source ; une donnée SEO n'est jamais montrée comme temps réel.

## Gaps & risques

```
GAPS=
 - Attribution par CAMPAGNE (utm_campaign/medium/content) : stockage absent → colonnes additives futures (draft).
 - Attribution signup/parcours = user_id (client-asserté à l'ingestion, non vérifié serveur) → fiabilité partielle documentée.
 - Podcast anon : jointure session_key seulement si l'espace de clés audio == analytics (risque de perte, documenté).
 - Pas de first-touch DURABLE cross-visite (session per-onglet) → « first-touch de la visite », pas « de l'utilisateur à vie ».
 - Moteurs de recherche repliés dans 'google' (detectSource) ; body.source override à l'ingestion (hors périmètre lecture).
RISKS=aucun bloquant ; tout additif, borné, admin-only, sans PII ni mutation.
```

## Isolation / non-mutation

```
MAIN_UNCHANGED=YES (local 2d5a255 ; origin/main 38328ce)
OTHER_WORKTREES_UNCHANGED_BY_HUB2=YES (ce chantier n'écrit que dans cier-platform-intelligence-hub)
REMOTE_SUPABASE_MUTATED=NO
PRODUCTION_MUTATED=NO
```

## Recommandations

```
NEXT_RECOMMENDED_PHASE=
 A) Fiabiliser le lien session↔user (user_id vérifié serveur à l'ingestion) pour durcir signup/parcours attribution.
 B) Sur GO : colonnes additives utm_campaign/medium/content sur analytics_sessions → attribution par CAMPAGNE (HUB-3).
 C) Sur GO : appliquer l'index de support (idx_modcompl_completed) et, plus tard, les tables du draft quand les connecteurs externes seront demandés.
 D) Rétention/purge sur analytics_sessions/events (aujourd'hui non bornée) — recommandation privacy.
 E) Câblage nav admin (avec renommage désambiguïsant vs /admin/intelligence-pastorale).
```

## STOP

HUB-2 terminé et prouvé. **Aucun** enchaînement automatique vers GA4 / Search Console /
YouTube Analytics / Meta / WhatsApp / déploiement / migration distante. Aucun push, merge,
déploiement ou mutation production/Supabase. En attente du prochain GO explicite de Doxa.
