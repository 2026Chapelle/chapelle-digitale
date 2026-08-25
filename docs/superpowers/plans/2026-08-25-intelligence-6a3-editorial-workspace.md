# 6A-3 Editorial Workspace Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** deliver the single editorial workspace surface at `/admin/intelligence/editorial` with exactly three views, simple actions, and evidence-first recommendation details.

**Approved design anchor:** `docs/superpowers/specs/2026-08-25-intelligence-6a-editorial-design.md`

**Dependency:** do not start this plan before 6A-1 access/data surfaces and 6A-2 engine/refresh behavior are available.

**Repo patterns to reuse:** `src/app/(admin)/admin/intelligence/page.tsx`, `src/components/admin/intelligence/decision/DecisionTab.tsx`, `src/components/admin/intelligence/GuideDrawer.tsx`, `src/components/admin/intelligence/FreshnessLegend.tsx`, `src/components/admin/intelligence/SourcesStatus.tsx`, `src/components/admin/intelligence/InfoTip.tsx`, `src/components/admin/intelligence/WhatsAppTab.tsx`, `src/components/admin/intelligence/YouTubeTab.tsx`.

## Task 1: Workspace shell and nav integration

Files:
- Create: `src/app/(admin)/admin/intelligence/editorial/page.tsx`
- Modify: `src/app/(admin)/admin/intelligence/page.tsx`
- Create: `src/components/admin/intelligence/editorial/EditorialWorkspaceShell.tsx`
- Create: `src/components/admin/intelligence/editorial/__tests__/workspace-shell.test.tsx`
- Test: `src/components/admin/intelligence/editorial/__tests__/workspace-shell.test.tsx`

Interfaces:
- Consumes:
  - API payloads from `src/app/api/admin/intelligence/editorial/route.ts`
  - organization-scoped access checks from 6A-1
  - engine output from 6A-2
- Produces:
  - one workspace entry point
  - one nav entry from the intelligence cockpit
  - exactly three workspace views

- [ ] Step 1: Write failing test
```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorialWorkspaceShell } from '../EditorialWorkspaceShell';

describe('editorial workspace shell', () => {
  it('renders only the three canonical views and the two primary action buttons', () => {
    const html = renderToStaticMarkup(
      <EditorialWorkspaceShell
        organizationId="org_01"
        activeView="today"
        summary={{
          priorities: [],
          weeklyRecommendations: [],
          watchlist: [],
        }}
      />,
    );

    expect(html).toContain('Aujourd’hui');
    expect(html).toContain('Calendrier');
    expect(html).toContain('Opportunités');
    expect(html).toContain('Actualiser maintenant');
    expect(html).toContain('Préparer ma semaine');
    expect(html).not.toContain('Dashboard');
    expect(html).not.toContain('Settings');
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/workspace-shell.test.tsx
```
Expected result: the editorial workspace shell does not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `src/app/(admin)/admin/intelligence/editorial/page.tsx` as the dedicated route for the editorial cockpit.
  - Add `src/components/admin/intelligence/editorial/EditorialWorkspaceShell.tsx` with:
    - `activeView: 'today' | 'calendar' | 'opportunities'`
    - `organizationId`
    - summary payload from the API
    - only three tabs or segmented views
  - Modify `src/app/(admin)/admin/intelligence/page.tsx` to expose the editorial workspace as a first-class entry point without adding a second dashboard.
  - Reuse the existing cinematic/royal/premium layout language already used in intelligence screens.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/workspace-shell.test.tsx
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/app/api/admin/intelligence/goals/__tests__/route.test.ts src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/__tests__/int5a-guards.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/app/(admin)/admin/intelligence/editorial/page.tsx`
    - `src/app/(admin)/admin/intelligence/page.tsx`
    - `src/components/admin/intelligence/editorial/EditorialWorkspaceShell.tsx`
    - `src/components/admin/intelligence/editorial/__tests__/workspace-shell.test.tsx`
  - Message exact:
    - `feat(intelligence): add editorial workspace shell`

## Task 2: Today view, priority list, and evidence drawer

Files:
- Create: `src/components/admin/intelligence/editorial/TodayView.tsx`
- Create: `src/components/admin/intelligence/editorial/WhyDrawer.tsx`
- Create: `src/components/admin/intelligence/editorial/RecommendationActionBar.tsx`
- Create: `src/components/admin/intelligence/editorial/__tests__/today-view.test.tsx`
- Test: `src/components/admin/intelligence/editorial/__tests__/today-view.test.tsx`

Interfaces:
- Consumes:
  - recommendation DTOs from 6A-1
  - evidence/signals from 6A-2
- Produces:
  - 3 to 5 priority rows maximum
  - human actions: Accept, Modify, Plan, Reject
  - a "Pourquoi ?" evidence drawer

- [ ] Step 1: Write failing test
```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayView } from '../TodayView';

describe('today view', () => {
  it('renders at most five priorities and exposes the evidence drawer trigger', () => {
    const html = renderToStaticMarkup(
      <TodayView
        priorities={[
          { id: '1', title: 'Article du jour', band: 'FORTE' },
          { id: '2', title: 'Podcast à republier', band: 'FORTE' },
          { id: '3', title: 'Short YouTube', band: 'NORMALE' },
          { id: '4', title: 'WhatsApp rappel', band: 'NORMALE' },
          { id: '5', title: 'Facebook promotion', band: 'A_SURVEILLER' },
          { id: '6', title: 'Over-capacity item', band: 'A_SURVEILLER' },
        ]}
        watchlist={[]}
        onPrepareWeek={() => undefined}
      />,
    );

    expect(html.match(/priority-row/g)?.length).toBe(5);
    expect(html).toContain('Pourquoi ?');
    expect(html).toContain('Accepter');
    expect(html).toContain('Modifier');
    expect(html).toContain('Planifier');
    expect(html).toContain('Rejeter');
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/today-view.test.tsx
```
Expected result: the Today view component does not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `TodayView` as a presentational component that:
    - shows no more than five priority rows
    - shows weekly recommendations and a small watchlist
    - renders `Pourquoi ?`, `Accepter`, `Modifier`, `Planifier`, and `Rejeter`
  - Add `WhyDrawer` that renders:
    - source
    - availability
    - timestamp
    - readable justification
    - `REAL`, `PARTIAL`, `UNAVAILABLE`, and `EDITORIAL_RECOMMENDATION` as distinct labels
  - Keep the action bar thin; no automatic publishing logic in the UI.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/today-view.test.tsx
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/goals/trajectory.test.ts src/app/api/admin/intelligence/goals/__tests__/route.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/components/admin/intelligence/editorial/TodayView.tsx`
    - `src/components/admin/intelligence/editorial/WhyDrawer.tsx`
    - `src/components/admin/intelligence/editorial/RecommendationActionBar.tsx`
    - `src/components/admin/intelligence/editorial/__tests__/today-view.test.tsx`
  - Message exact:
    - `feat(intelligence): add editorial today view`

## Task 3: Calendar view and simple replan/edit workflow

Files:
- Create: `src/components/admin/intelligence/editorial/CalendarView.tsx`
- Create: `src/components/admin/intelligence/editorial/CalendarItemCard.tsx`
- Create: `src/components/admin/intelligence/editorial/CalendarEditSheet.tsx`
- Create: `src/components/admin/intelligence/editorial/__tests__/calendar-view.test.tsx`
- Test: `src/components/admin/intelligence/editorial/__tests__/calendar-view.test.tsx`

Interfaces:
- Consumes:
  - calendar read model from 6A-1
  - accepted/scheduled/completed recommendation rows
- Produces:
  - 30-day rolling calendar
  - simple date/channel/title/status/notes editing
  - no publication path

- [ ] Step 1: Write failing test
```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalendarView } from '../CalendarView';

describe('calendar view', () => {
  it('renders only accepted scheduled and completed items inside the 30-day window', () => {
    const html = renderToStaticMarkup(
      <CalendarView
        window={{ start: '2026-08-25', end: '2026-09-24' }}
        items={[
          { id: 'rec_01', title: 'Article', status: 'ACCEPTED', channel: 'WEB', date: '2026-08-28' },
          { id: 'rec_02', title: 'Podcast', status: 'SCHEDULED', channel: 'PODCAST', date: '2026-08-29' },
          { id: 'rec_03', title: 'Live', status: 'COMPLETED', channel: 'YOUTUBE', date: '2026-08-30' },
          { id: 'rec_04', title: 'Draft only', status: 'PROPOSED', channel: 'WHATSAPP', date: '2026-08-31' },
        ]}
      />,
    );

    expect(html).toContain('ACCEPTED');
    expect(html).toContain('SCHEDULED');
    expect(html).toContain('COMPLETED');
    expect(html).not.toContain('PROPOSED');
    expect(html).toContain('date');
    expect(html).toContain('channel');
    expect(html).toContain('notes');
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/calendar-view.test.tsx
```
Expected result: the calendar view component does not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `CalendarView` as a 30-day window projection over recommendations.
  - Add `CalendarItemCard` with simple fields only: date, title, channel, status, notes.
  - Add `CalendarEditSheet` for date/channel/notes edits only.
  - Keep replan interactions simple and consistent with existing admin component patterns.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/calendar-view.test.tsx
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/lib/intelligence/goals/trajectory.test.ts src/lib/intelligence/__tests__/format.test.ts src/app/api/admin/intelligence/goals/__tests__/route.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/components/admin/intelligence/editorial/CalendarView.tsx`
    - `src/components/admin/intelligence/editorial/CalendarItemCard.tsx`
    - `src/components/admin/intelligence/editorial/CalendarEditSheet.tsx`
    - `src/components/admin/intelligence/editorial/__tests__/calendar-view.test.tsx`
  - Message exact:
    - `feat(intelligence): add editorial calendar view`

## Task 4: Opportunities view, error states, and responsive checks

Files:
- Create: `src/components/admin/intelligence/editorial/OpportunitiesView.tsx`
- Create: `src/components/admin/intelligence/editorial/OpportunityFilterBar.tsx`
- Create: `src/components/admin/intelligence/editorial/EditorialErrorState.tsx`
- Create: `src/components/admin/intelligence/editorial/__tests__/opportunities-view.test.tsx`
- Test: `src/components/admin/intelligence/editorial/__tests__/opportunities-view.test.tsx`

Interfaces:
- Consumes:
  - engine opportunities from 6A-2
  - connector availability truth states
  - editorial capacity output
- Produces:
  - CREATE / REPURPOSE / PROMOTE / SEO / underused / watchlist / future-ready filters
  - graceful error states for partial or unavailable connectors
  - a responsive secondary library view

- [ ] Step 1: Write failing test
```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OpportunitiesView } from '../OpportunitiesView';

describe('opportunities view', () => {
  it('renders filters and non-blocking error states without breaking the page', () => {
    const html = renderToStaticMarkup(
      <OpportunitiesView
        filters={['CREATE', 'REPURPOSE', 'PROMOTE', 'SEO', 'sous-exploité', 'à surveiller']}
        opportunities={[
          { id: 'opp_01', title: 'Article à réutiliser', family: 'REPURPOSE', status: 'FORTE' },
        ]}
        connectorStates={[
          { key: 'youtube', truthState: 'PARTIAL' },
          { key: 'meta', truthState: 'UNAVAILABLE' },
        ]}
      />,
    );

    expect(html).toContain('CREATE');
    expect(html).toContain('REPURPOSE');
    expect(html).toContain('PROMOTE');
    expect(html).toContain('SEO');
    expect(html).toContain('PARTIAL');
    expect(html).toContain('UNAVAILABLE');
    expect(html).toContain('à surveiller');
  });
});
```

- [ ] Step 2: Run failing test
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/opportunities-view.test.tsx
```
Expected result: the opportunities view and error-state components do not exist yet.

- [ ] Step 3: Minimal implementation
  - Add `OpportunitiesView` with the approved filter set and opportunity cards.
  - Add `EditorialErrorState` that handles:
    - connector unavailable
    - partial source
    - empty history
    - refresh failure
    - permission denied
    - no capacity
    - no recommendation
  - Keep each connector failure local to the widget; one failing source must not break the page.

- [ ] Step 4: Run targeted tests
```bash
npm run test -- src/components/admin/intelligence/editorial/__tests__/opportunities-view.test.tsx
```

- [ ] Step 5: Run neighboring regression tests
```bash
npm run test -- src/lib/intelligence/__tests__/format.test.ts src/lib/intelligence/goals/trajectory.test.ts src/app/api/admin/intelligence/goals/__tests__/route.test.ts
```

- [ ] Step 6: git diff --check

- [ ] Step 7: commit
  - Files exacts:
    - `src/components/admin/intelligence/editorial/OpportunitiesView.tsx`
    - `src/components/admin/intelligence/editorial/OpportunityFilterBar.tsx`
    - `src/components/admin/intelligence/editorial/EditorialErrorState.tsx`
    - `src/components/admin/intelligence/editorial/__tests__/opportunities-view.test.tsx`
  - Message exact:
    - `feat(intelligence): add editorial opportunities view`

## Final Gates

- workspace targeted tests
- responsive manual visual checklist
- TSC
- Intelligence regressions
- full tests if practical
- production build
- `git diff --check`
- no auto-publication
- no production mutation

## Manual Visual Checklist

- The page renders in desktop and mobile widths.
- The workspace shows only Aujourd’hui, Calendrier, and Opportunités.
- The "Pourquoi ?" drawer opens without shifting the entire layout.
- Priority cards stay dense and readable.
- Calendar cards remain simple and editable.
- Error states do not break the rest of the page.

## Self Review

- SPEC_COVERAGE_6A3=100%
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
