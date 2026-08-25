# 6A-1 Foundation Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** build the canonical editorial data model, organization-scoped access layer, and read/write API surface for 6A without generating recommendations yet.

**Approved design anchor:** `docs/superpowers/specs/2026-08-25-intelligence-6a-editorial-design.md`

**Scope lock:** no recommendation engine, no refresh orchestration, no calendar write model, no auto-publication.

**Repo patterns to reuse:** `src/lib/erp/admin-unit-guard.ts`, `src/lib/erp/unit-access.ts`, `src/lib/permissions.ts`, `src/app/api/admin/intelligence/goals/route.ts`, `src/lib/intelligence/goals/store.ts`, `src/lib/intelligence/goals/trajectory.ts`, `src/lib/intelligence/performance/build.ts`, `src/lib/intelligence/seo/opportunities.ts`, `src/lib/intelligence/connectors/types.ts`, `src/lib/intelligence/types/content.ts`, `src/components/admin/intelligence/decision/DecisionTab.tsx`, `src/components/admin/intelligence/GuideDrawer.tsx`, `supabase/snippets/podcast_audio_analytics_rls_test.sql`.

## Task 1: Editorial domain contracts and lifecycle invariants

Files:
- Create: `src/lib/intelligence/editorial/contracts.ts`
- Create: `src/lib/intelligence/editorial/__tests__/contracts.test.ts`
- Test: `src/lib/intelligence/editorial/__tests__/contracts.test.ts`

Interfaces:
- Consumes:
  - approved spec truth semantics
  - existing content/channel/type patterns in `src/lib/intelligence/types/content.ts`
  - existing deterministic domain helpers in `src/lib/intelligence/goals/trajectory.ts`
- Produces:
  - canonical editorial enums and types
  - schedulable recommendation identity helpers
  - transition guards for the allowed lifecycle

- [ ] Step 1: Write failing test
```ts
import { describe, expect, it } from 'vitest';
import {
  buildEditorialRecommendationDedupeKey,
  canTransitionEditorialRecommendation,
  EDITORIAL_PRIORITY_BANDS,
  EDITORIAL_RECOMMENDATION_KINDS,
  EDITORIAL_RECOMMENDATION_STATUSES,
} from '../contracts';

describe('editorial contracts', () => {
  it('treats one recommendation as one schedulable editorial unit', () => {
    expect(EDITORIAL_RECOMMENDATION_KINDS).toEqual(['CREATE', 'REPURPOSE', 'PROMOTE']);
    expect(EDITORIAL_RECOMMENDATION_STATUSES).toEqual([
      'PROPOSED',
      'ACCEPTED',
      'SCHEDULED',
      'COMPLETED',
      'REJECTED',
      'ARCHIVED',
    ]);
    expect(EDITORIAL_PRIORITY_BANDS).toEqual(['FORTE', 'NORMALE', 'A_SURVEILLER']);

    const dedupeKey = buildEditorialRecommendationDedupeKey({
      organizationId: 'org_01',
      recommendationKind: 'REPURPOSE',
      contentKind: 'ARTICLE',
      targetChannel: 'WHATSAPP',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      scheduledFor: '2026-08-28',
      sourceContentId: 'live_42',
      batchId: 'batch_01',
      parentRecommendationId: 'rec_parent',
    });

    expect(dedupeKey).toBe('org_01|REPURPOSE|ARTICLE|WHATSAPP|2026-08-25|2026-08-31|2026-08-28|live_42');
    expect(canTransitionEditorialRecommendation('PROPOSED', 'ACCEPTED')).toBe(true);
    expect(canTransitionEditorialRecommendation('ACCEPTED', 'PROPOSED')).toBe(false);
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/contracts.test.ts
```
Expected result: the file fails to resolve because the editorial contracts module does not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `src/lib/intelligence/editorial/contracts.ts` with:
    - `export const EDITORIAL_RECOMMENDATION_KINDS = ['CREATE', 'REPURPOSE', 'PROMOTE'] as const;`
    - `export const EDITORIAL_RECOMMENDATION_STATUSES = ['PROPOSED', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'ARCHIVED'] as const;`
    - `export const EDITORIAL_PRIORITY_BANDS = ['FORTE', 'NORMALE', 'A_SURVEILLER'] as const;`
    - `export type EditorialRecommendationKind = (typeof EDITORIAL_RECOMMENDATION_KINDS)[number];`
    - `export type EditorialRecommendationStatus = (typeof EDITORIAL_RECOMMENDATION_STATUSES)[number];`
    - `export type EditorialPriorityBand = (typeof EDITORIAL_PRIORITY_BANDS)[number];`
    - `export interface EditorialRecommendationIdentityInput { organizationId: string; recommendationKind: EditorialRecommendationKind; contentKind: string; targetChannel: string; windowStart: string; windowEnd: string; scheduledFor: string; sourceContentId: string; batchId: string; parentRecommendationId?: string | null; }`
    - `export function buildEditorialRecommendationDedupeKey(input: EditorialRecommendationIdentityInput): string`
    - `export function canTransitionEditorialRecommendation(from: EditorialRecommendationStatus, to: EditorialRecommendationStatus): boolean`
  - Keep the function pure and deterministic.
  - Do not add persistence or HTTP code in this task.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/contracts.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/app/api/admin/intelligence/goals/__tests__/route.test.ts src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/__tests__/int5a-guards.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/contracts.ts`
    - `src/lib/intelligence/editorial/__tests__/contracts.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial domain contracts`

## Task 2: Editorial persistence, RLS, and schema validation

Files:
- Create: `supabase/migrations/20260825_editorial_intelligence.sql`
- Create: `supabase/snippets/20260825_editorial_intelligence_schema_test.sql`
- Create: `src/lib/intelligence/editorial/store.ts`
- Create: `src/lib/intelligence/editorial/__tests__/store.test.ts`
- Test: `supabase/snippets/20260825_editorial_intelligence_schema_test.sql`

Interfaces:
- Consumes:
  - editorial domain types from Task 1
  - existing append-only and read-model patterns in `src/lib/intelligence/goals/store.ts`
  - existing SQL test style in `supabase/snippets/podcast_audio_analytics_rls_test.sql`
- Produces:
  - `editorial_recommendations`
  - `editorial_recommendation_events`
  - `editorial_settings`
  - repository helpers for list/read/create/patch/event append/settings

- [ ] Step 1: Write failing test
```sql
begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'editorial_recommendations'
  ) then
    raise exception 'FAIL: editorial_recommendations table missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'editorial_recommendations'
      and column_name = 'parent_recommendation_id'
  ) then
    raise exception 'FAIL: parent_recommendation_id column missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'editorial_recommendations'
      and c.contype = 'f'
      and c.conname = 'editorial_recommendations_parent_recommendation_id_fkey'
  ) then
    raise exception 'FAIL: self-FK on parent_recommendation_id missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'editorial_recommendations'
      and c.contype = 'u'
      and c.conname = 'editorial_recommendations_organization_id_dedupe_key_key'
  ) then
    raise exception 'FAIL: composite dedupe unique constraint missing';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'editorial_calendar_items'
  ) then
    raise exception 'FAIL: editorial_calendar_items must not exist in 6A v1';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'editorial_recommendations'
      and c.relrowsecurity
  ) then
    raise exception 'FAIL: RLS must be enabled on editorial_recommendations';
  end if;
end $$;

rollback;
```

- [ ] Step 2: Run failing test
```bash
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/snippets/20260825_editorial_intelligence_schema_test.sql
```
Expected result: the SQL file fails because the schema has not been added yet.

- [ ] Step 3: Minimal implementation
  - Add `supabase/migrations/20260825_editorial_intelligence.sql` with:
    - `editorial_recommendations` table keyed by UUID
    - `organization_id` FK, `batch_id`, `parent_recommendation_id`, `dedupe_key`, `content_kind`, `target_channel`, `window_start`, `window_end`, `scheduled_for`, `status`, `recommendation_kind`, `priority_band`, `signals_jsonb`, `provenance_jsonb`, `human_notes`, `human_decision_at`, `created_by`, `updated_by`, timestamps
    - `editorial_recommendation_events` append-only table with FK to recommendation, event type, actor metadata, snapshot JSONB, timestamps
    - `editorial_settings` table with one row per organization, FK to organization, capacity defaults, refresh defaults, timestamps
    - self-FK `parent_recommendation_id` on `editorial_recommendations`
    - unique constraint on `organization_id + dedupe_key`
    - indexes for `organization_id/status/scheduled_for`, `organization_id/window_start/window_end`, `organization_id/batch_id`, `organization_id/updated_at`
    - RLS enabled, deny by default, only explicit org-scoped SELECT/INSERT/UPDATE policies
    - no DELETE policy and no physical delete path
  - Add `src/lib/intelligence/editorial/store.ts` with pure repository functions:
    - `listEditorialRecommendations(organizationId, filters)`
    - `getEditorialRecommendation(organizationId, recommendationId)`
    - `createEditorialRecommendation(input)`
    - `patchEditorialRecommendation(input)`
    - `appendEditorialRecommendationEvent(input)`
    - `getEditorialSettings(organizationId)`
    - `upsertEditorialSettings(input)`
  - Keep the calendar as a read model projection only.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/store.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/app/api/admin/intelligence/goals/__tests__/route.test.ts src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `supabase/migrations/20260825_editorial_intelligence.sql`
    - `supabase/snippets/20260825_editorial_intelligence_schema_test.sql`
    - `src/lib/intelligence/editorial/store.ts`
    - `src/lib/intelligence/editorial/__tests__/store.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial persistence schema`

## Task 3: Delegated editorial access and API boundaries

Files:
- Create: `src/lib/intelligence/editorial/permissions.ts`
- Create: `src/app/api/admin/intelligence/editorial/route.ts`
- Create: `src/app/api/admin/intelligence/editorial/[recommendationId]/route.ts`
- Create: `src/app/api/admin/intelligence/editorial/settings/route.ts`
- Create: `src/app/api/admin/intelligence/editorial/__tests__/route.test.ts`
- Test: `src/app/api/admin/intelligence/editorial/__tests__/route.test.ts`

Interfaces:
- Consumes:
  - `requireGuardedAdminUnit` and `resolveActorUnitContext` patterns from `src/lib/erp/admin-unit-guard.ts` and `src/lib/erp/unit-access.ts`
  - permission helpers from `src/lib/permissions.ts`
  - repository functions from Task 2
- Produces:
  - org-scoped editorial access checks
  - redacted public DTOs
  - GET/PATCH handlers for recommendations and settings

- [ ] Step 1: Write failing test
```ts
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from '../route';

const access = {
  actor: {
    id: 'user_01',
    organizationId: 'org_01',
    permissions: ['can_manage_editorial_intelligence'],
    roles: ['editorial_manager'],
  },
  organizationId: 'org_01',
  userId: 'user_01',
};

const requireGuardedAdminUnit = vi.fn();

vi.mock('@/lib/erp/admin-unit-guard', () => ({
  requireGuardedAdminUnit,
}));

vi.mock('@/lib/intelligence/editorial/store', () => ({
  listEditorialRecommendations: vi.fn().mockResolvedValue([]),
  patchEditorialRecommendation: vi.fn().mockResolvedValue({ id: 'rec_01' }),
}));

describe('editorial admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireGuardedAdminUnit.mockResolvedValue(access as never);
  });

  it('allows delegated editorial access without world_admin privileges', async () => {
    const req = new NextRequest('http://localhost/api/admin/intelligence/editorial');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty('recommendations');
  });

  it('rejects patch for a pastor without editorial permission', async () => {
    const req = new NextRequest('http://localhost/api/admin/intelligence/editorial/rec_01', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    const res = await PATCH(req, { params: { recommendationId: 'rec_01' } });
    expect(res.status).toBe(403);
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/app/api/admin/intelligence/editorial/__tests__/route.test.ts
```
Expected result: the route file and permission helpers do not exist yet, so the test fails to resolve or import them.

- [ ] Step 3: Minimal implementation
  - Add `src/lib/intelligence/editorial/permissions.ts` with:
    - `canReadEditorialIntelligence(actor): boolean`
    - `canWriteEditorialIntelligence(actor): boolean`
    - `assertEditorialWorkspaceAccess(req, mode): Promise<{ actor; organizationId; userId } | NextResponse>`
  - Keep the following policy in code:
    - `world_super_admin`: read + write
    - `world_admin`: read + write
    - existing Intelligence Hub reader: read only
    - `can_manage_editorial_intelligence`: read + write 6A only, without broader world-admin privilege
    - pastor without the permission: no write
    - always organization-scoped
  - Add route handlers:
    - `GET /api/admin/intelligence/editorial`
    - `PATCH /api/admin/intelligence/editorial/[recommendationId]`
    - `GET/PATCH /api/admin/intelligence/editorial/settings`
  - Redact any actor identifiers or private fields from DTOs before returning them.
  - Do not widen the guard beyond the approved editorial scope.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/app/api/admin/intelligence/editorial/__tests__/route.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/app/api/admin/intelligence/goals/__tests__/route.test.ts src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/permissions.ts`
    - `src/app/api/admin/intelligence/editorial/route.ts`
    - `src/app/api/admin/intelligence/editorial/[recommendationId]/route.ts`
    - `src/app/api/admin/intelligence/editorial/settings/route.ts`
    - `src/app/api/admin/intelligence/editorial/__tests__/route.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial access and api boundaries`

## Task 4: Calendar read model and settings projection

Files:
- Create: `src/lib/intelligence/editorial/calendar-read-model.ts`
- Create: `src/lib/intelligence/editorial/settings-projection.ts`
- Create: `src/lib/intelligence/editorial/__tests__/calendar-read-model.test.ts`
- Test: `src/lib/intelligence/editorial/__tests__/calendar-read-model.test.ts`

Interfaces:
- Consumes:
  - repository output from Task 2
  - status lifecycle from Task 1
  - read-model conventions from `src/lib/intelligence/performance/build.ts`
- Produces:
  - calendar read model from recommendations only
  - settings projection for UI defaults and capacity

- [ ] Step 1: Write failing test
```ts
import { describe, expect, it } from 'vitest';
import { buildEditorialCalendarReadModel } from '../calendar-read-model';

describe('calendar read model', () => {
  it('projects only accepted, scheduled, and completed recommendations into the calendar', () => {
    const calendar = buildEditorialCalendarReadModel([
      {
        id: 'rec_01',
        status: 'PROPOSED',
        contentKind: 'ARTICLE',
        targetChannel: 'FACEBOOK',
        scheduledFor: '2026-08-28',
      },
      {
        id: 'rec_02',
        status: 'ACCEPTED',
        contentKind: 'PODCAST',
        targetChannel: 'WHATSAPP',
        scheduledFor: '2026-08-29',
      },
      {
        id: 'rec_03',
        status: 'SCHEDULED',
        contentKind: 'LIVE',
        targetChannel: 'YOUTUBE',
        scheduledFor: '2026-08-30',
      },
    ]);

    expect(calendar.items).toHaveLength(2);
    expect(calendar.items.map((item) => item.recommendationId)).toEqual(['rec_02', 'rec_03']);
    expect(calendar.items.every((item) => item.status !== 'PROPOSED')).toBe(true);
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/calendar-read-model.test.ts
```

- [ ] Step 3: Minimal implementation
  - Add `buildEditorialCalendarReadModel(recommendations, window)` as a pure projector that:
    - emits only `ACCEPTED`, `SCHEDULED`, and `COMPLETED`
    - keeps 30-day read-window semantics
    - never writes a separate calendar table
  - Add `getEditorialSettingsProjection(organizationId)` if the UI needs capacity defaults in the read payload.
  - Keep the projection deterministic and organization-scoped.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/lib/intelligence/editorial/__tests__/calendar-read-model.test.ts
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/app/api/admin/intelligence/goals/__tests__/route.test.ts src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/lib/intelligence/editorial/calendar-read-model.ts`
    - `src/lib/intelligence/editorial/settings-projection.ts`
    - `src/lib/intelligence/editorial/__tests__/calendar-read-model.test.ts`
  - Message exact:
    - `feat(intelligence): add editorial calendar read model`

## Final Gates

- targeted tests
- permission tests
- SQL/migration static/local validation
- TSC
- relevant regressions
- `git diff --check`
- no remote DB mutation
- no auto-publication
- no production mutation

## Self Review

- SPEC_COVERAGE_6A1=100%
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
