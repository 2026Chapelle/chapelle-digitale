# 6A-2 Editorial Engine Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** build the deterministic editorial signal pipeline, recommendation engine, prioritization bands, refresh orchestrator, and memory loop on top of the 6A-1 foundation.

**Approved design anchor:** `docs/superpowers/specs/2026-08-25-intelligence-6a-editorial-design.md`

**Dependency:** do not start this plan before 6A-1 schema, contracts, repository, and access boundaries are in place.

**Repo patterns to reuse:** `src/lib/intelligence/connectors/types.ts`, `src/lib/intelligence/seo/opportunities.ts`, `src/lib/intelligence/performance/build.ts`, `src/lib/intelligence/goals/store.ts`, `src/lib/intelligence/goals/trajectory.ts`, `src/lib/intelligence/types/content.ts`.

## Task 1: Editorial signal providers and truth-state normalization

Files:
- Create: `src/lib/intelligence/editorial/signals.ts`
- Create: `src/lib/intelligence/editorial/trends.ts`
- Create: `src/lib/intelligence/editorial/__tests__/signals.test.ts`
- Test: `src/lib/intelligence/editorial/__tests__/signals.test.ts`

Interfaces:
- Consumes:
  - first-party and connected-source concepts already modeled in the repo
  - content graph types from `src/lib/intelligence/types/content.ts`
  - connector conventions from `src/lib/intelligence/connectors/types.ts`
- Produces:
  - `EditorialSignalProvider`
  - `ExternalTrendProvider` future-only contract
  - truth-state normalization without collapsing missing into zero

- [ ] Step 1: Write failing test
```ts
import { describe, expect, it } from 'vitest';
import {
  classifyEditorialSignalTruthState,
  mergeEditorialSignals,
  type EditorialSignalProvider,
} from '../signals';

describe('editorial signals', () => {
  it('keeps missing values distinct from zero and classifies partial sources correctly', () => {
    const provider: EditorialSignalProvider = {
      key: 'youtube',
      async fetch() {
        return {
          sourceKey: 'youtube',
          truthState: 'PARTIAL',
          metrics: {
            views: 0,
            watchTimeMinutes: undefined,
          },
          observedAt: '2026-08-25T08:00:00.000Z',
        };
      },
    };

    expect(classifyEditorialSignalTruthState({ available: true, complete: false })).toBe('PARTIAL');
    expect(classifyEditorialSignalTruthState({ available: false, complete: false })).toBe('UNAVAILABLE');
    expect(classifyEditorialSignalTruthState({ available: true, complete: true })).toBe('REAL');

    const merged = mergeEditorialSignals([provider], {
      organizationId: 'org_01',
      window: { start: '2026-08-25', end: '2026-08-31' },
    });

    expect(merged[0].metrics.views).toBe(0);
    expect(merged[0].metrics.watchTimeMinutes).toBeUndefined();
    expect(merged[0].truthState).toBe('PARTIAL');
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/signals.test.ts
```
Expected result: the signal module does not exist yet and the import fails.

- [ ] Step 3: Minimal implementation
  - Add `src/lib/intelligence/editorial/signals.ts` with:
    - `export type EditorialSignalTruthState = 'REAL' | 'PARTIAL' | 'UNAVAILABLE';`
    - `export interface EditorialSignalProvider { key: string; fetch(input: EditorialSignalInput): Promise<EditorialSignalRecord[]>; }`
    - `export function classifyEditorialSignalTruthState(input: { available: boolean; complete: boolean }): EditorialSignalTruthState`
    - `export function mergeEditorialSignals(providers, input): EditorialSignalRecord[]`
  - Add `src/lib/intelligence/editorial/trends.ts` with:
    - `export interface ExternalTrendProvider { key: string; fetch(input: EditorialTrendInput): Promise<EditorialTrendSignal[]>; }`
    - no active provider instance in v1
    - no live connection to Google Trends or other external trend services
  - Preserve absent values as absent; never normalize them to `0`.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/signals.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/__tests__/int5a-guards.test.ts src/lib/intelligence/goals/trajectory.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/signals.ts`
    - `src/lib/intelligence/editorial/trends.ts`
    - `src/lib/intelligence/editorial/__tests__/signals.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial signal normalization`

## Task 2: Recommendation engine, lineage, prioritization, and dedupe

Files:
- Create: `src/lib/intelligence/editorial/engine.ts`
- Create: `src/lib/intelligence/editorial/prioritization.ts`
- Create: `src/lib/intelligence/editorial/__tests__/engine.test.ts`
- Test: `src/lib/intelligence/editorial/__tests__/engine.test.ts`

Interfaces:
- Consumes:
  - editorial recommendation contracts from 6A-1
  - editorial signals from Task 1
  - content history and reuse patterns from existing intelligence modules
- Produces:
  - one recommendation per schedulable unit
  - `batchId` grouping for a family of derivations
  - `parentRecommendationId` lineage for derived recommendations
  - deterministic priority bands only

- [ ] Step 1: Write failing test
```ts
import { describe, expect, it } from 'vitest';
import { buildEditorialRecommendationsForWindow } from '../engine';

describe('editorial engine', () => {
  it('emits one schedulable line per editorial action and preserves derivation lineage', () => {
    const result = buildEditorialRecommendationsForWindow({
      organizationId: 'org_01',
      window: { start: '2026-08-25', end: '2026-08-31' },
      capacity: {
        weeklyTotal: 8,
        byFamily: { CREATE: 2, REPURPOSE: 3, PROMOTE: 3 },
        byChannel: { ARTICLE: 1, PODCAST: 1, YOUTUBE: 2, FACEBOOK: 2, INSTAGRAM: 1, WHATSAPP: 2 },
      },
      contentGraph: [
        { id: 'live_42', kind: 'LIVE', title: 'Teaching from Sunday', publishedAt: '2026-08-24T09:00:00.000Z' },
      ],
      signals: [],
    });

    expect(result.recommendations.map((item) => `${item.recommendationKind}:${item.targetChannel}`)).toEqual([
      'REPURPOSE:ARTICLE',
      'REPURPOSE:PODCAST',
      'REPURPOSE:YOUTUBE',
      'PROMOTE:WHATSAPP',
      'PROMOTE:FACEBOOK',
    ]);
    expect(new Set(result.recommendations.map((item) => item.batchId)).size).toBe(1);
    expect(result.recommendations.filter((item) => item.parentRecommendationId === 'live_42')).toHaveLength(5);
    expect(result.recommendations.every((item) => ['FORTE', 'NORMALE', 'A_SURVEILLER'].includes(item.priorityBand))).toBe(true);
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/engine.test.ts
```
Expected result: the engine module does not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `buildEditorialRecommendationsForWindow(input)` with:
    - CREATE / REPURPOSE / PROMOTE detection
    - reuse-first derivation
    - one output line per recommendation
    - `batchId` shared across a family
    - `parentRecommendationId` set for derived units
    - deterministic priority band assignment
    - dedupe suppression when the same unit was already proposed for the same window/signature
  - Add `rankEditorialRecommendation(proposal, context)` in `prioritization.ts` with only the user-facing bands `FORTE`, `NORMALE`, `A_SURVEILLER`.
  - Keep the engine opaque-free: no ML, no hidden score surfaced as truth.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/engine.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/__tests__/int5a-guards.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/engine.ts`
    - `src/lib/intelligence/editorial/prioritization.ts`
    - `src/lib/intelligence/editorial/__tests__/engine.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial recommendation engine`

## Task 3: Refresh orchestration and machine-only scheduled refresh

Files:
- Create: `src/lib/intelligence/editorial/refresh.ts`
- Create: `src/app/api/admin/intelligence/editorial/refresh/route.ts`
- Create: `src/app/api/internal/editorial/refresh/route.ts`
- Create: `src/lib/intelligence/editorial/__tests__/refresh.test.ts`
- Test: `src/lib/intelligence/editorial/__tests__/refresh.test.ts`

Interfaces:
- Consumes:
  - the editorial repository from 6A-1
  - the recommendation engine from Task 2
  - the organization-scoped access helper from 6A-1
- Produces:
  - one orchestrator function callable outside HTTP
  - a manual refresh adapter
  - a machine-only scheduled refresh adapter

- [ ] Step 1: Write failing test
```ts
import { describe, expect, it } from 'vitest';
import { refreshEditorialIntelligence } from '../refresh';

describe('editorial refresh orchestration', () => {
  it('accepts manual refresh only for authenticated org-scoped editorial managers', async () => {
    await expect(
      refreshEditorialIntelligence({
        mode: 'manual',
        organizationId: 'org_01',
        actor: { id: 'user_01', permissions: ['can_manage_editorial_intelligence'] },
        machineAuth: null,
      }),
    ).resolves.toMatchObject({ mode: 'manual' });
  });

  it('rejects scheduled refresh unless the machine bearer is valid', async () => {
    await expect(
      refreshEditorialIntelligence({
        mode: 'scheduled',
        organizationId: 'org_01',
        actor: null,
        machineAuth: { kind: 'missing' },
      }),
    ).rejects.toThrow('machine-auth-required');
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/refresh.test.ts
```
Expected result: the orchestrator is missing and the machine-auth contract is not implemented yet.

- [ ] Step 3: Minimal implementation
  - Add `refreshEditorialIntelligence(input)` as the single domain orchestrator:
    - no HTTP code inside the core function
    - manual mode requires authenticated user + organization scope + `can_manage_editorial_intelligence`
    - scheduled mode requires server-only machine authentication
    - no human cookie/session from cron
    - no public unauthenticated endpoint
    - no `NEXT_PUBLIC` secret
  - Add adapter routes:
    - `POST /api/admin/intelligence/editorial/refresh` for manual refresh
    - `POST /api/internal/editorial/refresh` for the server-only scheduler
  - Route handlers must be thin wrappers around the orchestrator.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/refresh.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/app/api/admin/intelligence/goals/__tests__/route.test.ts src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/refresh.ts`
    - `src/app/api/admin/intelligence/editorial/refresh/route.ts`
    - `src/app/api/internal/editorial/refresh/route.ts`
    - `src/lib/intelligence/editorial/__tests__/refresh.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial refresh orchestration`

## Task 4: Capacity planning, weekly preparation, and performance memory

Files:
- Create: `src/lib/intelligence/editorial/capacity.ts`
- Create: `src/lib/intelligence/editorial/prepare-week.ts`
- Create: `src/lib/intelligence/editorial/memory.ts`
- Create: `src/lib/intelligence/editorial/__tests__/capacity.test.ts`
- Test: `src/lib/intelligence/editorial/__tests__/capacity.test.ts`

Interfaces:
- Consumes:
  - calendar read model from 6A-1
  - recommendations from Task 2
  - refresh output from Task 3
- Produces:
  - explicit editorial capacity envelope
  - 7-day week plan proposal
  - append-only performance memory after completion

- [ ] Step 1: Write failing test
```ts
import { describe, expect, it } from 'vitest';
import { computeEditorialCapacityEnvelope, prepareEditorialWeekPlan } from '../prepare-week';
import { recordEditorialPerformanceObservation } from '../memory';

describe('capacity and memory', () => {
  it('caps weekly plans to the declared editorial envelope', () => {
    const plan = prepareEditorialWeekPlan({
      organizationId: 'org_01',
      calendarWindow: { start: '2026-08-25', end: '2026-09-01' },
      capacity: {
        live: 1,
        podcast: 1,
        article: 1,
        shortVideo: 2,
        social: 3,
        whatsapp: 2,
      },
      candidates: [
        { recommendationId: 'rec_01', contentKind: 'LIVE', channel: 'YOUTUBE' },
        { recommendationId: 'rec_02', contentKind: 'PODCAST', channel: 'PODCAST' },
        { recommendationId: 'rec_03', contentKind: 'ARTICLE', channel: 'WEB' },
      ],
    });

    expect(plan.days).toHaveLength(7);
    expect(plan.autoAccepted).toBe(false);
    expect(plan.autoPublished).toBe(false);
    expect(computeEditorialCapacityEnvelope({ live: 1, podcast: 1, article: 1, shortVideo: 2, social: 3, whatsapp: 2 }).weeklyTotal).toBe(10);
  });

  it('records performance memory only after completion and preserves human edits', async () => {
    await expect(
      recordEditorialPerformanceObservation({
        organizationId: 'org_01',
        recommendationId: 'rec_01',
        status: 'COMPLETED',
        metrics: { views: 120, listens: 40 },
        humanEdited: true,
      }),
    ).resolves.toMatchObject({ appended: true });
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/capacity.test.ts
```
Expected result: the capacity, week-preparation, and memory modules do not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `computeEditorialCapacityEnvelope(input)` with explicit weekly total and family/channel ceilings.
  - Add `prepareEditorialWeekPlan(input)` with:
    - 7-day window
    - capacity-aware selection
    - calendar-aware exclusions
    - batch generation
    - no auto-accept
    - no auto-publication
  - Add `recordEditorialPerformanceObservation(input)` as an append-only event writer that only records after `COMPLETED`.
  - Do not introduce ML or hidden forecast logic.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/capacity.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/__tests__/int5a-guards.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/capacity.ts`
    - `src/lib/intelligence/editorial/prepare-week.ts`
    - `src/lib/intelligence/editorial/memory.ts`
    - `src/lib/intelligence/editorial/__tests__/capacity.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial capacity and memory`

## Final Gates

- engine targeted tests
- truth semantics
- idempotency
- dedupe
- auth adapters
- TSC
- Intelligence regressions
- `git diff --check`
- no human cookie in scheduler
- no public unauthenticated scheduler endpoint
- no auto-publication
- no production mutation

## Self Review

- SPEC_COVERAGE_6A2=100%
- FILE_PATHS_VERIFIED=PASS
- TYPE_CONSISTENCY=PASS
- NO_PLACEHOLDERS=YES
- ONE_RECOMMENDATION_ONE_UNIT=PASS
- MULTI_CHANNEL_DERIVATION=PASS
- PARENT_LINEAGE_COVERED=PASS
- HUMAN_DECISIONS_PROTECTED=PASS
- DELEGATED_EDITOR_ACCESS=PASS
- MACHINE_REFRESH_AUTH=PASS
- NO_HUMAN_COOKIE_CRON=PASS
- MISSING_NOT_ZERO=PASS
- EXTERNAL_TRENDS_FUTURE_ONLY=PASS
- AUTO_PUBLICATION=NONE
- git diff --check = PASS
