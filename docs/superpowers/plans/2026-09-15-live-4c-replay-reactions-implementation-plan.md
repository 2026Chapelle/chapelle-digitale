# LIVE 4C — Réactions vivantes du replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter aux replays Citadelle quatre réactions persistantes, une seule active par personne et par replay, partagées entre les espaces public et membre, avec identité visiteur privée et administration ERP hiérarchisée.

**Architecture:** Une route Next.js serveur unique expose lecture, remplacement et retrait ; elle délègue à un moteur serveur utilisant `supabaseAdmin`, un cookie visiteur `HttpOnly` et la table existante `live_replay_reactions`. Un composant React partagé applique une mise à jour optimiste sérialisée et un polling visible toutes les 15 secondes. Une route administrative séparée réutilise exclusivement les helpers ERP existants.

**Tech Stack:** Next.js 14.2.5, React 18.3.1, TypeScript 5.5.3, Vitest 2.1.9, Supabase/PostgreSQL, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-15-live-4c-replay-reactions-design.md`

## Global Constraints

- Réactions exactes : `amen`, `receive`, `glory`, `thanks`.
- Libellés exacts : `Amen`, `Je reçois`, `Gloire à Dieu`, `Merci Seigneur`.
- Une seule réaction active par `(cms_live_id, actor_key)` ; le même clic retire, un autre remplace.
- Les quatre compteurs sont toujours présents, y compris les zéros ; aucun total général.
- L’absence de ligne dans `live_replay_reaction_settings` signifie `enabled = true`.
- L’API Next.js est l’unique autorité d’écriture ; aucune clé `service_role` dans le navigateur.
- Cookie visiteur `HttpOnly`, `SameSite=Lax`, `Secure` en production ; jeton brut jamais persisté ni journalisé.
- Empreinte visiteur par HMAC-SHA-256 avec `LIVE_REPLAY_GUEST_SECRET`, secret serveur d’au moins 32 caractères.
- Transfert invité → membre atomique ; la réaction membre existante prévaut.
- Polling exact : `15_000 ms`, uniquement lorsque `document.visibilityState === 'visible'`.
- Échec de mutation : état confirmé restauré et message exact `Ta réaction n’a pas pu être enregistrée. Réessaie.`
- La route figée LIVE 4B `/api/live/reactions/replay`, ses tables et ses fonctions restent inchangées.
- Migration historique `20260913160000_live4c_replay_vivant_foundation.sql` inchangée ; correction additive uniquement.
- La migration corrective échoue avant tout DDL si `live_replay_reactions` contient une ligne.
- Aucun accès direct `anon` ou `authenticated` aux tables de réactions et réglages.
- Aucun Supabase Realtime dans cette version.
- Aucun changement de base distante, aucun push, aucun déploiement sans autorisation distincte.
- `release-out/` reste préservé et hors scope.
- Chaque tâche de code suit RED → GREEN → régression → commit exact.

---

## File Map

### New files

- `supabase/migrations/20260915210000_live4c_replay_reactions.sql` — correction additive, rattachement ERP et réglages.
- `src/lib/live/live-replay-reactions.ts` — vocabulaire, types et normalisation pure.
- `src/lib/live/live-replay-reactions.test.ts` — contrat du domaine.
- `src/lib/live/live-replay-reactions-migration.test.ts` — contrat statique SQL.
- `src/lib/live/live-replay-reaction-identity.ts` — cookie, HMAC et identité acteur.
- `src/lib/live/live-replay-reaction-identity.test.ts` — sécurité de l’identité et transfert d’empreinte.
- `src/lib/live/live-replay-reactions-server.ts` — lecture, mutation et transfert atomique.
- `src/lib/live/live-replay-reactions-server.test.ts` — tests du moteur et des accès Supabase.
- `src/app/api/live/replay/reactions/route.ts` — API publique GET/PUT/DELETE.
- `src/app/api/live/replay/reactions/route.test.ts` — matrice HTTP, origine et limitation.
- `src/lib/live/live-replay-reactions-client.ts` — client HTTP et ordonnanceur dernière intention.
- `src/lib/live/live-replay-reactions-client.test.ts` — sérialisation, rollback et visibilité.
- `src/components/live/LiveReplayReactions.tsx` — interface partagée accessible.
- `src/components/live/LiveReplayReactions.test.tsx` — contrat rendu/comportement.
- `src/components/live/LiveReplayReactions.wiring.test.ts` — montage public/membre et préservation LIVE 4B.
- `src/lib/live/live-replay-reaction-admin-server.ts` — autorisation ERP et réglages.
- `src/lib/live/live-replay-reaction-admin-server.test.ts` — matrice des périmètres.
- `src/app/api/admin/live/replay/reactions/route.ts` — GET/PATCH administratif.
- `src/app/api/admin/live/replay/reactions/route.test.ts` — identité, périmètre et origine.
- `src/components/features/admin/LiveReplayReactionGovernance.tsx` — rattachement et activation par replay.
- `src/components/features/admin/LiveReplayReactionGovernance.test.tsx` — contrat UI administratif.

### Existing files to modify

- `src/app/(public)/live/page.tsx` — monter les réactions vivantes sous le lecteur replay.
- `src/app/(member)/member/dashboard/lives/page.tsx` — monter le même composant avec le même `cmsLiveId`.
- `src/app/(admin)/admin/lives/page.tsx` — ajouter le panneau de gouvernance sécurisé.
- `scripts/assert-production-env.mjs` — exiger le secret visiteur en production.
- `.env.example` — documenter `LIVE_REPLAY_GUEST_SECRET` sans valeur réelle.

---

## Task 6A — Domaine canonique des réactions

**Files:**
- Create: `src/lib/live/live-replay-reactions.ts`
- Create: `src/lib/live/live-replay-reactions.test.ts`

**Interfaces:**
- Produces: `LIVE_REPLAY_REACTIONS`, `LiveReplayReaction`, `LiveReplayReactionCounts`, `LiveReplayReactionSnapshot`, `isLiveReplayReaction()`, `emptyLiveReplayReactionCounts()`, `applyOptimisticReaction()`.
- Consumes: aucune dépendance applicative.

- [ ] **Step 1: Write the failing domain test**

```ts
import { describe, expect, it } from 'vitest'
import {
  LIVE_REPLAY_REACTIONS,
  applyOptimisticReaction,
  emptyLiveReplayReactionCounts,
  isLiveReplayReaction,
} from './live-replay-reactions'

describe('LIVE 4C replay reaction domain', () => {
  it('freezes the four approved reactions', () => {
    expect(LIVE_REPLAY_REACTIONS).toEqual([
      { key: 'amen', label: 'Amen' },
      { key: 'receive', label: 'Je reçois' },
      { key: 'glory', label: 'Gloire à Dieu' },
      { key: 'thanks', label: 'Merci Seigneur' },
    ])
    expect(isLiveReplayReaction('fire')).toBe(false)
  })

  it('starts every count at zero', () => {
    expect(emptyLiveReplayReactionCounts()).toEqual({
      amen: 0, receive: 0, glory: 0, thanks: 0,
    })
  })

  it('adds, replaces and removes one active reaction', () => {
    const zero = emptyLiveReplayReactionCounts()
    expect(applyOptimisticReaction(zero, null, 'amen')).toEqual({
      counts: { ...zero, amen: 1 }, selectedReaction: 'amen',
    })
    expect(applyOptimisticReaction({ ...zero, amen: 1 }, 'amen', 'glory')).toEqual({
      counts: { ...zero, glory: 1 }, selectedReaction: 'glory',
    })
    expect(applyOptimisticReaction({ ...zero, amen: 1 }, 'amen', null)).toEqual({
      counts: zero, selectedReaction: null,
    })
  })
})
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-replay-reactions.test.ts
```

Expected: FAIL because the domain module does not exist.

- [ ] **Step 3: Implement the minimal pure domain**

```ts
export const LIVE_REPLAY_REACTIONS = [
  { key: 'amen', label: 'Amen' },
  { key: 'receive', label: 'Je reçois' },
  { key: 'glory', label: 'Gloire à Dieu' },
  { key: 'thanks', label: 'Merci Seigneur' },
] as const

export type LiveReplayReaction =
  typeof LIVE_REPLAY_REACTIONS[number]['key']

export type LiveReplayReactionCounts =
  Record<LiveReplayReaction, number>

export type LiveReplayReactionSnapshot = {
  enabled: boolean
  selectedReaction: LiveReplayReaction | null
  counts: LiveReplayReactionCounts
}
```

`applyOptimisticReaction()` clamps decrements at zero, never mutates its input and returns the exact snapshot delta for add/replace/remove.

- [ ] **Step 4: Verify GREEN and types**

```powershell
npx vitest run src/lib/live/live-replay-reactions.test.ts
npm.cmd run type-check
```

- [ ] **Step 5: Commit exact scope**

```powershell
git add -- src/lib/live/live-replay-reactions.ts src/lib/live/live-replay-reactions.test.ts
git commit -m "feat(live): define replay reaction domain"
```

---

## Task 6B — Migration additive, intégrité et RLS

**Files:**
- Create through Supabase CLI, then normalize path: `supabase/migrations/20260915210000_live4c_replay_reactions.sql`
- Create: `src/lib/live/live-replay-reactions-migration.test.ts`

**Interfaces:**
- Produces database contracts for `live_replay_reactions`, `cms_lives.organization_id`, `cms_lives.organization_unit_id`, and `live_replay_reaction_settings`.
- Consumes the existing candidate key `organization_units(organization_id, id)`.

- [ ] **Step 1: Create the migration through the CLI and normalize its exact path**

```powershell
supabase --version
supabase migration new live4c_replay_reactions
$generated = Get-ChildItem supabase/migrations/*_live4c_replay_reactions.sql |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1
if (-not $generated) { throw "Supabase CLI did not create the migration" }
git mv -- $generated.FullName supabase/migrations/20260915210000_live4c_replay_reactions.sql
```

This command creates a local file only. Do not run `db push`, `db reset --linked`, `execute_sql` or `apply_migration`.

- [ ] **Step 2: Write the failing migration contract test**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260915210000_live4c_replay_reactions.sql',
), 'utf8').replace(/\s+/g, ' ').toLowerCase()

describe('LIVE 4C replay reactions migration', () => {
  it('fails before DDL when reaction rows already exist', () => {
    expect(sql).toContain('if exists ( select 1 from public.live_replay_reactions limit 1 )')
    expect(sql).toContain("raise exception 'live4c_replay_reactions_not_empty'")
  })
  it('enforces one actor reaction and exact keys', () => {
    expect(sql).toContain('primary key (cms_live_id, actor_key)')
    expect(sql).toContain("reaction in ('amen', 'receive', 'glory', 'thanks')")
  })
  it('keeps direct-client access closed', () => {
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('revoke all on table public.live_replay_reactions from public, anon, authenticated')
    expect(sql).toContain('revoke all on table public.live_replay_reaction_settings from public, anon, authenticated')
    expect(sql).not.toContain('create policy')
  })
})
```

- [ ] **Step 3: Verify RED**

```powershell
npx vitest run src/lib/live/live-replay-reactions-migration.test.ts
```

Expected: FAIL because the new migration is empty.

- [ ] **Step 4: Write the migration in one transaction**

```sql
begin;

do $live4c_reactions$
begin
  if exists (
    select 1 from public.live_replay_reactions limit 1
  ) then
    raise exception 'live4c_replay_reactions_not_empty';
  end if;
end
$live4c_reactions$;

alter table public.live_replay_reactions
  drop constraint live_replay_reactions_pkey;
alter table public.live_replay_reactions
  drop constraint live_replay_reactions_reaction_check;
alter table public.live_replay_reactions
  add constraint live_replay_reactions_reaction_check
  check (reaction in ('amen', 'receive', 'glory', 'thanks'));
alter table public.live_replay_reactions
  add constraint live_replay_reactions_pkey
  primary key (cms_live_id, actor_key);

alter table public.cms_lives
  add column organization_id uuid,
  add column organization_unit_id uuid,
  add constraint cms_lives_replay_unit_pair_check check (
    (organization_id is null and organization_unit_id is null)
    or (organization_id is not null and organization_unit_id is not null)
  ),
  add constraint cms_lives_replay_unit_org_fk
    foreign key (organization_id, organization_unit_id)
    references public.organization_units(organization_id, id)
    on delete restrict;

create index idx_cms_lives_replay_unit
  on public.cms_lives(organization_id, organization_unit_id)
  where organization_unit_id is not null;

create table public.live_replay_reaction_settings (
  cms_live_id uuid primary key references public.cms_lives(id) on delete cascade,
  enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger trg_live_replay_reaction_settings_touch_updated_at
  before update on public.live_replay_reaction_settings
  for each row execute function public.cms_touch_updated_at();

alter table public.live_replay_reaction_settings enable row level security;
alter table public.live_replay_reaction_settings force row level security;
alter table public.live_replay_reactions force row level security;
revoke all on table public.live_replay_reactions from public, anon, authenticated;
revoke all on table public.live_replay_reaction_settings from public, anon, authenticated;
grant all on table public.live_replay_reaction_settings to service_role;

commit;
```

Before finalizing, verify actual constraint names with the historical migration and `pg_constraint`; keep the preflight as the first executable statement after `begin`.

- [ ] **Step 5: Verify static GREEN and historical isolation**

```powershell
npx vitest run src/lib/live/live-replay-reactions-migration.test.ts src/lib/live/live-reactions-migration.test.ts src/lib/live/live-reactions-rpc-migration.test.ts
git diff --check
```

- [ ] **Step 6: Commit exact scope**

```powershell
git add -- supabase/migrations/20260915210000_live4c_replay_reactions.sql src/lib/live/live-replay-reactions-migration.test.ts
git commit -m "feat(live): align replay reaction schema"
```

No database command is authorized in this task.

---

## Task 6C — Identité visiteur privée et configuration

**Files:**
- Create: `src/lib/live/live-replay-reaction-identity.ts`
- Create: `src/lib/live/live-replay-reaction-identity.test.ts`
- Modify: `scripts/assert-production-env.mjs`
- Modify: `.env.example`

**Interfaces:**
- Produces: `LIVE_REPLAY_GUEST_COOKIE`, `ReplayReactionIdentity`, `resolveReplayReactionIdentity()`, `hashReplayGuestToken()`.
- `ReplayReactionIdentity = { kind: 'member'; actorKey: string; userId: string; guestActorKey: string | null } | { kind: 'guest'; actorKey: string; userId: null; guestActorKey: string }`.
- `resolveReplayReactionIdentity()` returns `{ identity, newGuestToken }`; `newGuestToken` is non-null only when an unauthenticated request had no valid cookie.

- [ ] **Step 1: Write failing identity tests**

```ts
import { describe, expect, it } from 'vitest'
import { hashReplayGuestToken } from './live-replay-reaction-identity'

describe('replay reaction guest identity', () => {
  it('uses a keyed deterministic 64-hex digest', () => {
    const a = hashReplayGuestToken('token-a', 'x'.repeat(32))
    const b = hashReplayGuestToken('token-a', 'y'.repeat(32))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })
  it('rejects secrets shorter than 32 characters', () => {
    expect(() => hashReplayGuestToken('token-a', 'short')).toThrow()
  })
})
```

Add mocked `cookies()`/`createRouteClient().auth.getUser()` cases for: new guest cookie, returning guest, verified member with guest cookie, presented invalid auth, and unavailable auth dependency.

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-replay-reaction-identity.test.ts
```

- [ ] **Step 3: Implement cookie and HMAC identity**

```ts
export const LIVE_REPLAY_GUEST_COOKIE = 'citadelle_replay_guest_v1'

export function hashReplayGuestToken(token: string, secret: string): string {
  if (secret.length < 32) throw new Error('LIVE_REPLAY_GUEST_SECRET_INVALID')
  return createHmac('sha256', secret).update(token, 'utf8').digest('hex')
}
```

Generate missing token with `randomBytes(32).toString('base64url')`. Set it through `NextResponse.cookies.set()` in the route adapter with `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `path: '/'`, `maxAge: 31_536_000`. Never log token or digest.

For a verified member, return `member:<uuid>` and also the cookie-derived `guest:<digest>` when present so the server can transfer atomically. Do not alter `live-reaction-identity-server.ts`, which belongs to LIVE 4B.

- [ ] **Step 4: Add production configuration guard**

`.env.example` contains only:

```dotenv
LIVE_REPLAY_GUEST_SECRET=
```

`scripts/assert-production-env.mjs` rejects a missing, placeholder, or shorter-than-32 production value without printing it.

- [ ] **Step 5: GREEN and regression**

```powershell
npx vitest run src/lib/live/live-replay-reaction-identity.test.ts src/lib/live/live-reaction-identity-server.test.ts
npm.cmd run type-check
```

- [ ] **Step 6: Commit**

```powershell
git add -- src/lib/live/live-replay-reaction-identity.ts src/lib/live/live-replay-reaction-identity.test.ts scripts/assert-production-env.mjs .env.example
git commit -m "feat(live): secure replay guest identity"
```

---

## Task 6D — Moteur serveur et transfert atomique

**Files:**
- Create: `src/lib/live/live-replay-reactions-server.ts`
- Create: `src/lib/live/live-replay-reactions-server.test.ts`

**Interfaces:**
- Consumes: `ReplayReactionIdentity`, `LiveReplayReaction`, `supabaseAdmin`.
- Produces: `getReplayReactionSnapshot(cmsLiveId, identity)`, `putReplayReaction(cmsLiveId, reaction, identity)`, `deleteReplayReaction(cmsLiveId, identity)`.

- [ ] **Step 1: Write failing server tests**

```ts
describe('LIVE 4C replay reaction server', () => {
  it('returns four zero counts when no row exists', async () => {
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toMatchObject({
      ok: true,
      snapshot: { enabled: true, selectedReaction: null, counts: { amen: 0, receive: 0, glory: 0, thanks: 0 } },
    })
  })
  it('upserts on cms_live_id,actor_key and injects member user_id', async () => {
    await putReplayReaction(CMS_ID, 'amen', member)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      cms_live_id: CMS_ID, actor_key: `member:${USER_ID}`, user_id: USER_ID, reaction: 'amen',
    }), { onConflict: 'cms_live_id,actor_key' })
  })
})
```

Also cover replay validation, disabled state, DB failure, delete filtering, member-wins transfer and guest-only transfer.

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-replay-reactions-server.test.ts
```

- [ ] **Step 3: Implement snapshot and mutation queries**

Validate replay via `cms_lives.id` and replay status/URL rules already used by `live-replay-progress-server.ts`. Read settings with `maybeSingle()`; missing row means enabled. Aggregate rows server-side into the four-key zero-initialized map. Never return `actor_key` or `user_id` to the client.

```ts
export type ReplayReactionResult =
  | { ok: true; snapshot: LiveReplayReactionSnapshot }
  | { ok: false; reason: 'not_replay' | 'disabled' | 'unavailable' }
```

- [ ] **Step 4: Implement atomic transfer as a private SQL RPC in the same new migration**

Add `public.live_replay_reaction_transfer(p_cms_live_id uuid, p_guest_actor_key text, p_user_id uuid)` as `SECURITY DEFINER`, `SET search_path = pg_catalog, public, pg_temp`. Do not use `auth.uid()` because service-role server calls do not carry the member JWT into SQL; `p_user_id` must come only from the identity already verified by `getVerifiedRouteProfile()`. Revoke execution from `PUBLIC`, `anon`, `authenticated`; grant only `service_role`. Lock both candidate rows in deterministic actor-key order. If member exists, delete guest. Otherwise update guest row to `member:<uuid>` and set `user_id`. Return no token data.

```sql
revoke all on function public.live_replay_reaction_transfer(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.live_replay_reaction_transfer(uuid, text, uuid)
  to service_role;
```

Extend the migration test to assert the exact revokes, fixed search path, deterministic row locks and member-wins branch.

- [ ] **Step 5: GREEN**

```powershell
npx vitest run src/lib/live/live-replay-reactions-server.test.ts src/lib/live/live-replay-reactions-migration.test.ts
npm.cmd run type-check
```

- [ ] **Step 6: Commit exact scope**

```powershell
git add -- src/lib/live/live-replay-reactions-server.ts src/lib/live/live-replay-reactions-server.test.ts supabase/migrations/20260915210000_live4c_replay_reactions.sql src/lib/live/live-replay-reactions-migration.test.ts
git commit -m "feat(live): persist replay reactions safely"
```

---

## Task 6E — API publique sécurisée

**Files:**
- Create: `src/app/api/live/replay/reactions/route.ts`
- Create: `src/app/api/live/replay/reactions/route.test.ts`

**Interfaces:**
- `GET /api/live/replay/reactions?cmsLiveId=<uuid>`.
- `PUT /api/live/replay/reactions` with `{ cmsLiveId, reaction }`.
- `DELETE /api/live/replay/reactions` with `{ cmsLiveId }`.
- Produces `{ ok: true, enabled, selectedReaction, counts }` with `Cache-Control: no-store, max-age=0`.

- [ ] **Step 1: Write the failing route matrix**

Use `NextRequest` and mocks. Assert exact statuses for invalid query/body keys (400), identity failure (401), foreign/null/cross-site origin (403), disabled mutation (403), missing replay (404), limit exceeded (429), dependency failure (503), and success (200). Assert every response is no-store and every success contains all four counts.

```ts
expect(await PUT(request({ reaction: 'fire' }))).toHaveProperty('status', 400)
expect(await PUT(request({ reaction: 'amen' }, { origin: 'https://evil.example' })))
  .toHaveProperty('status', 403)
expect(rateLimit).toHaveBeenCalledWith(expect.stringMatching(/^replay-reaction:/), {
  limit: 30, windowMs: 60_000,
})
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/app/api/live/replay/reactions/route.test.ts
```

- [ ] **Step 3: Implement the route adapter**

Reuse the exact public-origin comparison semantics from `src/app/api/live/replay/progress/route.ts`; GET does not require Origin, PUT/DELETE do. Accept only `application/json`, a JSON object, exact key sets and a bounded body. Rate-limit mutations by both `identity.actorKey` and `clientIp(request)` using separate keys, 30/minute each.

Call `resolveReplayReactionIdentity()` once per request. Attach `newGuestToken` only to the response cookie when it is non-null; do not accept a guest token from JSON, query or custom headers.

- [ ] **Step 4: GREEN and origin regressions**

```powershell
npx vitest run src/app/api/live/replay/reactions/route.test.ts src/app/api/live/replay/progress/route.test.ts src/app/api/live/replay/notes/route.test.ts
npm.cmd run type-check
```

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/api/live/replay/reactions/route.ts src/app/api/live/replay/reactions/route.test.ts
git commit -m "feat(live): expose replay reaction API"
```

---

## Task 6F — Ordonnanceur client et interface optimiste

**Files:**
- Create: `src/lib/live/live-replay-reactions-client.ts`
- Create: `src/lib/live/live-replay-reactions-client.test.ts`
- Create: `src/components/live/LiveReplayReactions.tsx`
- Create: `src/components/live/LiveReplayReactions.test.tsx`

**Interfaces:**
- Produces: `fetchReplayReactionSnapshot()`, `createReplayReactionIntentQueue()`, `LIVE_REPLAY_REACTION_POLL_MS = 15_000`.
- Component props: `{ cmsLiveId: string }`.

- [ ] **Step 1: Write failing queue tests**

```ts
it('serializes rapid clicks and persists only the latest intent', async () => {
  const queue = createReplayReactionIntentQueue(send, confirm, rollback)
  queue.push('amen')
  queue.push('glory')
  queue.push(null)
  await queue.idle()
  expect(send.mock.calls.map(([value]) => value)).toEqual(['amen', null])
})

it('rolls back only when the failed intent is still latest', async () => {
  send.mockRejectedValueOnce(new Error('offline'))
  const queue = createReplayReactionIntentQueue(send, confirm, rollback)
  queue.push('thanks')
  await queue.idle()
  expect(rollback).toHaveBeenCalledOnce()
})
```

Also test that polling pauses hidden, fires immediately on visible, stops on dispose and does not overwrite an in-flight optimistic selection.

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-replay-reactions-client.test.ts
```

- [ ] **Step 3: Implement the serialized last-intent queue**

Keep one request in flight and one replaceable pending slot. A new click replaces the pending value. When the in-flight request settles, send the newest pending value. Update `confirmedSnapshot` only from successful responses. Roll back to it only when no newer version exists. Expose `idle()` for deterministic tests and `dispose()` to prevent state updates after unmount.

- [ ] **Step 4: Write failing component contract tests**

```ts
expect(source).toContain('Ce message t’a touché ? Réagis avec la communauté.')
expect(source).toContain('aria-pressed')
expect(source).toContain('grid-cols-2')
expect(source).toContain('lg:grid-cols-4')
expect(source).toContain('Ta réaction n’a pas pu être enregistrée. Réessaie.')
expect(source).not.toContain('Total')
```

Use React DOM testing already configured in the repo to click active/inactive buttons and assert add/replace/remove plus rollback.

- [ ] **Step 5: Implement `LiveReplayReactions`**

Render nothing when `enabled === false`. Render four buttons from `LIVE_REPLAY_REACTIONS`; each button has `type="button"`, `aria-pressed`, visible label and its count underneath. Loading/API failure never throws beyond the component boundary and never blocks siblings.

- [ ] **Step 6: GREEN**

```powershell
npx vitest run src/lib/live/live-replay-reactions-client.test.ts src/components/live/LiveReplayReactions.test.tsx
npm.cmd run type-check
```

- [ ] **Step 7: Commit**

```powershell
git add -- src/lib/live/live-replay-reactions-client.ts src/lib/live/live-replay-reactions-client.test.ts src/components/live/LiveReplayReactions.tsx src/components/live/LiveReplayReactions.test.tsx
git commit -m "feat(live): add optimistic replay reactions"
```

---

## Task 6G — Montage partagé public et membre

**Files:**
- Create: `src/components/live/LiveReplayReactions.wiring.test.ts`
- Modify: `src/app/(public)/live/page.tsx`
- Modify: `src/app/(member)/member/dashboard/lives/page.tsx`

**Interfaces:**
- Consumes: `<LiveReplayReactions cmsLiveId={...} />`.
- Preserves: `<LiveReplayReactionCounts ... />` as frozen LIVE 4B memory.

- [ ] **Step 1: Write the failing wiring test**

```ts
expect(publicPage).toContain('<LiveReplayReactions cmsLiveId={replayPlayer.id} />')
expect(memberPage).toContain('<LiveReplayReactions cmsLiveId={player.cmsLiveId} />')
expect(publicPage).toContain('<LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />')
expect(memberPage).toContain('<LiveReplayReactionCounts cmsLiveId={player.cmsLiveId} />')
expect(publicPage.indexOf('<LiveReplayReactions')).toBeGreaterThan(publicPage.indexOf('<LiveReplayPlayer'))
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/components/live/LiveReplayReactions.wiring.test.ts
```

- [ ] **Step 3: Mount the component under both replay players**

Public:

```tsx
<LiveReplayReactions cmsLiveId={replayPlayer.id} />
```

Member:

```tsx
{player.cmsLiveId && (
  <LiveReplayReactions cmsLiveId={player.cmsLiveId} />
)}
```

Do not mount it for playlist-only players without `cmsLiveId`. Keep the frozen count component separate and below the new living reactions.

- [ ] **Step 4: GREEN and replay regression**

```powershell
npx vitest run src/components/live/LiveReplayReactions.wiring.test.ts src/components/live/LiveReplayReactionCounts.test.ts src/components/live/LiveReplayPlayer.layout.test.ts src/components/live/LiveReplayPlayer.wiring.test.ts
npm.cmd run type-check
```

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/live/LiveReplayReactions.wiring.test.ts "src/app/(public)/live/page.tsx" "src/app/(member)/member/dashboard/lives/page.tsx"
git commit -m "feat(live): share replay reactions across spaces"
```

---

## Task 6H — Autorisation administrative ERP

**Files:**
- Create: `src/lib/live/live-replay-reaction-admin-server.ts`
- Create: `src/lib/live/live-replay-reaction-admin-server.test.ts`
- Create: `src/app/api/admin/live/replay/reactions/route.ts`
- Create: `src/app/api/admin/live/replay/reactions/route.test.ts`

**Interfaces:**
- Produces: `listManageableReplayReactionSettings()`, `updateReplayReactionGovernance(input)`.
- `GET /api/admin/live/replay/reactions` returns only manageable lives and accessible units.
- `PATCH` accepts exact `{ cmsLiveId, enabled, organizationId, organizationUnitId }`.

- [ ] **Step 1: Write failing authorization tests**

Cover exact roles: `world_super_admin` and `world_admin` can manage global and all attached lives; `zone_admin` manages its unit and descendants; `national_admin` manages its unit and descendants; `local_admin` manages only its exact local unit. Every non-world actor receives uniform `not_found` for global or out-of-scope replays; missing real identity is forbidden; no membership is forbidden.

```ts
await expect(updateReplayReactionGovernance(globalInput, localActor))
  .resolves.toEqual({ ok: false, reason: 'not_found' })
expect(assertUnitAccess).toHaveBeenCalledWith(actor, UNIT_ID, { write: true }, expect.anything())
```

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/lib/live/live-replay-reaction-admin-server.test.ts
```

- [ ] **Step 3: Implement ERP authorization**

Call `resolveAdminActorProfile()`, then `resolveCanonicalOrganizationId()` from `src/lib/erp/resolve-canonical-organization.ts`, then `resolveActorUnitContext(..., { requireAdminRole: true })`. For attached lives call `assertUnitAccess(actor, unitId, { write: true })`. For global lives require `canManageWorldSettings(actor)`. Query the live only after scope filters are constructed; return `not_found` uniformly outside scope.

Write `cms_lives.organization_id/organization_unit_id` and upsert `live_replay_reaction_settings` with `updated_by = actor.userId`. Never modify reaction rows or counts.

- [ ] **Step 4: Write failing route tests**

Assert GET/PATCH no-store, exact body keys, same-origin PATCH, 400/403/404/429/503 mapping, and no trust in admin cookie alone.

- [ ] **Step 5: Implement route and verify GREEN**

```powershell
npx vitest run src/lib/live/live-replay-reaction-admin-server.test.ts src/app/api/admin/live/replay/reactions/route.test.ts src/lib/__tests__/lot5-routes-security.test.ts
npm.cmd run type-check
```

- [ ] **Step 6: Commit**

```powershell
git add -- src/lib/live/live-replay-reaction-admin-server.ts src/lib/live/live-replay-reaction-admin-server.test.ts src/app/api/admin/live/replay/reactions/route.ts src/app/api/admin/live/replay/reactions/route.test.ts
git commit -m "feat(admin): govern replay reactions by scope"
```

---

## Task 6I — Panneau administratif hiérarchisé

**Files:**
- Create: `src/components/features/admin/LiveReplayReactionGovernance.tsx`
- Create: `src/components/features/admin/LiveReplayReactionGovernance.test.tsx`
- Modify: `src/app/(admin)/admin/lives/page.tsx`

**Interfaces:**
- Consumes administrative GET/PATCH only.
- Produces a secure management section on the existing `/admin/lives` page.

- [ ] **Step 1: Write the failing UI test**

```ts
expect(source).toContain('Réactions des replays')
expect(source).toContain('Réactions actives')
expect(source).toContain('Portée du replay')
expect(source).toContain('/api/admin/live/replay/reactions')
expect(source).not.toContain('/api/admin/cms/lives')
```

Test that only units returned by the secured GET appear, global is selectable only when `canManageGlobal === true`, failed PATCH restores confirmed state, and no counter-edit control exists.

- [ ] **Step 2: Verify RED**

```powershell
npx vitest run src/components/features/admin/LiveReplayReactionGovernance.test.tsx
```

- [ ] **Step 3: Implement and mount the panel**

Place `<LiveReplayReactionGovernance />` on the existing page without modifying generic `CmsManager`. Each replay row exposes its title, current scope and enabled switch. The component sends one exact PATCH and shows a discreet error on failure.

- [ ] **Step 4: GREEN**

```powershell
npx vitest run src/components/features/admin/LiveReplayReactionGovernance.test.tsx src/app/api/admin/live/replay/reactions/route.test.ts
npm.cmd run type-check
```

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/features/admin/LiveReplayReactionGovernance.tsx src/components/features/admin/LiveReplayReactionGovernance.test.tsx "src/app/(admin)/admin/lives/page.tsx"
git commit -m "feat(admin): add replay reaction governance UI"
```

---

## Task 6J — Vérification locale complète et QA différée

**Files:** no intended source changes.

- [ ] **Step 1: Run focused Task 6 tests**

```powershell
npx vitest run `
  src/lib/live/live-replay-reactions.test.ts `
  src/lib/live/live-replay-reactions-migration.test.ts `
  src/lib/live/live-replay-reaction-identity.test.ts `
  src/lib/live/live-replay-reactions-server.test.ts `
  src/app/api/live/replay/reactions/route.test.ts `
  src/lib/live/live-replay-reactions-client.test.ts `
  src/components/live/LiveReplayReactions.test.tsx `
  src/components/live/LiveReplayReactions.wiring.test.ts `
  src/lib/live/live-replay-reaction-admin-server.test.ts `
  src/app/api/admin/live/replay/reactions/route.test.ts `
  src/components/features/admin/LiveReplayReactionGovernance.test.tsx
```

- [ ] **Step 2: Run frozen LIVE and ERP regressions**

```powershell
npx vitest run `
  src/components/live/LiveReplayReactionCounts.test.ts `
  src/lib/live/live-reactions-migration.test.ts `
  src/lib/live/live-reactions-rpc-migration.test.ts `
  src/app/api/live/replay/progress/route.test.ts `
  src/app/api/live/replay/notes/route.test.ts `
  src/lib/__tests__/lot5-routes-security.test.ts
```

- [ ] **Step 3: Run complete quality gates**

```powershell
npm.cmd test
npm.cmd run type-check
npm.cmd run lint
npm.cmd run build
git diff --check
git status --short
```

Expected: all commands exit 0; no tracked change remains after the task commits; `release-out/` may remain untracked and preserved.

- [ ] **Step 4: Keep database runtime QA blocked**

Without a separately authorized controlled database, report exactly:

```text
TASK6_STATIC_IMPLEMENTATION=PASS
TASK6_DATABASE_MIGRATION=DEFERRED
TASK6_GUEST_RUNTIME_QA=DEFERRED
TASK6_MEMBER_TRANSFER_QA=DEFERRED
TASK6_ADMIN_SCOPE_QA=DEFERRED
TASK6_GLOBAL=NOT_COMPLETE
DB_MUTATION=NO
PUSH=NO
DEPLOY=NO
```

- [ ] **Step 5: When a controlled database is explicitly authorized**

Run `supabase --help`, `supabase db --help`, and the exact target-identity preflight first. Verify the table is empty. Apply only the reviewed migration to that controlled target, run Supabase advisors, then test guest add/replace/remove, member transfer/member-wins, cross-page counts, disabled behavior and each ERP role. Production remains a separate authorization.

---

## Expected Commit Sequence

1. `feat(live): define replay reaction domain`
2. `feat(live): align replay reaction schema`
3. `feat(live): secure replay guest identity`
4. `feat(live): persist replay reactions safely`
5. `feat(live): expose replay reaction API`
6. `feat(live): add optimistic replay reactions`
7. `feat(live): share replay reactions across spaces`
8. `feat(admin): govern replay reactions by scope`
9. `feat(admin): add replay reaction governance UI`

## Plan Self-Review

- Spec coverage: complete for four reactions, zero counts, one-active uniqueness, guest/member identity, atomic transfer, optimistic UI, last-intent serialization, 15-second visible polling, rollback copy, both replay spaces, ERP hierarchy, enabled-by-default setting, error isolation and staged rollout.
- Schema alignment: reuses `live_replay_reactions`, keeps the historical migration unchanged, adds one corrective migration and preserves LIVE 4B.
- Security alignment: service-role server only, RLS closed, HMAC guest identity, strict origin/body validation, rate limits, non-leaking admin scope and no raw token logs.
- Type consistency: `LiveReplayReaction`, `LiveReplayReactionSnapshot`, `ReplayReactionIdentity`, public API shapes and admin API shapes are stable across tasks.
- Scope: no comments, prayer, giving, frozen LIVE 4B reaction mutation, Realtime, remote database, push or deployment work is included.
