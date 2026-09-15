# LIVE 4C — Mon Carnet du Culte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à chaque replay Citadelle un carnet spirituel privé, local-first pour le visiteur et local + synchronisation serveur pour le membre, avec capture et retour au timestamp du lecteur existant.

**Architecture:** Réutiliser `public.live_cult_notes`, le lecteur `LiveReplayPlayer`, le pattern local-first de `live-replay-progress-client.ts`, et le pattern serveur `getVerifiedRouteProfile()` + `supabaseAdmin`. Aucun système de notes parallèle, aucun accès admin/pastoral automatique, aucune mutation DB pendant l’implémentation locale.

**Tech Stack:** Next.js 14.2.5, React, TypeScript, Vitest 2.1.9, Supabase, YouTube IFrame API, HTML5 video, localStorage.

**Spec:** `docs/superpowers/specs/2026-09-14-live4c-carnet-du-culte-design.md`

## Global Constraints

- `CARNET_PRIVATE_BY_DEFAULT = YES`
- `ADMIN_AUTO_ACCESS = NO`
- `PASTOR_AUTO_ACCESS = NO`
- `PRAYER_AUTO_SHARE = NO`
- `PUBLIC_AUTO_SHARE = NO`
- `NEW_PARALLEL_NOTE_TABLE = NO`
- `GUEST_STORAGE = LOCAL_FIRST`
- `MEMBER_STORAGE = LOCAL_PLUS_SERVER`
- `PLAYER_DUPLICATION = NO`
- `TIMESTAMP_REUSES_EXISTING_PLAYER = YES`
- `PRODUCTION_DB_MUTATION_WITHOUT_EXPLICIT_GO = NO`
- La migration LIVE 4C reste non appliquée pendant Tasks 5C–5G.
- `release-out/` reste préservé et hors scope de tous les commits.
- Aucun push Git.
- Chaque changement de code suit RED → GREEN → régression → commit.
- Ne jamais faire dépendre le Carnet du succès des statistiques figées LIVE4B.

---

## File Map

### Existing files to modify

- `supabase/migrations/20260913160000_live4c_replay_vivant_foundation.sql`
  - Harmoniser la contrainte `live_cult_notes.kind` avant première application.
- `src/components/live/LiveReplayPlayer.tsx`
  - Exposer un handle impératif minimal : `getCurrentPosition()` et `seekTo(seconds)`.
- `src/app/(public)/live/page.tsx`
  - Monter le Carnet visiteur local-first dans le modal replay.
- `src/app/(member)/member/dashboard/lives/page.tsx`
  - Monter le Carnet membre avec `serverSync`.

### New files

- `src/lib/live/live-cult-notes.ts`
- `src/lib/live/live-cult-notes.test.ts`
- `src/lib/live/live-cult-notes-migration.test.ts`
- `src/lib/live/live-cult-notes-client.ts`
- `src/lib/live/live-cult-notes-client.test.ts`
- `src/lib/live/live-cult-notes-server.ts`
- `src/lib/live/live-cult-notes-server.test.ts`
- `src/app/api/live/replay/notes/route.ts`
- `src/app/api/live/replay/notes/route.test.ts`
- `src/components/live/LiveReplayPlayer.handle.test.ts`
- `src/components/live/LiveCultNotebook.tsx`
- `src/components/live/LiveCultNotebook.contract.test.ts`
- `src/components/live/LiveCultNotebook.wiring.test.ts`

---

# Task 5C-1 — Domaine canonique + harmonisation de migration

**Files:**
- Create: `src/lib/live/live-cult-notes.ts`
- Create: `src/lib/live/live-cult-notes.test.ts`
- Create: `src/lib/live/live-cult-notes-migration.test.ts`
- Modify: `supabase/migrations/20260913160000_live4c_replay_vivant_foundation.sql:300-301`

**Interfaces:**
- Produces `LIVE_CULT_NOTE_KINDS`, `LiveCultNoteKind`, `LiveCultNote`, `LiveCultNoteWrite`, and normalization/validation helpers.

- [ ] **Step 1: Write the failing domain tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  LIVE_CULT_NOTE_KINDS,
  normalizeLiveCultNoteBody,
  normalizeLiveCultNoteKind,
  normalizePositionSeconds,
  normalizeScriptureReference,
  validCultNoteUuid,
} from './live-cult-notes'

describe('LIVE 4C cult notebook domain', () => {
  it('freezes the five V1 note kinds', () => {
    expect(LIVE_CULT_NOTE_KINDS).toEqual([
      'note',
      'received_word',
      'scripture',
      'decision',
      'meditation',
    ])
  })

  it('rejects unknown kinds and defaults empty kind to note', () => {
    expect(normalizeLiveCultNoteKind(undefined)).toBe('note')
    expect(normalizeLiveCultNoteKind('bookmark')).toBeNull()
  })

  it('trims body and enforces the SQL 1..10000 contract', () => {
    expect(normalizeLiveCultNoteBody('  parole  ')).toBe('parole')
    expect(normalizeLiveCultNoteBody('   ')).toBeNull()
    expect(normalizeLiveCultNoteBody('x'.repeat(10001))).toBeNull()
  })

  it('normalizes optional scripture and non-negative timestamp', () => {
    expect(normalizeScriptureReference('  Jean 3:16  ')).toBe('Jean 3:16')
    expect(normalizeScriptureReference('')).toBeNull()
    expect(normalizePositionSeconds(12.9)).toBe(12)
    expect(normalizePositionSeconds(-1)).toBeNull()
  })

  it('accepts only UUIDs', () => {
    expect(validCultNoteUuid('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(validCultNoteUuid('not-a-uuid')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the domain test and verify RED**

```powershell
npx vitest run src/lib/live/live-cult-notes.test.ts
```

Expected: FAIL because `live-cult-notes.ts` does not exist.

- [ ] **Step 3: Write the failing migration contract test**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260913160000_live4c_replay_vivant_foundation.sql',
  ),
  'utf8',
)

describe('LIVE 4C cult notebook migration contract', () => {
  it('uses the validated V1 kinds and removes bookmark', () => {
    expect(migration).toContain(
      "check (kind in ('note', 'received_word', 'scripture', 'decision', 'meditation'))",
    )
    expect(migration).not.toContain(
      "check (kind in ('note', 'bookmark', 'scripture'))",
    )
  })
})
```

- [ ] **Step 4: Run migration test and verify RED**

```powershell
npx vitest run src/lib/live/live-cult-notes-migration.test.ts
```

Expected: FAIL because migration still contains `bookmark`.

- [ ] **Step 5: Implement the minimal domain**

```ts
export const LIVE_CULT_NOTE_KINDS = [
  'note',
  'received_word',
  'scripture',
  'decision',
  'meditation',
] as const

export type LiveCultNoteKind =
  typeof LIVE_CULT_NOTE_KINDS[number]

export type LiveCultNote = {
  id: string
  cmsLiveId: string
  kind: LiveCultNoteKind
  body: string
  positionSeconds: number | null
  scriptureReference: string | null
  createdAt: string
  updatedAt: string
}
```

Rules:
- UUID strict for `id` and `cmsLiveId`.
- body trimmed, 1–10000 chars.
- scripture trimmed, `null` when empty, max 200 chars.
- timestamp integer `>= 0`, else `null`.
- never include `userId` in client domain types.

- [ ] **Step 6: Harmonize the unapplied migration**

Replace only:

```sql
check (kind in ('note', 'bookmark', 'scripture')),
```

with:

```sql
check (kind in ('note', 'received_word', 'scripture', 'decision', 'meditation')),
```

Do not create a second corrective migration.

- [ ] **Step 7: Run GREEN**

```powershell
npx vitest run src/lib/live/live-cult-notes.test.ts src/lib/live/live-cult-notes-migration.test.ts
npx tsc --noEmit
```

- [ ] **Step 8: Run focused replay regression**

```powershell
npx vitest run src/lib/live/live-replay-progress.test.ts src/lib/live/live-replay-player.test.ts src/components/live/LiveReplayPlayer.layout.test.ts src/components/live/LiveReplayPlayer.wiring.test.ts
```

- [ ] **Step 9: Commit exact scope**

```powershell
git add -- `
  src/lib/live/live-cult-notes.ts `
  src/lib/live/live-cult-notes.test.ts `
  src/lib/live/live-cult-notes-migration.test.ts `
  supabase/migrations/20260913160000_live4c_replay_vivant_foundation.sql

git commit -m "feat(live): add cult notebook domain"
```

No DB command.

---

# Task 5C-2 — Stockage local-first et merge local/serveur

**Files:**
- Create: `src/lib/live/live-cult-notes-client.ts`
- Create: `src/lib/live/live-cult-notes-client.test.ts`

**Interfaces:**
- Produces `CultNoteLocalScope`, localStorage helpers, merge helpers, auth scope resolver, and API fetch wrappers.

- [ ] **Step 1: Write failing local-first tests**

```ts
describe('LIVE 4C cult notebook local-first', () => {
  it('isolates guest and member keys', () => {
    expect(cultNoteStorageKey('guest', CMS_ID))
      .toBe(`citadelle_live_cult_notes_v1:guest:${CMS_ID}`)

    expect(cultNoteStorageKey(`member:${USER_ID}`, CMS_ID))
      .toBe(`citadelle_live_cult_notes_v1:member:${USER_ID}:${CMS_ID}`)
  })

  it('returns empty list for invalid local JSON', () => {
    localStorage.setItem(
      cultNoteStorageKey('guest', CMS_ID),
      '{bad json',
    )
    expect(readLocalCultNotes('guest', CMS_ID)).toEqual([])
  })
})
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-cult-notes-client.test.ts
```

- [ ] **Step 3: Implement local storage**

Rules:
- Prefix exactly `citadelle_live_cult_notes_v1:`.
- Guest key never contains a member id.
- Member key always contains authenticated uid.
- No automatic guest → member migration.
- invalid JSON returns `[]`.
- write failure never crashes the player.
- sort `createdAt ASC`, tie-break by `id`.

- [ ] **Step 4: Implement browser-auth scope resolver**

```ts
export async function getAuthenticatedCultNoteScope():
  Promise<CultNoteLocalScope | null> {
  const { data, error } = await supabase.auth.getUser()
  const id = data.user?.id
  if (error || !id || !validCultNoteUuid(id)) return null
  return `member:${id}`
}
```

This uid only isolates browser storage. Server ownership remains independently derived.

- [ ] **Step 5: Add API fetch wrappers**

All wrappers use same-origin relative URL `/api/live/replay/notes`, parse typed `{ ok, ... }` responses, and never throw expected API failures into the player.

- [ ] **Step 6: GREEN**

```powershell
npx vitest run src/lib/live/live-cult-notes-client.test.ts
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```powershell
git add -- `
  src/lib/live/live-cult-notes-client.ts `
  src/lib/live/live-cult-notes-client.test.ts

git commit -m "feat(live): add local cult notebook persistence"
```

---

# Task 5D — API privée membre + persistance serveur

**Files:**
- Create: `src/lib/live/live-cult-notes-server.ts`
- Create: `src/lib/live/live-cult-notes-server.test.ts`
- Create: `src/app/api/live/replay/notes/route.ts`
- Create: `src/app/api/live/replay/notes/route.test.ts`

**Interfaces:**
- `listMemberCultNotes(cmsLiveId)`
- `createMemberCultNote(input)`
- `updateMemberCultNote(input)`
- `deleteMemberCultNote(cmsLiveId, id)`
- `GET ?cmsLiveId=<uuid>`
- `POST { id, cmsLiveId, kind, body, positionSeconds, scriptureReference }`
- `PATCH { id, cmsLiveId, kind, body, scriptureReference }`
- `DELETE { id, cmsLiveId }`

**Security invariants:**
- `user_id` never accepted from request JSON.
- identity from `getVerifiedRouteProfile()`.
- all DB filters include current `user_id`.
- POST/PATCH/DELETE require same-origin and JSON.
- unknown body keys return 400.

- [ ] **Step 1: Write failing server tests**

Required cases:
- no identity → `identity_required`;
- list filters by `user_id` + `cms_live_id`;
- create injects server uid;
- update filters id + live + user;
- delete filters id + live + user;
- missing own row → `not_found`;
- Supabase error → `unavailable`.

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-cult-notes-server.test.ts
```

- [ ] **Step 3: Implement server mapper and ownership filters**

```ts
const NOTE_COLUMNS = [
  'id',
  'cms_live_id',
  'kind',
  'body',
  'position_seconds',
  'scripture_reference',
  'created_at',
  'updated_at',
].join(',')
```

- [ ] **Step 4: Make POST retry-safe**

Use client-generated UUID `id`.
1. query by id;
2. if absent, insert with current `user_id`;
3. if present and belongs to current user + same replay, return existing row;
4. otherwise return a non-leaking conflict/not-found result.

- [ ] **Step 5: Write failing route tests**

Required:
- unauthenticated 401;
- bad UUID 400;
- cross-site mutation 403;
- wrong content-type 400;
- `userId`/`user_id` field 400;
- invalid kind/body/reference/position 400;
- valid methods delegate correctly;
- unavailable 503.

- [ ] **Step 6: Verify RED**

```powershell
npx vitest run src/app/api/live/replay/notes/route.test.ts
```

- [ ] **Step 7: Implement route**

Reuse semantics from `src/app/api/live/replay/progress/route.ts`. Do not import route-private helpers.

- [ ] **Step 8: GREEN + typecheck**

```powershell
npx vitest run `
  src/lib/live/live-cult-notes-server.test.ts `
  src/app/api/live/replay/notes/route.test.ts

npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```powershell
git add -- `
  src/lib/live/live-cult-notes-server.ts `
  src/lib/live/live-cult-notes-server.test.ts `
  src/app/api/live/replay/notes/route.ts `
  src/app/api/live/replay/notes/route.test.ts

git commit -m "feat(live): add private cult notes API"
```

No DB call.

---

# Task 5E — Pont timestamp `LiveReplayPlayer`

**Files:**
- Modify: `src/components/live/LiveReplayPlayer.tsx`
- Create: `src/components/live/LiveReplayPlayer.handle.test.ts`

**Interface:**

```ts
export type LiveReplayPlayerHandle = {
  getCurrentPosition: () => number | null
  seekTo: (seconds: number) => boolean
}
```

- [ ] **Step 1: Write failing handle contract test**

```ts
expect(source).toContain('export type LiveReplayPlayerHandle')
expect(source).toContain('forwardRef<LiveReplayPlayerHandle')
expect(source).toContain('useImperativeHandle')
expect(source).toContain('getCurrentPosition')
expect(source).toContain('seekTo')
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/components/live/LiveReplayPlayer.handle.test.ts
```

- [ ] **Step 3: Implement minimal imperative handle**

```ts
export const LiveReplayPlayer =
  forwardRef<LiveReplayPlayerHandle, Props>(
    function LiveReplayPlayer(props, ref) {
      // existing component body
    },
  )
```

`getCurrentPosition()` prioritizes YouTube `getCurrentTime()`, then HTML5 `currentTime`, then `positionRef.current`.

`seekTo(seconds)` clamps to `>=0`, uses YouTube `seekTo(target, true)` or HTML5 `video.currentTime = target`, updates `positionRef.current`, returns boolean.

Do not change replay progress persistence semantics.

- [ ] **Step 4: GREEN + replay regressions**

```powershell
npx vitest run `
  src/components/live/LiveReplayPlayer.handle.test.ts `
  src/components/live/LiveReplayPlayer.layout.test.ts `
  src/components/live/LiveReplayPlayer.wiring.test.ts `
  src/lib/live/live-replay-player.test.ts `
  src/lib/live/live-replay-progress.test.ts

npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```powershell
git add -- `
  src/components/live/LiveReplayPlayer.tsx `
  src/components/live/LiveReplayPlayer.handle.test.ts

git commit -m "feat(live): expose replay notebook controls"
```

---

# Task 5F — Interface `Mon Carnet du Culte` + wiring public/membre

**Files:**
- Create: `src/components/live/LiveCultNotebook.tsx`
- Create: `src/components/live/LiveCultNotebook.contract.test.ts`
- Create: `src/components/live/LiveCultNotebook.wiring.test.ts`
- Modify: `src/app/(public)/live/page.tsx`
- Modify: `src/app/(member)/member/dashboard/lives/page.tsx`

**Component interface:**

```ts
type Props = {
  cmsLiveId: string
  playerRef: React.RefObject<LiveReplayPlayerHandle | null>
  serverSync?: boolean
}
```

- [ ] **Step 1: Write failing UI contract test**

```ts
expect(source).toContain('Mon Carnet')
expect(source).toContain('Enregistré uniquement sur cet appareil.')
expect(source).toContain('Parole reçue')
expect(source).toContain('Décision')
expect(source).toContain('À méditer')
expect(source).toContain('Référence biblique')
expect(source).toContain('Enregistrer')
expect(source).toContain('Modifier')
expect(source).toContain('Supprimer')
expect(source).not.toContain('Envoyer au pasteur')
expect(source).not.toContain('Demande de prière')
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/components/live/LiveCultNotebook.contract.test.ts
```

- [ ] **Step 3: Implement component behavior**

Open:
1. resolve guest/member scope;
2. read local notes;
3. if member, fetch + merge server notes;
4. never remount player.

Create:
1. capture `playerRef.current?.getCurrentPosition() ?? null`;
2. generate `crypto.randomUUID()`;
3. write local immediately;
4. POST asynchronously when member;
5. on failure, keep local note + discreet sync warning.

Edit:
- local first;
- PATCH when member;
- local newer copy remains on sync failure.

Delete:
- guest: local immediately;
- member: DELETE server first, then local on success, preventing note resurrection.

- [ ] **Step 4: Write failing wiring test**

Public must import/mount `LiveCultNotebook` without `serverSync`.
Member must import/mount it with `serverSync`.
Both must retain `LiveReplayReactionCounts`.

- [ ] **Step 5: Verify wiring RED**

```powershell
npx vitest run src/components/live/LiveCultNotebook.wiring.test.ts
```

- [ ] **Step 6: Wire public replay**

Use:

```ts
const replayPlayerRef =
  useRef<LiveReplayPlayerHandle | null>(null)
```

Pass ref to `LiveReplayPlayer`, then:

```tsx
<LiveCultNotebook
  cmsLiveId={replayPlayer.id}
  playerRef={replayPlayerRef}
/>
```

Place notebook after player and before frozen LIVE4B reaction memory.

- [ ] **Step 7: Wire member replay**

```tsx
<LiveCultNotebook
  cmsLiveId={player.cmsLiveId}
  playerRef={replayPlayerRef}
  serverSync
/>
```

Do not alter playlist raw iframe behavior.

- [ ] **Step 8: GREEN**

```powershell
npx vitest run `
  src/components/live/LiveCultNotebook.contract.test.ts `
  src/components/live/LiveCultNotebook.wiring.test.ts `
  src/components/live/LiveReplayPlayer.handle.test.ts `
  src/components/live/LiveReplayPlayer.layout.test.ts `
  src/components/live/LiveReplayPlayer.wiring.test.ts

npx tsc --noEmit
```

- [ ] **Step 9: Full focused replay regression**

```powershell
npx vitest run `
  src/lib/live/live-cult-notes.test.ts `
  src/lib/live/live-cult-notes-migration.test.ts `
  src/lib/live/live-cult-notes-client.test.ts `
  src/lib/live/live-cult-notes-server.test.ts `
  src/app/api/live/replay/notes/route.test.ts `
  src/components/live/LiveCultNotebook.contract.test.ts `
  src/components/live/LiveCultNotebook.wiring.test.ts `
  src/components/live/LiveReplayPlayer.handle.test.ts `
  src/components/live/LiveReplayPlayer.layout.test.ts `
  src/components/live/LiveReplayPlayer.wiring.test.ts `
  src/lib/live/live-replay-player.test.ts `
  src/lib/live/live-replay-progress.test.ts
```

- [ ] **Step 10: Commit**

```powershell
git add -- `
  src/components/live/LiveCultNotebook.tsx `
  src/components/live/LiveCultNotebook.contract.test.ts `
  src/components/live/LiveCultNotebook.wiring.test.ts `
  "src/app/(public)/live/page.tsx" `
  "src/app/(member)/member/dashboard/lives/page.tsx"

git commit -m "feat(live): add cult notebook interface"
```

---

# Task 5G — Human QA visiteur local-first

**Files:** no intended source changes.

- [ ] Start a fresh isolated local server on an unused port, e.g. 3125.
- [ ] Use a replay known to embed successfully.
- [ ] Verify video visible, notebook opens without unmounting player.
- [ ] Create note, verify timestamp, scripture, persistence after close/reopen.
- [ ] Click timestamp and verify seek.
- [ ] Edit and verify persistence.
- [ ] Delete and verify disappearance.
- [ ] Refresh and verify remaining local notes persist.
- [ ] Confirm **Enregistré uniquement sur cet appareil.**
- [ ] Confirm guest mode sends no `/api/live/replay/notes` request.

Only after direct observation:

```text
TASK5_GUEST_PLAYER_VISIBLE=PASS
TASK5_GUEST_NOTE_CREATE=PASS
TASK5_GUEST_TIMESTAMP_CAPTURE=PASS
TASK5_GUEST_TIMESTAMP_SEEK=PASS
TASK5_GUEST_NOTE_EDIT=PASS
TASK5_GUEST_NOTE_DELETE=PASS
TASK5_GUEST_LOCAL_PERSISTENCE=PASS
TASK5_GUEST_SERVER_WRITE=NONE
```

Then:

```powershell
npx tsc --noEmit
npm test
```

Do not claim global Task 5 completion yet.

---

# Task 5H — Member server-sync gate and deferred runtime QA

**Current expected status:** BLOCKED until an explicitly authorized DB runtime contains the LIVE 4C migration and a safe service-role-backed server environment is verified.

- [ ] Static safety gate:
  - member has `serverSync`;
  - public does not;
  - API derives identity server-side;
  - no client `user_id`;
  - migration has five final kinds;
  - migration unapplied unless separately authorized.

- [ ] Forbidden without separate explicit authorization:
  - production migration application;
  - production SQL;
  - copying production service-role secret into local;
  - synthetic production note creation.

- [ ] When a controlled DB target is explicitly authorized:
  1. verify target identity;
  2. apply reviewed LIVE 4C migration only there;
  3. create member note;
  4. close/reopen and verify server restore;
  5. edit and verify persistence;
  6. delete and verify persistence;
  7. verify another member cannot access it;
  8. verify no generic admin notebook UI.

Until then:

```text
TASK5_LOCAL_IMPLEMENTATION=COMPLETE
TASK5_GUEST_HUMAN_QA=PASS
TASK5_MEMBER_SERVER_SYNC=DEFERRED
TASK5_GLOBAL=NOT_COMPLETE
```

After controlled member runtime QA:

```text
TASK5_MEMBER_SERVER_SYNC=PASS
TASK5_GLOBAL=PASS
```

---

# Final Verification Matrix

Before claiming local implementation complete:

```powershell
npx tsc --noEmit
npm test
git status --short
```

Required:
- TypeScript exit 0.
- Vitest full suite 0 failures.
- no tracked changes.
- `release-out/` may remain untracked and preserved.
- no DB mutation unless separately authorized.
- no production mutation.
- no Git push.

## Expected commit sequence

1. `feat(live): add cult notebook domain`
2. `feat(live): add local cult notebook persistence`
3. `feat(live): add private cult notes API`
4. `feat(live): expose replay notebook controls`
5. `feat(live): add cult notebook interface`

## Plan self-review

- Spec coverage: complete for privacy, local-first, member sync, timestamp capture/seek, edit/delete, five kinds, no parallel table, no pastoral/prayer auto-share, and QA gates.
- Placeholder scan: no implementation TBD/TODO/FIXME.
- Type consistency: `LiveReplayPlayerHandle`, `LiveCultNote`, `CultNoteLocalScope`, `/api/live/replay/notes`, and `serverSync` are consistent.
- Scope: comments, replay reactions, giving, prayer and pastoral workflows remain outside Task 5.
