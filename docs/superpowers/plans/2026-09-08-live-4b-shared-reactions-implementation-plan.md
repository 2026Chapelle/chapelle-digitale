# CITADELLE LIVE 4B — Shared Real-Time Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build real shared LIVE reactions with exact unique counters, durable total actions, server-enforced anti-spam, Supabase Realtime propagation, frozen replay history and aggregate admin supervision without weakening LIVE 4A.

**Architecture:** PostgreSQL remains authoritative for accepted actions and unique counts. Supabase Postgres Changes transports committed anonymous reaction events to subscribed clients; public/member clients resynchronize counts from the server. All writes remain bound server-side to canonical `youtube:<video-id>` and an authenticated member or hashed anonymous actor.

**Tech Stack:** Next.js 14.2.5, TypeScript, React, Supabase/PostgreSQL, Supabase Realtime/Postgres Changes, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-live-4b-shared-reactions-design.md`

## Global Constraints

- Exactly `prayer` 🙏 Prière, `fire` 🔥 Feu, `heart` ❤️ Amour, `praise` 🙌 Louange, `kingdom` 👑 Royaume, in that order everywhere. No sparkle reaction. Decorative icons unrelated to reactions remain outside scope.
- `reaction != presence`: never join, heartbeat, mark consent, increment presence, or invoke presence analytics from a reaction. A member or guest may react without “Je suis là”.
- Public counts are `uniqueByType`, one identity/type/live. Admin `uniqueActors` counts distinct identities across types; `totalActions` and `actionsByType` count accepted actions separately. Never sum per-type uniques to obtain total unique actors.
- Maximum three accepted actions per identity across all five types and all lives in the exact rolling interval `t - 10 seconds < s <= t`. PostgreSQL admission time after locks is authoritative. No process-memory bucket, IP identity, fingerprint or anti-Sybil promise.
- Member identity is `member:<verified uid>`; guest identity is `guest:<sha256(normalized UUID)>`. No guest/member reaction-history merge. Auth verification failure must not silently become guest. No actor identity in public JSON, events, admin displays or logs.
- Reuse canonical and `liveKeyFromState`; each POST independently derives canonical. `X-Live-Context` is only a precondition, never a destination selector. Recheck canonical after identity if more than two seconds elapsed; DB validation deadline is two seconds after the last resolution. Preserve existing canonical caches and CMS fallback.
- Four new reaction tables only; no LIVE 4A table/schema alteration. Private tables have no browser policies. The anonymous event projection alone has the explicitly approved SELECT policy for events younger than 60 seconds; browsers have no writes. All RPCs are service-role-only, `SECURITY INVOKER`, fixed search path and qualified relations.
- PostgreSQL is durable truth; Realtime is disposable experience transport. Subscribe only to Postgres Changes INSERT on `live_reaction_events`; never publish authoritative reactions from browsers. No Broadcast fallback, Realtime Presence, separate WebSocket service, Redis or new transport provider.
- No optimistic counts or particles, automatic POST retry, offline send queue, fake participants, fake metrics, seed history, percentage or ambience score. A lost POST response is uncertain even if a commit occurred.
- Loading, unavailable, stale and genuine zero are distinct. An event never increments unique counts locally. GET snapshots resynchronize truth.
- Replay uses exact CMS UUID → strict YouTube video ID → `youtube:<id>` → exact run. No title/date/index association, approximate URL match, automatic CMS replay creation, old-live backfill or new replay reactions. Finalization may materialize an internal frozen snapshot but creates no action.
- Closing requires a real public editorial replay with `is_live=false` and canonical no longer on that key. OFFLINE alone does not close. Closed runs never reopen; repeated finalization returns the identical final JSON.
- One shared controller for public/member reactions. Five fixed counters plus reserved peripheral rails, outside the iframe rectangle. Preserve 16:9, player node/src, offering, sharing, programs, reminders, and core worship continuity.
- Four simultaneous animations, twelve queued, 1,600 ms duration, four-second start TTL. Low/medium/high flow is deterministic. Hidden tab/replay/context change clears animations; reduced motion has no moving particles. No sounds, vibrations or flashes.
- Social failure never invalidates canonical, player or independent presence/share supervision. Bound network waits, catch locally, and put React boundaries around social consumers only.
- No chat, free text, names, avatars, nominative history, profiles, sermon-second replay synchronization, auth redesign or presence redesign in this project.
- Every testable change: RED → observed expected failure → minimal GREEN → focused tests → regression → diff review → scoped commit. Infrastructure failure is not functional RED. SQL/RLS/concurrency require a real authorized disposable DB, and browser behavior requires a browser.
- No implementation is authorized by this plan commit. Later source work needs its own instruction; DB test mutation, production DB application, production app deployment and editorial production mutation each need explicit applicable GO. Never infer one GO from another.
- Work only in an isolated worktree under `C:/Users/Révérend Doxa/Desktop/CITADELLE/work/<LOT>/worktrees/`; never canonical main. No shared-tree parallel work. Reports belong under that lot's `reports/`, temporary files under `tmp/`. Do not touch `release-out/`. Declare exact file scope, DB change, migration and remote mutations before each task.
- Preserve production `app.js`, `.env`, `.htaccess`, `logs`; never use `rsync --delete`. App rollback restores the previous artifact and retains reaction data. No purge, DELETE/TRUNCATE runtime privileges, destructive rollback or retention worker.
- Future production build must establish `LOCALHOST_LEAK=0`, `PLACEHOLDER_SUPABASE=0`, ref `nvyuyffywnuollaxguen`, without printing secrets. Record actual commit/build/artifact/migration identities. No unexecuted check may be marked PASS.

## Verified repository basis and execution conventions

Planning base: branch `feat/home-contextual-v1`, HEAD `9946c90ab0453d0cfa451199c911c5512849dd48`. Spec commit `1562dec13eeafa7be56b8cdb292cc491b5ca1b36` is an ancestor; SHA256 `fa9db01e1bbcb8cfdad535eea103712a078fe0f66864bd01eb25e5a3dd8c712f`. Canonical main observed at `2e6cc5be1d50c1d9c818b0656ffb5065ddeb9bbd`. Tracked worktree/staging were clean; only `release-out/` was untracked. No test, build or DB application was performed to write this plan.

Repository findings that determine implementation boundaries:

| Existing file/pattern | Consequence |
| --- | --- |
| `src/lib/live/canonical-server.ts` exports `getCanonicalLiveState()` and `liveKeyFromState(state)` | Reuse directly. Errors can already become OFFLINE through CMS fallback; do not claim stronger physical YouTube freshness. |
| `src/lib/live/live-participation-server.ts` exports UUID normalization/hash; presence merges on join/heartbeat | Import only the identity primitives, leave its business functions unchanged. |
| `src/lib/member-auth.ts` returns null on missing session and verification failure; `src/lib/supabase-server.ts` uses cookie route clients | Introduce a reaction-only fail-closed adapter; preserve the existing helper. |
| `src/lib/live/live-presence-client.ts` has the persistent guest UUID helper and separate consent helpers | Wrap storage acquisition and keep an in-memory fallback; never call consent helpers. |
| Presence/share routes use `NextRequest`, no-store responses, strict body keys and an IP Map limiter | Keep HTTP style but use bounded byte streaming and DB quota for reactions. `src/lib/rate-limit.ts` is a fixed reset bucket despite its comment. |
| `src/lib/site-url.ts` exports `SITE_URL` from configured site/app URL with official-domain fallback | Compare Origin to `new URL(SITE_URL).origin`, not untrusted Host. No reusable origin guard was identified in inspected LIVE routes. |
| `NotificationBell.tsx` imports browser `supabase`, subscribes to INSERT and removes its channel | Reuse SDK and cleanup pattern, not its notification polling intervals or sound behavior. |
| `20260602260000_realtime_notifications.sql` ignores absent publication | New migration must fail explicitly if publication is absent; never remove existing publication tables. |
| `20260907220000_live_real_presence_foundation.sql`, `20260907224000_live_presence_runtime_functions.sql` | Transactional additive migration pattern, SQL source-contract tests; their DEFINER/DELETE permissions are not copied to reactions. |
| Public `live/page.tsx` has eight local symbols, random particles, fake `title-index` replay IDs and external replay links | Replace the local social island; add real CMS ID projection in replay lot, preserve external links. |
| Member `lives/page.tsx` has two six-symbol button maps, local particles, `player: {ytId?,listId?,titre}` | Replace both maps with one common counter/control area; append `cmsLiveId?` to replay player selection. Playlist selection has no reaction history. |
| Member live page's existing `/api/activity` live_view call is independent of reactions | Preserve it without moving it to sendReaction or describing it as LIVE 4A presence. |
| Commits `734e6b0` and `9946c90` change dashboard `page.tsx`, not dashboard `lives/page.tsx` | Preserve MAINTENANT, CONTINUER and MA COMMUNAUTÉ; include their five new tests in regression. |
| `LiveAdminSupervisionData` and client `SupervisionData` are separate types; route uses admin cookie then optional verified role guard | Extend both additively, preserve legacy admin fallback and existing route. |
| `cms_lives` has UUID, URLs, status and is_live; public RLS allows scheduled/live/ended/published | Replay server uses direct no-store CMS read with explicit error distinction; no CMS schema change. |
| Vitest node environment, `@` alias, server-only/client-only stubs, co-located tests | Pure tests stay in `src/`; browser tests use existing `@playwright/test` with new focused config. No new production package needed. |
| `scripts/assert-production-env.mjs` only rejects missing/placeholders in production; `build-deploy.ps1` writes a fixed deploy directory | Add focused release verification and packaging tools with lot-scoped output. Do not blindly run old packaging or deployment scripts. |

The inspected LIVE 4A regression inventory is all tests under `src/lib/live/`, `src/app/api/live/`, `src/app/api/admin/live/`, public live page tests, admin `page.supervision.test.ts`, and `src/lib/home/youtube-live.test.ts`. This includes canonical architecture, join/heartbeat behavior, both presence migration contracts, guest crypto/storage, share success/cancellation, admin 401/403 and subsystem availability. `page.presence.test.ts` has two references to the obsolete local-reaction label; change those assertions only in Task 8 while retaining explicit presence/share assertions.

The following exact PowerShell-compatible command is the **LIVE regression command** wherever repeated below; quoted parentheses are required:

```powershell
npm test -- src/lib/live src/lib/home/youtube-live.test.ts src/app/api/live src/app/api/admin/live 'src/app/(public)/live' 'src/app/(admin)/admin/live/page.supervision.test.ts' 'src/app/(member)/member/dashboard'
```

Commands run from the task's isolated repository root. Capture RED/GREEN exit status and output in the current lot's external report directory only when implementation is authorized. Do not run `npm run db:generate` (unrelated generated file), `db:reset`, all-history DB push or production synthetic load. Each task's Create list includes its new tests; Test lists also identify tests modified in place. No unlisted file can be silently added to a task commit.

Disposable SQL testing convention: an operator explicitly authorizes and provisions PostgreSQL with database name `live4b_test`, standard roles `anon`, `authenticated`, `service_role` (BYPASSRLS), and `supabase_realtime`. The harness accepts `GO_LIVE4B_TEST_DB=1` and secret `LIVE4B_TEST_DSN` from process environment, refuses non-loopback hosts and any database other than `live4b_test`, and never prints the DSN. Use `psql` via `spawn` argument arrays, `-X -v ON_ERROR_STOP=1 -At`, SQL through stdin and connection values through child environment. No shell-built SQL or credentials in command arguments. Apply only the two reviewed reaction migrations to this pre-provisioned isolated DB. Fixtures run under explicit transactions/unique test keys; rollback failure-injection triggers. Cross-session tests require committed isolated fixtures; clean only those fixtures as the test owner, never runtime service_role, with target guards. A missing DB/psql/GO is BLOCKED, not skipped PASS and not RED. No DB is provisioned or accessed in Phase 1.

## Contract definitions shared by tasks

Task 2 owns `src/lib/live/live-reactions.ts` with these exact exported shapes (all parsers return null on malformed input):

```ts
export const REACTION_TYPES = ['prayer', 'fire', 'heart', 'praise', 'kingdom'] as const
export type ReactionType = typeof REACTION_TYPES[number]
export type ReactionCounts = Record<ReactionType, number>
export type ReactionAggregate = {
  uniqueActors: number; totalActions: number
  uniqueByType: ReactionCounts; actionsByType: ReactionCounts
}
export type ReactionEvent = {
  eventId: string; liveKey: string; reaction: ReactionType; acceptedAt: string
}
export type ReactionFailureReason = 'invalid_request' | 'identity_required' |
  'not_live' | 'live_changed' | 'closed' | 'unavailable'
export type ReactionRecordResult =
  | {ok: true; liveKey: string; event: Omit<ReactionEvent, 'liveKey'>; remaining: number}
  | {ok: false; reason: ReactionFailureReason}
  | {ok: false; reason: 'rate_limited'; retryAfterMs: number}
export type LiveReactionSnapshot =
  | {ok: true; live: true; liveKey: string; state: 'open'; uniqueByType: ReactionCounts; serverTime: string}
  | {ok: true; live: false; state: 'not_live' | 'closed'}
  | {ok: false; reason: 'unavailable'}
export type ReplayReactionSnapshot =
  | {ok: true; state: 'final'; liveKey: string; uniqueByType: ReactionCounts}
  | {ok: true; state: 'not_recorded' | 'not_final'}
  | {ok: false; reason: 'invalid_request' | 'not_found' | 'unavailable'}
export type ReactionAdminResult = {available: true} & ReactionAggregate | {available: false}
export function isReactionType(value: unknown): value is ReactionType
export function parseReactionCounts(value: unknown): ReactionCounts | null
export function parseReactionAggregate(value: unknown): ReactionAggregate | null
export function parseReactionEvent(value: unknown): ReactionEvent | null
export function parseLiveReactionSnapshot(value: unknown): LiveReactionSnapshot | null
export function parseReactionRecordResult(value: unknown): ReactionRecordResult | null
export function parseReplayReactionSnapshot(value: unknown): ReplayReactionSnapshot | null
```

Counts must be finite, nonnegative safe integers, exactly five keys; no coercion of strings/null to zero. Aggregate keys are exact; totals/actions consistency is checked, `uniqueActors >= max(uniqueByType)` and `uniqueActors <= sum(uniqueByType)`, each actions count >= its unique count. Dates must parse to finite instants, IDs have strict UUID/YouTube grammar. Parsers reconstruct allowed output properties rather than forwarding RPC objects. Database JSON remains bigint-compatible; out-of-safe-range values make server output unavailable.

### Task 1: Four-table foundation, privileges and schema contracts

**Lot:** LIVE 4B.1

**Files:**
- Create: `supabase/migrations/20260908120000_live_shared_reactions_foundation.sql`
- Create: `src/lib/live/live-reactions-migration.test.ts`
- Create: `scripts/live-reactions-db-harness.mjs`
- Create: `scripts/live-reactions-foundation.db.test.mjs`
- Modify: none
- Test: `src/lib/live/live-reactions-migration.test.ts`, `scripts/live-reactions-foundation.db.test.mjs`

**Interfaces:**
- Consumes: existing public schema, standard Supabase roles and pre-existing `supabase_realtime`; never presence rows.
- Produces: four tables, schema validation primitives `live_reaction_stats_valid(jsonb)` and `live_reaction_times_valid(timestamptz[])`, and exported test helper `sql(text, {role}?) : Promise<string>` with persistent-session `openSqlSession()` for later tests. Helpers are schema checks, not business RPCs.

- [ ] Step 1: Write failing test. Follow existing migration tests' missing-file-to-empty-string pattern. Assert exactly four CREATE TABLE statements, precise columns/domains/PK/FK/index definitions below, transaction wrapper, all ACL signatures, no private policy, one temporal event SELECT policy, publication addition, no LIVE 4A ALTER and no record/snapshot/finalize functions. Write real-role foundation tests for invalid reaction/actor/key, unordered/null/four-element times, invalid final JSON, orphan FK, browser read/write denial and temporal public event visibility.

```ts
it('creates only the four reaction tables', () => {
  const names = [...sql.matchAll(/create table(?: if not exists)? public\.(\w+)/gi)].map(m => m[1])
  expect(names).toEqual(['live_reaction_runs', 'live_reaction_actor_limits',
    'live_reaction_actor_totals', 'live_reaction_events'])
})
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reactions-migration.test.ts`. Expected failure: absent migration yields no table definitions. After approved DB harness preparation, run `node --test scripts/live-reactions-foundation.db.test.mjs` against the provisioned DB before applying foundation; expected assertion: required relation is absent. Record infrastructure prerequisites separately.
- [ ] Step 3: Implement minimal behavior. Create the proposed timestamped migration directly as requested for this project (do not apply to production). Use `BEGIN/COMMIT`. Exact schema:

```sql
-- actor_key CHECK used on both private actor tables:
-- ^(member:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|guest:[0-9a-f]{64})$
create table public.live_reaction_runs (
  live_key text primary key check (live_key ~ '^youtube:[A-Za-z0-9_-]{11}$'),
  opened_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  final_stats jsonb,
  check (isfinite(opened_at)),
  check ((closed_at is null) = (final_stats is null)),
  check (closed_at is null or (isfinite(closed_at) and closed_at >= opened_at)),
  check (final_stats is null or public.live_reaction_stats_valid(final_stats))
);
-- actor_limits: actor_key text PRIMARY KEY + domain CHECK above;
-- accepted_at timestamptz[] NOT NULL DEFAULT '{}' with times_valid CHECK;
-- updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), finite CHECK.
-- actor_totals: live_key text NOT NULL REFERENCES runs(live_key) ON DELETE RESTRICT;
-- actor_key text NOT NULL + domain CHECK; reaction text NOT NULL with exact five-value CHECK;
-- actions bigint NOT NULL CHECK(actions >= 1); first_at/last_at timestamptz NOT NULL;
-- finite timestamps CHECK; last_at >= first_at;
-- PRIMARY KEY(live_key, actor_key, reaction).
-- events: event_id uuid PRIMARY KEY DEFAULT gen_random_uuid();
-- live_key text NOT NULL REFERENCES runs(live_key) ON DELETE RESTRICT;
-- reaction text NOT NULL with exact five-value CHECK;
-- accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(), finite CHECK.
create index idx_live_reaction_totals_type
  on public.live_reaction_actor_totals (live_key, reaction) include (actions);
create index idx_live_reaction_events_time
  on public.live_reaction_events (live_key, accepted_at desc, event_id);
```

`live_reaction_stats_valid(jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp`: return false for SQL null, scalar/array, wrong key sets, missing keys, JSON null, string, negative or fractional values. Require top-level keys exactly `uniqueActors,totalActions,uniqueByType,actionsByType`, each map exactly the five types, integral JSON numbers in bigint range. Verify sum(actionsByType)=totalActions, each actions>=uniques and bounds on uniqueActors described above; permit all zeros. Guard types before numeric casts and return false on invalid numeric casts/overflow. No table access. `live_reaction_times_valid(timestamptz[])` has the same security/search-path properties; accepts only empty array or one dimension, lower bound 1, cardinality <=3, no null/infinity and nondecreasing timestamps. Equal admissions are allowed. These two schema primitives are the only functions in 4B.1; revoke EXECUTE from PUBLIC/anon/authenticated and grant service_role (table owner retains execution for maintenance).

Enable RLS on all four. First `REVOKE ALL ON TABLE ... FROM PUBLIC, anon, authenticated, service_role` for each; then grant SELECT/INSERT/UPDATE to service_role on runs/limits/totals, SELECT/INSERT on events. No DELETE/TRUNCATE/REFERENCES/TRIGGER runtime grants. Private tables: zero policies. Events alone: `GRANT SELECT ... TO anon, authenticated` and `CREATE POLICY live_reaction_events_recent_read ON public.live_reaction_events FOR SELECT TO anon, authenticated USING (accepted_at > statement_timestamp() - interval '60 seconds' AND accepted_at <= statement_timestamp())`. Four event columns only, no hidden identifying metadata. No event write policy. This narrow exception resolves “no browser policies” as no private/browser-write policies, consistent with spec §8 and approved Postgres Changes guest reception.

Publication DO block: raise `live_reactions_publication_missing` if not found in `pg_publication`; otherwise add events only if absent from `pg_publication_tables`. Do not catch undefined_object, change publication global flags or replace its existing table list. Test a missing-publication isolated transaction rolls back the migration. Harness uses node built-ins and psql only; do not install database packages.
- [ ] Step 4: Run exact GREEN commands: `npm test -- src/lib/live/live-reactions-migration.test.ts`; after GO test DB, `node scripts/live-reactions-db-harness.mjs apply-foundation` then `node --test scripts/live-reactions-foundation.db.test.mjs`. Expected: all schema/role/constraint tests pass. No production DB application in this lot.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live/live-presence-migration.test.ts src/lib/live/live-presence-rpc-migration.test.ts src/lib/__tests__/canonical-migration-security.test.ts`.
- [ ] Step 6: Inspect `git diff -- supabase/migrations/20260908120000_live_shared_reactions_foundation.sql src/lib/live/live-reactions-migration.test.ts scripts/live-reactions-db-harness.mjs scripts/live-reactions-foundation.db.test.mjs` and `git diff --check`. Confirm no business RPC in foundation.
- [ ] Step 7: Commit exact scoped files: `git add -- supabase/migrations/20260908120000_live_shared_reactions_foundation.sql src/lib/live/live-reactions-migration.test.ts scripts/live-reactions-db-harness.mjs scripts/live-reactions-foundation.db.test.mjs`; `git commit -m "feat(live): add shared reaction database foundation"`.

### Task 2: Pure reaction contracts and fail-closed server identity

**Lot:** LIVE 4B.2

**Files:**
- Create: `src/lib/live/live-reactions.ts`
- Create: `src/lib/live/live-reactions.test.ts`
- Create: `src/lib/live/live-reaction-identity-server.ts`
- Create: `src/lib/live/live-reaction-identity-server.test.ts`
- Modify: none
- Test: `src/lib/live/live-reactions.test.ts`, `src/lib/live/live-reaction-identity-server.test.ts`

**Interfaces:**
- Consumes: `getVerifiedRouteProfile`, `createRouteClient`, UUID normalization/hash primitives and server cookies.
- Produces: all shared types/parsers above plus `resolveLiveReactionActor(guestSessionId?: unknown): Promise<{ok:true; actorKey:string} | {ok:false; reason:'identity_required'|'unavailable'}>` in a `server-only` module.

- [ ] Step 1: Write failing test. Assert exact taxonomy/labels, safe integer and exact-key parsing, no leaked actor keys. Mock route auth and verified profile using `vi.hoisted`/`vi.mock`. Cover verified member without guest; normalized guest without session; invalid guest; member/guest domains distinct; presented invalid session; network auth failure; missing/mismatched verified profile; demo mode unavailable. A profile UID must equal auth.getUser UID before deriving actor.

```ts
expect(REACTION_TYPES).toEqual(['prayer', 'fire', 'heart', 'praise', 'kingdom'])
expect(parseReactionCounts({prayer: 0, fire: -1, heart: 0, praise: 0, kingdom: 0})).toBeNull()
expect(parseReactionCounts({prayer: 0, fire: Number.MAX_SAFE_INTEGER + 1,
  heart: 0, praise: 0, kingdom: 0})).toBeNull()
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reactions.test.ts src/lib/live/live-reaction-identity-server.test.ts`. Expected missing new module/export failures, not missing Vitest/dependency failures.
- [ ] Step 3: Implement minimal behavior. Pure module exports the signatures above and `REACTION_LABELS` / `REACTION_SYMBOLS` as five-key maps. Adapter uses `createRouteClient().auth.getUser()` to classify authentication, then `getVerifiedRouteProfile()` for a verified matching user. Determine presented cookie context from `cookies().getAll()` names matching `sb-<configured-ref>-auth-token` and chunk suffix `.N`, plus legacy `supabase-auth-token`; inspect names only, never print values. Normal AuthSessionMissingError without presented auth cookies and without Authorization header can use guest. Presented missing/invalid session and auth status 400/401/403 yield identity_required; retryable/5xx/network error yields unavailable. An Authorization header is not a supported alternative identity source here and prevents guest fallback on an unverified request. Verified auth with absent/mismatched profile yields unavailable. Catch cookie/client acquisition errors locally. Do not change member-auth or presence helpers. No reaction history merge.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-reactions.test.ts src/lib/live/live-reaction-identity-server.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live/live-participation-server.test.ts src/lib/live/live-share-server.test.ts src/lib/live/canonical-server.test.ts`.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-reactions.ts src/lib/live/live-reactions.test.ts src/lib/live/live-reaction-identity-server.ts src/lib/live/live-reaction-identity-server.test.ts` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-reactions.ts src/lib/live/live-reactions.test.ts src/lib/live/live-reaction-identity-server.ts src/lib/live/live-reaction-identity-server.test.ts`; `git commit -m "feat(live): define reaction contracts and verified actors"`.

### Task 3: Atomic admission, exact rolling quota and frozen finalization

**Lot:** LIVE 4B.2

**Files:**
- Create: `supabase/migrations/20260908123000_live_shared_reactions_runtime_functions.sql`
- Create: `src/lib/live/live-reactions-rpc-migration.test.ts`
- Create: `scripts/live-reactions-engine.db.test.mjs`
- Modify: `scripts/live-reactions-db-harness.mjs`
- Test: `src/lib/live/live-reactions-rpc-migration.test.ts`, `scripts/live-reactions-engine.db.test.mjs`

**Interfaces:**
- Consumes: foundation tables and schema validators; psql multi-session harness.
- Produces: `live_reaction_record(text,text,text,timestamptz) RETURNS jsonb`, `live_reaction_snapshot(text) RETURNS jsonb`, `live_reaction_admin_counts(text) RETURNS jsonb`, `live_reaction_finalize(text) RETURNS jsonb`, and pure private SQL helper `live_reaction_window(timestamptz[],timestamptz) RETURNS timestamptz[]`.

RPC parameter names are exactly `p_live_key`, `p_actor_key`, `p_reaction`, `p_validation_expires_at`; single-key functions take `p_live_key`. Record JSON is `ReactionRecordResult` (no actor). Snapshot DB JSON is `{state:'open'|'closed',liveKey,stats:ReactionAggregate,serverTime}`; admin JSON is the aggregate only; finalize JSON is `{state:'final',liveKey,stats:ReactionAggregate}` or `{state:'not_recorded'}`. SQL invalid domains raise an exception; wrapper prevalidates inputs. Expired validation raises `validation_expired`, mapped unavailable, with rollback. Closed and rate_limited are normal rejections.

- [ ] Step 1: Write failing test. Contract test asserts five signatures, INVOKER, explicit revokes/grants, shared run then actor lock order, `clock_timestamp` after locks, `lock_timeout`, UPSERT increment and finalization. Real DB tests enumerate: one actor sequential in one process; twenty concurrent independent sessions same actor (three accepted, seventeen rate_limited); two simulated tabs using the same guest key; different actors parallel; mixed types; quota across keys; fourth rejection; expiry/retry; duplicate type one unique/two actions; rejected action/event/accepted_at unchanged; timeout/deadlock rollback; expired deadline after actor lock; run closure versus held accepted transaction; concurrent idempotent finalizers; failure on event insert and failure on final snapshot update fully rollback.

```sql
-- Boundary test calls the same pure SQL helper used by record, no RPC clock override.
select public.live_reaction_window(
  array['2026-09-08T12:00:00Z'::timestamptz], '2026-09-08T12:00:09.999Z');
-- expect one retained timestamp
select public.live_reaction_window(
  array['2026-09-08T12:00:00Z'::timestamptz], '2026-09-08T12:00:10Z');
-- expect empty array
```

For true concurrency use separate persistent psql sessions and a shared future start instant/barrier; pre-open the run to measure normal admission without cold insert contention. Also test simultaneous first creation. Session A holds the actor row, B calls record; release A after the deadline but before the one-second lock timeout using a short deadline fixture; assert B rolls back. Hold a successful record's transaction open, start finalize in B, then commit A; final stats include A. Reverse order: finalize holds exclusive lock, record follows and returns closed after release. Trigger-based failure injection exists only in the isolated test transaction. Reconcile `sum(actions) = count(events)` per run and type. Real expiry test waits beyond earliest admission+10 seconds, then admits again; boundary helper tests distinguish 9,999/10,000 ms deterministically.
- [ ] Step 2: Run exact RED commands: `npm test -- src/lib/live/live-reactions-rpc-migration.test.ts`; after GO test DB with foundation applied, `node --test scripts/live-reactions-engine.db.test.mjs`. Expected absent runtime SQL/RPC signature; baseline SQL connectivity must succeed first.
- [ ] Step 3: Implement minimal behavior in runtime migration, not foundation. Every function is INVOKER, `SET search_path = pg_catalog, public, pg_temp`, relation-qualified, revoked from PUBLIC/anon/authenticated and granted only service_role. Set local lock_timeout='1s' before any record lock/insert. Record algorithm:

```sql
-- Inside one PL/pgSQL call, after strict input checks:
-- INSERT run ON CONFLICT DO NOTHING; SELECT run FOR SHARE; reject closed.
-- INSERT actor_limits ON CONFLICT DO NOTHING; SELECT actor_limits FOR UPDATE.
-- v_t := clock_timestamp(); reject if v_t > p_validation_expires_at.
-- v_kept := public.live_reaction_window(accepted_at, v_t);
-- cardinality(v_kept)=3 => rate_limited, max(1,ceil(milliseconds(v_kept[1]+10s-v_t))).
-- Otherwise append v_t; update limit row; UPSERT actor/type total actions + 1;
-- INSERT exactly one event RETURNING event_id; return committed-action candidate JSON.
```

`live_reaction_window` uses `unnest ... WITH ORDINALITY`, filters `s > p_time - interval '10 seconds' AND s <= p_time`, returns ordered array with empty-array COALESCE. It is not exposed as a browser function. Normal rejected requests modify no action/event/quota timestamps. Wrap admission work in a PL/pgSQL sub-block so exceptions roll back newly created run/limit too. If rate-limited on a previously absent run, raise a private caught exception within that sub-block and return the captured failure outside; this prevents an unaccepted POST from manufacturing a known zero run. Never reopen closed keys.

Totals use PK UPSERT `actions = public.live_reaction_actor_totals.actions + 1, last_at = excluded.last_at`. No global counter write. Admin counts reads totals in one statement: five FILTER counts and sums plus COUNT(DISTINCT actor_key). Build all five zero keys only on successful SQL aggregation. Snapshot creates a run for a server-confirmed LIVE, takes a compatible run lock, then reads aggregate and DB clock in one coherent statement; never creates an actor. A closed run returns final_stats, not live counts. Finalize does not INSERT runs: select existing run FOR UPDATE; absent→not_recorded; already closed→stored JSON; otherwise a distinct subsequent aggregation statement under READ COMMITTED sees commits preceding lock acquisition, then atomically updates closed_at/final_stats. Runtime migration is transactional. Add harness `apply-runtime` command limited to its exact file.
- [ ] Step 4: Run exact GREEN commands: `npm test -- src/lib/live/live-reactions-rpc-migration.test.ts`; after GO test DB, `node scripts/live-reactions-db-harness.mjs apply-runtime` then `node --test scripts/live-reactions-engine.db.test.mjs`. No mocked concurrency proof accepted.
- [ ] Step 5: Run regression commands: `npm test -- src/lib/live/live-reactions-migration.test.ts src/lib/live/live-presence-rpc-migration.test.ts`; `node --test scripts/live-reactions-foundation.db.test.mjs` on the authorized test DB.
- [ ] Step 6: Inspect `git diff -- supabase/migrations/20260908123000_live_shared_reactions_runtime_functions.sql src/lib/live/live-reactions-rpc-migration.test.ts scripts/live-reactions-engine.db.test.mjs scripts/live-reactions-db-harness.mjs` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- supabase/migrations/20260908123000_live_shared_reactions_runtime_functions.sql src/lib/live/live-reactions-rpc-migration.test.ts scripts/live-reactions-engine.db.test.mjs scripts/live-reactions-db-harness.mjs`; `git commit -m "feat(live): enforce transactional shared reaction semantics"`.

### Task 4: Canonical-bound server admission and snapshots

**Lot:** LIVE 4B.2

**Files:**
- Create: `src/lib/live/live-reactions-server.ts`
- Create: `src/lib/live/live-reactions-server.test.ts`
- Modify: none
- Test: `src/lib/live/live-reactions-server.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3, canonical helpers, `supabaseAdmin.rpc`.
- Produces: `recordLiveReaction(input: {reaction:unknown; guestSessionId?:unknown; expectedLiveKey:string}): Promise<ReactionRecordResult>`, `getLiveReactionSnapshot(): Promise<LiveReactionSnapshot>`, `getLiveReactionAdminAggregate(liveKey:string): Promise<ReactionAdminResult>`; replay export is added in Task 10.

- [ ] Step 1: Write failing test with mocked canonical, identity and RPC builders supporting abortSignal. Cover invalid reaction before canonical; OFFLINE/UPCOMING/bad video before auth/DB; valid mismatched context→live_changed; identity denied; canonical recheck after >2 seconds; deadline exact last resolution+2 seconds; RPC closed/429; no presence/share calls; malformed/unsafe numeric DB payload→unavailable; rejected/throwing/hung RPC; successful zero snapshot; no actor for GET; admin uses supplied key without resolving another live.

```ts
it('does not write when the displayed context is stale', async () => {
  mocks.canonical.mockResolvedValue({status: 'LIVE', youtubeVideoId: 'ABCDEFGHIJK'})
  expect(await recordLiveReaction({reaction: 'fire', expectedLiveKey: 'youtube:LMNOPQRSTUV'}))
    .toEqual({ok: false, reason: 'live_changed'})
  expect(mocks.rpc).not.toHaveBeenCalled()
})
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reactions-server.test.ts`. Expected absent server module/functions.
- [ ] Step 3: Implement minimal behavior. Mark server-only. Validate input, get canonical/key, compare context, resolve actor, re-resolve if identity work exceeded two seconds and compare again. Generate deadline, then one RPC only for record. Internal helper `callReactionRpc(name, args): Promise<unknown>` uses AbortController, `rpc(...).abortSignal(signal)`, two-second timeout, cleared in finally; all errors normalized without SQL/body logging. A timeout means unavailable/possibly committed, never automatic retry. Enforce strict expected liveKey/event/reaction/remaining 0..2 in responses. Public snapshot projects uniques/serverTime only. Admin returns aggregate and catches locally; absence of a run with no totals may legitimately aggregate zero during confirmed live, but a failed SQL read may not. Validate counts before JSON serialization; do not reuse presence's coercion-to-zero function.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-reactions-server.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live src/lib/home/youtube-live.test.ts src/app/api/live/canonical`.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-reactions-server.ts src/lib/live/live-reactions-server.test.ts` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-reactions-server.ts src/lib/live/live-reactions-server.test.ts`; `git commit -m "feat(live): bind reaction engine to canonical and verified actors"`.

### Task 5: Public no-store GET/POST reaction API

**Lot:** LIVE 4B.3

**Files:**
- Create: `src/app/api/live/reactions/route.ts`
- Create: `src/app/api/live/reactions/route.test.ts`
- Create: `src/app/api/live/reactions/route.architecture.test.ts`
- Create: `src/lib/live/live-reaction-request.ts`
- Create: `src/lib/live/live-reaction-request.test.ts`
- Modify: none
- Test: `src/app/api/live/reactions/route.test.ts`, `src/app/api/live/reactions/route.architecture.test.ts`, `src/lib/live/live-reaction-request.test.ts`

**Interfaces:**
- Consumes: server engine, `SITE_URL`, shared parsers.
- Produces: GET and POST `/api/live/reactions`; internal `parseReactionRequest(req:NextRequest): Promise<{ok:true; reaction:ReactionType; guestSessionId?:string; expectedLiveKey:string} | {ok:false; status:number; reason:string}>` and `reactionJson(body:unknown,status?:number,headers?:Record<string,string>):NextResponse` from request helper.

- [ ] Step 1: Write failing test via NextRequest, mocked engine and a ReadableStream body. Test each row of the HTTP matrix below, exactly 1,024 bytes accepted, 1,025 bytes rejected even without Content-Length, multibyte UTF-8 size, early reader cancellation, malformed JSON/nonobject/array, unknown live_key/user_id/hash keys, five types, invalid guest type, missing/duplicate/malformed context, origin null/malformed/foreign, cross-site fetch metadata, GET live selector rejected, and no-store on every exit. Architecture test requires route→engine, no table queries, rateLimit/clientIp, auth props or direct RPC.

```ts
const req = new NextRequest('https://citadelle.chapelleduroyaume.org/api/live/reactions', {
  method: 'POST', headers: {'Origin': 'https://citadelle.chapelleduroyaume.org',
    'Content-Type': 'application/json', 'X-Live-Context': 'youtube:ABCDEFGHIJK'},
  body: JSON.stringify({reaction: 'fire', live_key: 'youtube:LMNOPQRSTUV'})
})
expect((await POST(req)).status).toBe(400)
expect(mocks.record).not.toHaveBeenCalled()
```

| Condition | HTTP / body |
| --- | --- |
| GET confirmed open | 200 `LiveReactionSnapshot` open with only uniqueByType, liveKey, serverTime |
| GET offline/closed | 200 live:false, state:not_live/closed, no counts |
| GET unknown query key | 400 invalid_request; no selection by live key |
| POST accepted | 200 `ReactionRecordResult` success; no stats or identity |
| malformed input / missing guest identity | 400 invalid_request / identity_required |
| origin not allowed | 403 forbidden_origin |
| not live / changed / closed | 409 not_live / live_changed / closed |
| body too large | 413 body_too_large |
| non-JSON Content-Type | 415 unsupported_media_type |
| missing X-Live-Context | 428 context_required |
| DB quota exhausted | 429 rate_limited, retryAfterMs; Retry-After ceiling milliseconds/1,000 |
| failed dependency or unrecognized engine result | 503 unavailable, no fabricated figures |

- [ ] Step 2: Run exact RED command: `npm test -- src/app/api/live/reactions/route.test.ts src/app/api/live/reactions/route.architecture.test.ts src/lib/live/live-reaction-request.test.ts`. Expected route/helper absent.
- [ ] Step 3: Implement minimal behavior. Export runtime=nodejs, dynamic=force-dynamic. Use JSON response helper with no-store in all paths. POST checks Origin equality with configured `SITE_URL` origin; reject missing or `null` Origin and `Sec-Fetch-Site: cross-site`, not local Host-derived allowlists. Local browser tests configure SITE_URL to their loopback app origin. Accept `application/json` with optional charset only. Read bytes from request.body reader, stop/cancel above 1,024, TextDecoder fatal UTF-8, parse strict object and allowed keys. Require exactly one canonical-form context header; comma-joined duplicates fail regex. Pass expectedLiveKey as precondition to engine only. Map errors using the matrix, not generic 400. GET ignores no selectors: reject nonempty query, return engine projection. Do not modify old presence/share APIs.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/app/api/live/reactions/route.test.ts src/app/api/live/reactions/route.architecture.test.ts src/lib/live/live-reaction-request.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/app/api/live src/app/api/admin/live src/lib/live/live-reactions-server.test.ts`.
- [ ] Step 6: Inspect `git diff -- src/app/api/live/reactions src/lib/live/live-reaction-request.ts src/lib/live/live-reaction-request.test.ts` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/app/api/live/reactions/route.ts src/app/api/live/reactions/route.test.ts src/app/api/live/reactions/route.architecture.test.ts src/lib/live/live-reaction-request.ts src/lib/live/live-reaction-request.test.ts`; `git commit -m "feat(live): expose canonical reaction API with strict request gates"`.

### Task 6: Confirmed client requests, shared guest identity and context state

**Lot:** LIVE 4B.4

**Files:**
- Create: `src/lib/live/live-reactions-client.ts`
- Create: `src/lib/live/live-reactions-client.test.ts`
- Modify: none
- Test: `src/lib/live/live-reactions-client.test.ts`

**Interfaces:**
- Consumes: public contracts and `getOrCreateGuestSessionId` with injected fetch/crypto/storage.
- Produces: `requestReactionSnapshot(fetcher?:typeof fetch,signal?:AbortSignal):Promise<LiveReactionSnapshot>`, `requestLiveReaction(input:{reaction:ReactionType;guestSessionId?:string;expectedLiveKey:string},fetcher?:typeof fetch,signal?:AbortSignal):Promise<ReactionRecordResult>`, `createReactionGuestIdentity(deps:{getStorage:()=>LivePresenceStorage;cryptoApi:LivePresenceCrypto}):{get:()=>string|undefined;adopt:(event:{key:string|null;newValue:string|null})=>void}`, and `createReactionController(deps:ReactionControllerDeps):ReactionController`.

```ts
export type ReactionClientState = {
  context: 'loading'|'open'|'not_live'|'closed'|'unavailable'
  send: 'idle'|'pending'|'rate_limited'|'uncertain'
  transport: 'connecting'|'subscribed'|'degraded'
  liveKey: string|null; uniqueByType: ReactionCounts|null
  stale: boolean; retryUntil: number|null
}
export type ReactionControllerDeps = {
  fetcher: typeof fetch; now: ()=>number; wallNow: ()=>number
  guestId: ()=>string|undefined
  onState: (state:ReactionClientState)=>void
  onEvent: (event:ReactionEvent)=>void
  onClock: (sample:{serverTime:string;sentWall:number;receivedWall:number;receivedMono:number})=>void
  onReset: ()=>void
}
export type ReactionController = {
  setContext(videoId:string|null,enabled:boolean):void
  refresh():Promise<void>; send(reaction:ReactionType):Promise<void>
  receive(event:ReactionEvent):void
  transport(status:'connecting'|'subscribed'|'degraded'):void
  dispose():void
}
```

- [ ] Step 1: Write failing test with fake timers and injected deferred fetch. Assert null initial counts; successful GET context must match displayed video; body only reaction/guest UUID, context header; POST exactly once on network loss; uncertain state; 429 countdown; GET single flight/coalescing; event never increments unique count; lower same-run snapshot ignored and marked stale; old-generation GET/POST ignored after switch; UUID reused per tab/send, reread storage before each send, storage event adoption, getter/getItem/setItem/crypto failures isolated. No calls to join/heartbeat/consent.

```ts
const outgoing: RequestInit[] = []
const fetcher = async (_url: RequestInfo | URL, init?: RequestInit) => {
  outgoing.push(init!); throw new TypeError('response lost')
}
expect(await requestLiveReaction({reaction:'fire',expectedLiveKey:'youtube:ABCDEFGHIJK'}, fetcher))
  .toEqual({ok:false,reason:'unavailable'})
expect(outgoing).toHaveLength(1)
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reactions-client.test.ts`. Expected module absent.
- [ ] Step 3: Implement minimal behavior. Requests have same-origin credentials/no-store and no retry. Wrap window.localStorage acquisition itself. Identity wrapper passes the existing UUID helper a storage facade whose failed reads return the in-memory UUID and whose writes update memory; re-read actual storage every get so another tab's established UUID wins. Normalize adopted storage event IDs; removal does not generate per-click identities. If UUID generation fails, omit guest ID so a server-verified member still works and guest receives identity_required.

Controller uses one AbortController/generation per context, a separate abort for in-flight POST, one GET in flight and one dirty bit. Successful snapshot records server time/RTT. Events (local committed POST or transport) only mark dirty and deliver onEvent; GET starts no more often than every 2,000 ms under events, with one trailing refresh if dirty. Visible idle polling is 15,000 ms. On SUBSCRIBED reset animations and refresh. On 409 reset/refresh; on unavailable snapshot suspend sending and mark prior counts stale. Transport failure alone preserves API sending. No POST stats. A monotonic `retryUntil` controls UI feedback; do not treat remaining as admission authority. Hide/switch/dispose clears timers, aborts pending work, resets state/queues; stale promises cannot restore old context. GET timeout 2,000 ms; browser POST timeout 4,000 ms, classified uncertain (not proof of rollback). All new timers are disposed.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-reactions-client.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live/live-reactions.test.ts src/lib/live/live-presence-client.test.ts src/lib/live/live-share-client.test.ts src/app/api/live/reactions`.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-reactions-client.ts src/lib/live/live-reactions-client.test.ts` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-reactions-client.ts src/lib/live/live-reactions-client.test.ts`; `git commit -m "feat(live): add confirmed reaction client and snapshot resync"`.

### Task 7: INSERT-only subscription, event validation and deduplication

**Lot:** LIVE 4B.4

**Files:**
- Create: `src/lib/live/live-reactions-realtime.ts`
- Create: `src/lib/live/live-reactions-realtime.test.ts`
- Create: `src/lib/live/live-reactions-realtime.architecture.test.ts`
- Modify: `src/lib/live/live-reactions-client.ts`, `src/lib/live/live-reactions-client.test.ts`
- Test: `src/lib/live/live-reactions-realtime.test.ts`, `src/lib/live/live-reactions-realtime.architecture.test.ts`, `src/lib/live/live-reactions-client.test.ts`

**Interfaces:**
- Consumes: injected browser Supabase client, active server-confirmed liveKey, controller callbacks.
- Produces: `subscribeLiveReactionEvents(client:Pick<SupabaseClient,'channel'|'removeChannel'>,liveKey:string,onEvent:(e:ReactionEvent)=>void,onStatus:(s:'connecting'|'subscribed'|'degraded')=>void):()=>void`; `createReactionDedupe(now:()=>number):{accept:(e:ReactionEvent)=>boolean;clear:()=>void}`.

- [ ] Step 1: Write failing test with a fake SDK channel capturing on/subscribe callbacks. Assert exact schema/table/event/filter, ignore UPDATE/DELETE/Broadcast/wrong schema/table/key/unknown reaction/bad UUID/date/private extra columns. Event row must contain exactly four projection fields. Assert a POST event then same WS event animates once, reversed order also once; 512 cap, 60-second retention, generation teardown, reconnect one channel, removeChannel invoked once; rejection after canonical change. Event age/start TTL belongs to scheduler and is tested there; expired dedupe entries never permit stale particles.

```ts
expect(channel.on).toHaveBeenCalledWith('postgres_changes', {
  event:'INSERT', schema:'public', table:'live_reaction_events',
  filter:'live_key=eq.youtube:ABCDEFGHIJK'
}, expect.any(Function))
expect(client.removeChannel).toHaveBeenCalledWith(channel)
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reactions-realtime.test.ts src/lib/live/live-reactions-realtime.architecture.test.ts src/lib/live/live-reactions-client.test.ts`. Expected missing subscription/dedupe behavior.
- [ ] Step 3: Implement minimal behavior with `client.channel('live-reactions:'+liveKey).on('postgres_changes', {event:'INSERT',schema:'public',table:'live_reaction_events',filter:'live_key=eq.'+liveKey}, handler).subscribe(statusHandler)`. Validate envelope schema/table/eventType and exact new row shape, map snake_case to ReactionEvent, reconstruct sanitized values. No `.send`, `.track`, `.insert`, Broadcast handler or private-table query. Degraded on CHANNEL_ERROR/TIMED_OUT/CLOSED, SDK reconnect remains in charge; SUBSCRIBED invokes controller resync. Cleanup guards callbacks immediately and removes channel with caught asynchronous rejection. Controller owns dedupe shared between local POST and WS, evicts oldest at 512 and entries >=60 seconds old; clear on context/reconnect/reset. A replay is never passed to this subscription. Production readiness is conditional on Task 16 publication/permission proof plus Task 18 two-browser delivery, not this mock test.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-reactions-realtime.test.ts src/lib/live/live-reactions-realtime.architecture.test.ts src/lib/live/live-reactions-client.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live src/app/api/live/reactions`.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-reactions-realtime.ts src/lib/live/live-reactions-realtime.test.ts src/lib/live/live-reactions-realtime.architecture.test.ts src/lib/live/live-reactions-client.ts src/lib/live/live-reactions-client.test.ts` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-reactions-realtime.ts src/lib/live/live-reactions-realtime.test.ts src/lib/live/live-reactions-realtime.architecture.test.ts src/lib/live/live-reactions-client.ts src/lib/live/live-reactions-client.test.ts`; `git commit -m "feat(live): receive committed reactions through Postgres Changes"`.

The publication/SELECT/RLS requirements and subscription filter syntax were checked against [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Shared run locks and exclusive closing locks follow [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html). These references establish API/lock behavior, not the current production configuration.

### Task 8: One shared public/member social island with bounded animations

**Lot:** LIVE 4B.5

**Files:**
- Create: `src/components/live/LiveReactionsProvider.tsx`
- Create: `src/components/live/LiveReactionControls.tsx`
- Create: `src/components/live/LiveReactionAnimationLayer.tsx`
- Create: `src/components/live/LiveReactionBoundary.tsx`
- Create: `src/components/live/LiveReactions.integration.test.ts`
- Create: `src/lib/live/live-reaction-animation.ts`
- Create: `src/lib/live/live-reaction-animation.test.ts`
- Modify: `src/app/(public)/live/page.tsx`, `src/app/(member)/member/dashboard/lives/page.tsx`, `src/app/(public)/live/page.presence.test.ts`
- Test: `src/components/live/LiveReactions.integration.test.ts`, `src/lib/live/live-reaction-animation.test.ts`, `src/app/(public)/live/page.presence.test.ts`

**Interfaces:**
- Consumes: controller, browser supabase and subscription from Tasks 6–7.
- Produces: `LiveReactionsProvider({videoId:string|null,enabled:boolean,children:ReactNode})`, `useLiveReactions():{state:ReactionClientState;send:(r:ReactionType)=>Promise<void>;animations:VisibleReaction[]}`, default exports `LiveReactionControls()`, `LiveReactionAnimationLayer()`, `LiveReactionBoundary({children:ReactNode})`.

Provider always renders children independently of social readiness and never encloses them in its error boundary. The page/player/canonical remain above social state; controls and rail each have their own boundary inside a stable provider. Provider catches effect/controller failures into unavailable and renders children unchanged. No `key` tied to live reaction state on player/provider. State changes update consumers, not player identity.

```ts
export type VisibleReaction = {event:ReactionEvent;rail:0|1;startedAt:number;endsAt:number}
export type ReactionAnimationScheduler = {
  sampleClock(sample:{serverTime:string;sentWall:number;receivedWall:number;receivedMono:number}):void
  enqueue(event:ReactionEvent):void
  tick():VisibleReaction[]
  setMode(mode:{visible:boolean;enabled:boolean;reducedMotion:boolean}):void
  clear():void
  inspect():{queued:number;active:number;load:number;regime:'low'|'medium'|'high'}
}
export function createReactionAnimationScheduler(now:()=>number):ReactionAnimationScheduler
```

- [ ] Step 1: Write failing source integration tests for one provider and controls on each page, no old local sendReaction/random/list state, no duplicate member bar, presence still before controls, five accessible labels, no presence imports in new reaction components, boundary placement leaving iframe outside boundary and stable. Update the two obsolete label assertions in page.presence.test.ts to locate `<LiveReactionControls` after existing presence and confirm shared copy; preserve all other assertions. Write deterministic basic scheduler tests: only real confirmed events with reliable clock; <=12 queue/4 active; oldest drop and four-second expiry; clear/dispose behavior and reduced motion.

```ts
expect(publicPage.indexOf('<LiveReactionControls')).toBeGreaterThan(
  publicPage.indexOf('<LivePresenceControls liveVideoId={liveYt} />'))
expect(memberPage.match(/<LiveReactionControls\b/g)).toHaveLength(1)
expect(memberPage).not.toContain('REACTIONS_LIVE')
```

- [ ] Step 2: Run exact RED command: `npm test -- src/components/live/LiveReactions.integration.test.ts src/lib/live/live-reaction-animation.test.ts 'src/app/(public)/live/page.presence.test.ts'`. Expected missing shared components/scheduler and old local-only UI present.
- [ ] Step 3: Implement minimal behavior. Mount one stable provider per page, passing `videoId=liveYt` public and `liveYtId` member. Public enabled only live tab/current video; member only live tab/current video and `player===null`. Provider binds storage/visibility/media-query listeners after mount, creates one controller, subscribes only after matching open GET; initializes Supabase in an effect with caught failure. Snapshot error suspends sends but never clears live page data. Unsubscribe on hidden/replay/switch, resume fresh snapshot then subscription on visible. State `uniqueByType=null` renders loading/unavailable text, genuine zero renders 0 only after successful snapshot.

Controls use exact taxonomy in a five-column grid with 44px minimum targets, type=button, French aria-labels/focus-visible. Render “Réagir ensemble”, “Une fois par compte ou identité visiteur, pour chaque réaction”, discrete confirmed/pending feedback, “Réaction non confirmée”, “Réactions momentanément indisponibles”, and “Un instant, tu pourras réagir à nouveau dans N s”. Only send/quota feedback is aria-live polite. No selected state implies unique physical people or presence. POST pending suspends UI send, DB still enforces quota across tabs. Show stale label for retained old snapshots. No counter changes on a click or WS event.

Replace public local island; preserve explicit presence and share success functions. Replace both member maps with one common island inside Famille Royale, preserve CMS/activity/reminders/programmes/share. Animation layer uses two reserved rails outside iframe wrapper, below video on small screens; `pointer-events:none`, `aria-hidden=true`. Never absolute overlay across iframe rectangle. Basic scheduler implements low-flow FIFO 400ms, 1,600ms duration, twelve/four limits and exact clock/TTL/hidden/reduced-motion protections; Task 9 changes flow under measured load. Hash rail with unsigned rolling hash `h=(31*h+charCode)>>>0`, `h%2`. It animates only accepted/deduped events. No dependencies added, no replay changes yet.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/components/live/LiveReactions.integration.test.ts src/lib/live/live-reaction-animation.test.ts 'src/app/(public)/live/page.presence.test.ts'`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live src/lib/home/youtube-live.test.ts src/app/api/live src/app/api/admin/live 'src/app/(public)/live' 'src/app/(admin)/admin/live/page.supervision.test.ts' 'src/app/(member)/member/dashboard'`; `npm run type-check`. Browser proof is additionally required in Task 13, not claimed by source tests.
- [ ] Step 6: Inspect `git diff -- src/components/live src/lib/live/live-reaction-animation.ts src/lib/live/live-reaction-animation.test.ts 'src/app/(public)/live/page.tsx' 'src/app/(member)/member/dashboard/lives/page.tsx' 'src/app/(public)/live/page.presence.test.ts'` and `git diff --check`. Dashboard root file must remain unchanged.
- [ ] Step 7: Commit exact scoped files: `git add -- src/components/live/LiveReactionsProvider.tsx src/components/live/LiveReactionControls.tsx src/components/live/LiveReactionAnimationLayer.tsx src/components/live/LiveReactionBoundary.tsx src/components/live/LiveReactions.integration.test.ts src/lib/live/live-reaction-animation.ts src/lib/live/live-reaction-animation.test.ts 'src/app/(public)/live/page.tsx' 'src/app/(member)/member/dashboard/lives/page.tsx' 'src/app/(public)/live/page.presence.test.ts'`; `git commit -m "feat(live): share confirmed reaction controls across live surfaces"`.

### Task 9: Deterministic adaptive animation flow

**Lot:** LIVE 4B.6

**Files:**
- Create: none
- Modify: `src/lib/live/live-reaction-animation.ts`, `src/lib/live/live-reaction-animation.test.ts`
- Test: `src/lib/live/live-reaction-animation.test.ts`

**Interfaces:**
- Consumes/Produces: unchanged scheduler interface from Task 8; load regimes become adaptive.

- [ ] Step 1: Write failing fake-timer tests for loads 10/11/40/41, starts every 400/800/1,200 ms, ten bucket expiration, saturation, newest real event under high load, queue cap under 10,000 arrivals, active<=4, start TTL 3,999/4,000 ms, 1,600ms lifetime, future event >2 seconds rejected, missing/stale/slow-RTT clock, hidden/replay return without backlog, reduced-motion dynamic change, stable two-rail hash and no synthetic event or xN.

```ts
vi.useFakeTimers()
const scheduler = createReactionAnimationScheduler(() => performance.now())
scheduler.sampleClock({serverTime:'2026-09-08T12:00:00Z', sentWall:0,
  receivedWall:100, receivedMono:performance.now()})
// Fixture factory in this test returns distinct valid UUID events, accepted at this sample's DB time.
for (const event of fortyOneRealFixtureEvents) scheduler.enqueue(event)
expect(scheduler.inspect()).toMatchObject({queued:12,regime:'high'})
expect(scheduler.tick()).toHaveLength(1)
expect(scheduler.inspect().queued).toBe(0)
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reaction-animation.test.ts`. Expected low-only implementation does not slow medium/high flow or discard old burst entries.
- [ ] Step 3: Implement minimal behavior. Ten buckets indexed by `floor(now()/1000)%10`, each storing epoch and count capped at 41; sum capped at 41. Each validated deduped event received contributes before animation sampling. Expire buckets not in current preceding ten one-second epochs. Sum<=10 low (400ms), <=40 medium (800ms), else high (1,200ms). Enqueue FIFO <=12, drop oldest first. Before start remove expired active nodes and stale queued events; if four active, wait. At most one start per tick, `now-lastStart >= interval`. Low/medium shift oldest; high take newest eligible and clear rest. Duration 1,600ms. Use a single 50ms provider tick, no per-event timeout. Timing approximation is only animation scheduling, not DB admission.

Clock sample valid only for RTT<2,000ms; anchor estimated server time at receipt as parsed serverTime+RTT/2 and advance with monotonic delta. This implements offset serverTime minus client midpoint without following later wall-clock jumps. Sample expires at age>=60,000ms. Reject acceptedAt >estimatedServerNow+2,000ms; defer mildly future events until their time, discard age>=4,000ms; no valid clock means clear visible animation work and request resync through provider's existing onClock/refresh path. Hidden/disabled/reduced motion clears queue/active/load; reduced motion retains controller counts/buttons without moving DOM. No catch-up burst after visibility or preference change.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-reaction-animation.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live/live-reactions-client.test.ts src/lib/live/live-reactions-realtime.test.ts src/components/live/LiveReactions.integration.test.ts`; `npm run type-check`.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-reaction-animation.ts src/lib/live/live-reaction-animation.test.ts` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-reaction-animation.ts src/lib/live/live-reaction-animation.test.ts`; `git commit -m "feat(live): adapt real reaction animations to burst traffic"`.

### Task 10: Exact CMS replay resolution and read-only frozen snapshot API

**Lot:** LIVE 4B.7

**Files:**
- Create: `src/lib/live/live-reaction-replay.ts`
- Create: `src/lib/live/live-reaction-replay.test.ts`
- Create: `src/lib/live/live-reactions-replay-server.test.ts`
- Create: `src/app/api/live/reactions/replay/route.ts`
- Create: `src/app/api/live/reactions/replay/route.test.ts`
- Modify: `src/lib/live/live-reactions-server.ts`
- Test: `src/lib/live/live-reaction-replay.test.ts`, `src/lib/live/live-reactions-replay-server.test.ts`, `src/app/api/live/reactions/replay/route.test.ts`

**Interfaces:**
- Consumes: Task 3 finalize RPC, direct `supabaseCmsRead` CMS lookup and canonical; shared replay response.
- Produces: `parseReactionYouTubeId(value:unknown):string|null`; `getReplayReactionSnapshot(cmsLiveId:string):Promise<ReplayReactionSnapshot>` exported from server engine; GET `/api/live/reactions/replay?cmsLiveId=<UUID>`.

- [ ] Step 1: Write failing parser tests for raw eleven-character ID and HTTPS/http watch/embed/live/shorts/youtu.be, extra query order, deceptive suffix host, credentials/port, playlist-only, missing/duplicate v, trailing unrelated path, hosted MP4, empty/malformed input. Server tests: UUID validation; CMS error!=missing row; draft/nonreplay/is_live true→not_found; youtube_url takes priority over video_url; invalid nonempty primary does not switch arbitrarily; no run→not_recorded; known zero→final zeros; same-key active→not_final/no finalize; A replay during B live→A finalize; canonical exception→unavailable/no finalize; finalize error→unavailable; duplicate CMS rows for same video→same stats; closed snapshots stable.

```ts
expect(parseReactionYouTubeId('https://youtube.com.attacker.invalid/watch?v=ABCDEFGHIJK')).toBeNull()
expect(parseReactionYouTubeId('https://www.youtube.com/watch?list=PLabc&v=ABCDEFGHIJK'))
  .toBe('ABCDEFGHIJK')
expect(parseReactionYouTubeId('https://www.youtube.com/playlist?list=PLabc')).toBeNull()
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-reaction-replay.test.ts src/lib/live/live-reactions-replay-server.test.ts src/app/api/live/reactions/replay/route.test.ts`. Expected missing parser/engine export/route.
- [ ] Step 3: Implement minimal behavior. URL parser uses URL class and exact allowed hostname set `youtube.com,www.youtube.com,m.youtube.com,youtu.be`, http/https only, no credentials or nondefault port. youtu.be path is exactly /ID; other hosts exact /watch with one v, or /embed/ID,/live/ID,/shorts/ID with optional final slash; strict 11-character ID, no fetching URL. Query parameters other than v do not select a run. Server queries `supabaseCmsRead.from('cms_lives').select('id,youtube_url,video_url,status,is_live').eq('id',cmsLiveId).maybeSingle()` with two-second timeout; errors unavailable, no row/nonpublic/nonreplay 404. Require ended/published and is_live=false. Use youtube_url if nonempty, otherwise video_url if strict YouTube. Resolve canonical before finalize; same key active→not_final; thrown dependency→unavailable. Canonical's existing OFFLINE fallback limitation remains documented; editorial replay assertion is also required. Call finalize with exact key, never snapshot (which creates a run). Public projection excludes total actions. GET no-store/nodejs/dynamic; one cmsLiveId UUID query only, 400 malformed, 404 not_found, 503 unavailable, normal states 200. No POST replay export, no new CMS write.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-reaction-replay.test.ts src/lib/live/live-reactions-replay-server.test.ts src/app/api/live/reactions/replay/route.test.ts`.
- [ ] Step 5: Run regression commands: `npm test -- src/lib/live src/app/api/live/reactions`; after GO test DB `node --test scripts/live-reactions-engine.db.test.mjs` to retain closure race/idempotency proof.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-reaction-replay.ts src/lib/live/live-reaction-replay.test.ts src/lib/live/live-reactions-replay-server.test.ts src/lib/live/live-reactions-server.ts src/app/api/live/reactions/replay` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-reaction-replay.ts src/lib/live/live-reaction-replay.test.ts src/lib/live/live-reactions-replay-server.test.ts src/lib/live/live-reactions-server.ts src/app/api/live/reactions/replay/route.ts src/app/api/live/reactions/replay/route.test.ts`; `git commit -m "feat(live): resolve frozen replay reactions by exact YouTube identity"`.

### Task 11: Frozen replay counts on existing public/member surfaces

**Lot:** LIVE 4B.7

**Files:**
- Create: `src/components/live/LiveReplayReactionCounts.tsx`
- Create: `src/components/live/LiveReplayReactionCounts.test.ts`
- Create: `src/lib/live/live-reaction-replay-client.ts`
- Create: `src/lib/live/live-reaction-replay-client.test.ts`
- Modify: `src/app/(public)/live/page.tsx`, `src/app/(member)/member/dashboard/lives/page.tsx`
- Test: `src/components/live/LiveReplayReactionCounts.test.ts`, `src/lib/live/live-reaction-replay-client.test.ts`

**Interfaces:**
- Consumes: replay GET and CMS UUID.
- Produces: `requestReplayReactionSnapshot(cmsLiveId:string,fetcher?:typeof fetch,signal?:AbortSignal):Promise<ReplayReactionSnapshot>`; default `LiveReplayReactionCounts({cmsLiveId:string})`.

- [ ] Step 1: Write failing client tests for exact encoded cmsLiveId only, no POST/channel, normal not_recorded vs genuine zero, invalid/failed response, switch abort/generation. Source tests require public select includes id and replay.id=d.id, no title-index association; member player carries cmsLiveId on replay card opens but not playlist opens; stats outside iframe; no send controls or subscription in replay component.

```ts
expect(publicPage).toContain('id: d.id')
expect(publicPage).not.toContain("id: `${d.title || 'replay'}-${i}`")
expect(replayComponent).not.toContain('LiveReactionControls')
expect(replayComponent).not.toContain('subscribeLiveReactionEvents')
```

- [ ] Step 2: Run exact RED command: `npm test -- src/components/live/LiveReplayReactionCounts.test.ts src/lib/live/live-reaction-replay-client.test.ts`. Expected absent replay UI/request and old fabricated public IDs.
- [ ] Step 3: Implement minimal behavior. Public CMS select adds id, Replay keeps real UUID, map uses d.id without title/index fallback; reject malformed/missing UUID rows from reaction-history display. Show component below each replay card (outside anchor interactive content if necessary by a stable card wrapper); external YouTube link behavior remains. Only mount/fetch while replay view visible; use IntersectionObserver in component to fetch once when in view, avoiding fetching all archive cards at once. No polling final snapshots; failed fetch offers a read-only retry. Public latestReplay may reuse component only when explicitly in replay presentation, not an active-live counter.

Member extends player type with cmsLiveId?, replay selection sets replay.id, playlist selection leaves it absent. Place history below modal video, do not wait for it before opening the iframe. Member live provider stays disabled while player modal exists. Component displays loading, final five uniques, “Réactions non enregistrées pour ce culte”, “Statistiques non finalisées” or unavailable; zero only from final response. Controller timeout two seconds; abort on unmount/change; no replay reaction buttons. Preserve reminders, ShareButtons, programs and root dashboard unchanged.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/components/live/LiveReplayReactionCounts.test.ts src/lib/live/live-reaction-replay-client.test.ts`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live src/components/live 'src/app/(public)/live' 'src/app/(member)/member/dashboard'`; `npm run type-check`.
- [ ] Step 6: Inspect `git diff -- src/components/live/LiveReplayReactionCounts.tsx src/components/live/LiveReplayReactionCounts.test.ts src/lib/live/live-reaction-replay-client.ts src/lib/live/live-reaction-replay-client.test.ts 'src/app/(public)/live/page.tsx' 'src/app/(member)/member/dashboard/lives/page.tsx'` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- src/components/live/LiveReplayReactionCounts.tsx src/components/live/LiveReplayReactionCounts.test.ts src/lib/live/live-reaction-replay-client.ts src/lib/live/live-reaction-replay-client.test.ts 'src/app/(public)/live/page.tsx' 'src/app/(member)/member/dashboard/lives/page.tsx'`; `git commit -m "feat(live): display read-only reaction history for exact CMS replays"`.

### Task 12: Additive aggregate admin supervision

**Lot:** LIVE 4B.8

**Files:**
- Create: none
- Modify: `src/lib/live/live-admin-supervision-server.ts`, `src/lib/live/live-admin-supervision-server.test.ts`, `src/components/admin/live/LiveAdminSupervision.tsx`, `src/app/api/admin/live/supervision/route.test.ts`, `src/app/(admin)/admin/live/page.supervision.test.ts`
- Test: `src/lib/live/live-admin-supervision-server.test.ts`, `src/app/api/admin/live/supervision/route.test.ts`, `src/app/(admin)/admin/live/page.supervision.test.ts`

**Interfaces:**
- Consumes: `getLiveReactionAdminAggregate(liveKey)` and existing canonical/presence/shares.
- Produces: additive `reactions: ReactionAdminResult|null` in server `LiveAdminSupervisionData` and client `SupervisionData`, existing endpoint unchanged.

- [ ] Step 1: Write failing behavior tests for live aggregate, DB failure, thrown reaction reader, offline null, genuine zero and wrong/unsafe counts. Update full expected objects by adding reactions only, retain every existing assertion. Fixture one actor across two types has uniqueActors=1, sum uniqueByType=2, totalActions=3. Route tests retain legacy no-profile admin success, 401/403 before aggregate reads, no identity leakage and no-store success/error. UI test requires separate uniques/actions columns, global totals, exact five rows and reaction-only unavailable text while presence/shares still render.

```ts
expect(result.reactions).toEqual({available:false})
expect(result.presence).toMatchObject({available:true,activeTotal:31})
expect(result.shares).toMatchObject({available:true,totalActions:7})
expect(mocks.reactionAggregate).toHaveBeenCalledWith('youtube:ABCDEFGHIJK')
```

- [ ] Step 2: Run exact RED command: `npm test -- src/lib/live/live-admin-supervision-server.test.ts src/app/api/admin/live/supervision/route.test.ts 'src/app/(admin)/admin/live/page.supervision.test.ts'`. Expected missing reactions field/section.
- [ ] Step 3: Implement minimal behavior. Resolve key once as already done; call reaction aggregate with that exact key, protect with local catch returning available:false. Keep presence liveKey mismatch check, share counts, admin auth and endpoint no-store unchanged. OFFLINE returns reactions:null. Extend duplicated client type with safe pure type import; no runtime server import. Render “Réactions du direct”, “Identités uniques”, “Actions acceptées”, and five ordered rows with distinct columns. No avatars, names, raw IDs or last-event actor history. Genuine zero visible only available:true; unavailable does not replace entire supervision screen. Existing 15-second poll retained. No admin RPC writes or automatic run closure.
- [ ] Step 4: Run exact GREEN command: `npm test -- src/lib/live/live-admin-supervision-server.test.ts src/app/api/admin/live/supervision/route.test.ts 'src/app/(admin)/admin/live/page.supervision.test.ts'`.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live src/app/api/live src/app/api/admin/live 'src/app/(admin)/admin/live'`; `npm run type-check`.
- [ ] Step 6: Inspect `git diff -- src/lib/live/live-admin-supervision-server.ts src/lib/live/live-admin-supervision-server.test.ts src/components/admin/live/LiveAdminSupervision.tsx src/app/api/admin/live/supervision/route.test.ts 'src/app/(admin)/admin/live/page.supervision.test.ts'` and `git diff --check`. `src/lib/admin-auth.ts` and route implementation unchanged.
- [ ] Step 7: Commit exact scoped files: `git add -- src/lib/live/live-admin-supervision-server.ts src/lib/live/live-admin-supervision-server.test.ts src/components/admin/live/LiveAdminSupervision.tsx src/app/api/admin/live/supervision/route.test.ts 'src/app/(admin)/admin/live/page.supervision.test.ts'`; `git commit -m "feat(live): supervise unique reactions and accepted actions separately"`.

### Task 13: Browser resilience, lifecycle and accessibility proof

**Lot:** LIVE 4B.9

**Files:**
- Create: `playwright.live-reactions.config.ts`
- Create: `test/live-reactions/browser-fixtures.ts`
- Create: `test/live-reactions/live-reactions.spec.ts`
- Create: `src/lib/live/live-reactions-resilience.test.ts`
- Modify: none initially; a demonstrated source defect requires an exact scoped amendment to this task before its RED/GREEN fix, never an unrelated repair.
- Test: `test/live-reactions/live-reactions.spec.ts`, `src/lib/live/live-reactions-resilience.test.ts`

**Interfaces:**
- Consumes: implemented client/controller, real rendered public/member pages, existing Playwright dependency.
- Produces: executable local browser gate and lifecycle fault-injection coverage; no test-only production endpoint/flag.

- [ ] Step 1: Write failing test. Browser config accepts `LIVE4B_BROWSER_BASE_URL` only on loopback, `LIVE4B_ARTIFACT_ROOT` only under authorized lot reports/tmp, starts no server itself, uses testDir `test/live-reactions`, one worker, Chromium desktop and 390x844 mobile project, tracing on failure without cookies/tokens in report. Fixture intercepts canonical, CMS public REST and reaction HTTP only on local app; all reaction fixtures clearly test-only. Member route requires an operator-provided test-member storageState path under lot tmp or a real local login; do not simulate auth by production middleware changes. Missing browser/member state is a blocked gate. Player is an existing iframe; test routes its local-test request to a deterministic video document so node identity and playback progress are observable, while true YouTube proof remains Task 18.

Browser cases: both surfaces five 44px buttons with French labels, keyboard activation/focus, pending then confirmed particle, no optimistic increment, 429 feedback, no presence join/heartbeat on guest reaction, API error/invalid JSON/abort, transport loss plus polling, reconnect resync, canonical A→B→OFFLINE drops delayed old GET/POST/events, replay/playlist suspends live controller, hosted player unchanged, guest UUID shared across pages, root member surfaces intact. Inject throwing onEvent/onState/storage getter in pure controller tests and assert local recovery, zero unhandled rejection and disposal after 100 mount/switch/unmount cycles. Real Realtime multi-client proof is Task 14, not mocked by this fixture.

```ts
const iframe = page.locator('iframe').first()
const original = await iframe.elementHandle()
const src = await iframe.getAttribute('src')
await page.route('**/api/live/reactions', route => route.fulfill({status:503,
  contentType:'application/json',body:'{"ok":false,"reason":"unavailable"}'}))
await page.getByRole('button',{name:'Feu',exact:true}).click()
expect(await iframe.evaluate((node, old) => node === old, original)).toBe(true)
await expect(iframe).toHaveAttribute('src', src!)
```

Assert iframe bounding box does not intersect any animation node/rail, native fullscreen controls remain reachable, reduced-motion produces zero moving nodes, visibility return never replays old queue, and no count/transport state changes iframe key/src. Observe canonical request count continuing during failures; compare fixture playback time before/after social failure.
- [ ] Step 2: Run exact RED commands: `npm test -- src/lib/live/live-reactions-resilience.test.ts`; `npx --no-install playwright test --config=playwright.live-reactions.config.ts`. This is a cross-cutting proof task: tests may already pass if earlier responsibilities were fulfilled. To demonstrate expected behavioral RED without breaking implemented code, run the new browser suite against an independently authorized local server from accepted base `9946c90` in its own isolated worktree; missing shared counters and unconfirmed local particles must fail the assertions. Point the same `LIVE4B_BROWSER_BASE_URL` at that baseline server only for RED. Record tested commit with every run. Do not claim setup failure as RED and do not revert current source.
- [ ] Step 3: Implement minimal behavior. Complete browser fixtures and pure fault-injection assertions, run against current app, and examine any real failures. Earlier tasks own production behavior; if a failure needs a fix, first name exact files here and commit its failing test separately from unrelated work, then implement the smallest correction and repeat RED/GREEN. No speculative production changes just to make this proof task larger. Fixture state never enters DB or release bundles.
- [ ] Step 4: Run exact GREEN commands against current implementation: `npm test -- src/lib/live/live-reactions-resilience.test.ts`; `npx --no-install playwright test --config=playwright.live-reactions.config.ts`. Record all browser projects/versions and fixture-vs-real limits. No baseline failure can substitute for GREEN here.
- [ ] Step 5: Run regression command: `npm test -- src/lib/live src/lib/home/youtube-live.test.ts src/app/api/live src/app/api/admin/live 'src/app/(public)/live' 'src/app/(admin)/admin/live/page.supervision.test.ts' 'src/app/(member)/member/dashboard'`; `npm run type-check`.
- [ ] Step 6: Inspect `git diff -- playwright.live-reactions.config.ts test/live-reactions/browser-fixtures.ts test/live-reactions/live-reactions.spec.ts src/lib/live/live-reactions-resilience.test.ts` and `git diff --check`. Test output stays outside repo/release-out.
- [ ] Step 7: Commit exact scoped files: `git add -- playwright.live-reactions.config.ts test/live-reactions/browser-fixtures.ts test/live-reactions/live-reactions.spec.ts src/lib/live/live-reactions-resilience.test.ts`; `git commit -m "test(live): prove browser reaction isolation and lifecycle cleanup"`.

### Task 14: Real-role Realtime and measurable concurrency/load gates

**Lot:** LIVE 4B.9

**Files:**
- Create: `scripts/live-reactions-load.mjs`
- Create: `scripts/live-reactions-load.test.mjs`
- Create: `scripts/live-reactions-realtime.db.test.mjs`
- Modify: none
- Test: `scripts/live-reactions-load.test.mjs`, `scripts/live-reactions-realtime.db.test.mjs`, existing foundation/engine DB suites

**Interfaces:**
- Consumes: explicitly authorized isolated Supabase test project/local stack with Realtime, test app, test member/guest sessions, API and DB functions.
- Produces: CLI `node scripts/live-reactions-load.mjs --scenario low|medium|burst` and pure `validateLoadTarget(config)` / `summarizeMeasurements(samples)` exported for node:test; real Supabase public-role security/transport suite.

- [ ] Step 1: Write failing test for safety gate rejecting production ref/domain, absent test GO, mismatched configured ref, unauthorized URL and unknown scenario; summary calculations for p95/p99 and missing samples must fail closed. Real-role suite asserts anon/authenticated cannot write four tables or execute five runtime functions/two schema primitives, cannot read three private tables, can read only recent sanitized events, forged Broadcast never animates, committed action reaches two subscribed clients while aborted transaction does not, WS reconnect changes no DB totals. Test fixtures use actual Supabase SDK and tokens belonging only to the authorized test target.

```js
assert.throws(() => validateLoadTarget({go:false,ref:'nvyuyffywnuollaxguen'}))
assert.throws(() => validateLoadTarget({go:true,ref:'nvyuyffywnuollaxguen'}))
assert.equal(summarizeMeasurements([100,200,300,400]).p95,400)
```

- [ ] Step 2: Run exact RED command: `node --test scripts/live-reactions-load.test.mjs`. Expected missing validator/summarizer, then negative assertions fail before guard implementation. The real DB suite's forbidden-operation assertions are regression security proofs of Tasks 1/3; do not intentionally loosen production ACL to obtain RED.
- [ ] Step 3: Implement minimal behavior. Guard `GO_LIVE4B_LOAD_TEST=1`, separately supplied `LIVE4B_TEST_PROJECT_REF`, app URL and Supabase URL matching authorized test manifest, reject `nvyuyffywnuollaxguen` and production app host even with GO. Test project setup is a distinct authorized operation; no production workload. Use enough independent fixture identities so rate limit remains respected, log aggregates/durations only. Load profiles: 100 subscribers/5 actions per second for 600s; 500/30 for 600s; 100/s for 30s. Browser contexts observe actual rendering for a sample of subscribers; SDK-only spectators measure fan-out but not browser CPU. All producers use test API, not direct totals inserts, with Origin and canonical context. Pause between waves as identity windows require.

Measure POST p95<800ms/p99<2s excluding external network acquisition, remote event/animation p95<2s at low load, snapshot convergence<3s with WS and<17s polling-only. Report request rate, rejection/lock error rate, WS lag, aggregate reconciliation by type, latency sample size, actual quotas, event/table bytes before/after via `pg_total_relation_size`, EXPLAIN ANALYZE aggregate plan under test. Browser sample: <=4 animation nodes, <=12 queued, <=512 dedupe, no timer/channel growth after 100 lifecycle cycles. No globally serialized actor lock; distinct actors continue while another actor is locked. Re-run exact rolling and close-race DB suites during a parallel test-client workload.

Run failure scenarios by stopping only test Realtime, intercepting API responses, and injecting DB event-write failure inside authorized test isolation. Verify canonical route stays responsive and browser iframe continues. Once restored, counts converge without double uniqueness or fake zero fallback. No automatic quota widening/alternate public Broadcast if targets fail; block release with measured bottleneck. Document observed storage growth and N/15 idle, N/2 busy polling plus actions×subscribers fan-out; sampling reduces animations only. No retention or purge added.
- [ ] Step 4: Run exact GREEN commands: `node --test scripts/live-reactions-load.test.mjs`; with explicit test authorization `node --test scripts/live-reactions-realtime.db.test.mjs`; `node scripts/live-reactions-load.mjs --scenario low`; `node scripts/live-reactions-load.mjs --scenario medium`; `node scripts/live-reactions-load.mjs --scenario burst`. Each writes only aggregate evidence under lot reports; failures exit nonzero. Missing quota/target/permissions is BLOCKED, not synthetic success.
- [ ] Step 5: Run regression commands: `node --test scripts/live-reactions-foundation.db.test.mjs scripts/live-reactions-engine.db.test.mjs`; `npm test -- src/lib/live src/app/api/live src/components/live`; `npx --no-install playwright test --config=playwright.live-reactions.config.ts`.
- [ ] Step 6: Inspect `git diff -- scripts/live-reactions-load.mjs scripts/live-reactions-load.test.mjs scripts/live-reactions-realtime.db.test.mjs` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- scripts/live-reactions-load.mjs scripts/live-reactions-load.test.mjs scripts/live-reactions-realtime.db.test.mjs`; `git commit -m "test(live): measure reaction concurrency security and fan-out"`.

### Task 15: Release guards, read-only observation and reviewable runbook

**Lot:** LIVE 4B.10

**Files:**
- Create: `scripts/live-reactions-release.mjs`
- Create: `scripts/live-reactions-release.test.mjs`
- Create: `scripts/live-reactions-observe.mjs`
- Create: `scripts/live-reactions-observe.test.mjs`
- Create: `docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md`
- Modify: none
- Test: `scripts/live-reactions-release.test.mjs`, `scripts/live-reactions-observe.test.mjs`

**Interfaces:**
- Consumes: existing `scripts/assert-production-env.mjs`, future actual build/commit and exact two reaction migrations.
- Produces: release CLI commands `verify-env`, `verify-build`, `package`, `verify-db`, `verify-evidence`; observer CLI `watch`; runbook with separately unchecked DB, app, CMS and E2E operational gates. These scripts do not deploy or apply migrations.

- [ ] Step 1: Write failing node:test fixtures. Environment gate rejects localhost/127.0.0.1/::1, placeholder values, demo mode, wrong project ref; outputs flags only. Build gate requires real BUILD_ID/standalone server, same commit recorded in manifest, scans built text assets for localhost Supabase URLs/placeholders, verifies no service key value appears in browser chunks without printing it. Packaging requires output below lot tmp and excludes app.js/.env/.htaccess/logs/release-out; rejects outside paths/symlinks. DB verifier fails absent publication/INSERT support, private reaction tables published, wrong ACL, non-temporal/additional policy and wrong migration version. Evidence verifier rejects missing criterion number, FAIL/NOT_RUN, script-produced reaction source or missing real video/commit/build identity. Observer tests fail any non-GET app request and any SQL outside the hardcoded SELECT catalog/aggregate allowlist.

```js
assert.throws(() => verifyEvidence({criteria:[],reactionSource:'synthetic'}))
assert.throws(() => verifyReleaseEnvironment({url:'http://localhost:54321',demo:false}))
assert.throws(() => validateObservationRequest({method:'POST',path:'/api/live/reactions'}))
```

- [ ] Step 2: Run exact RED command: `node --test scripts/live-reactions-release.test.mjs scripts/live-reactions-observe.test.mjs`. Expected missing gates and observer restrictions.
- [ ] Step 3: Implement minimal behavior with node built-ins and the existing Supabase SDK only. Export the four functions shown in snippets plus `verifyBuild`, `verifyDatabaseCatalog`, `packageRelease` for tests. `verify-env` requires production ref `nvyuyffywnuollaxguen`, real public URL/key, demo disabled and no placeholder/service-key leakage; do not log secrets. `verify-build` scans `.next` text artifacts with precise URL patterns, checks BUILD_ID and standalone traced path as generated in this worktree, emits `LOCALHOST_LEAK=0`, `PLACEHOLDER_SUPABASE=0` only on measured zero matches. Copy only runtime payload into lot tmp with safe resolved path checks; exclude operational files, test fixtures, browser sessions and synthetic data. Package manifest contains commit, BUILD_ID, migration filenames/SHA256, payload checksum and previous approved artifact identifier. No fixed deploy-citadelle or release-out writes.

`verify-db` is read-only via dedicated operator-provisioned read-only PG connection (credentials in environment, never printed). Query pg_publication/pubinsert, pg_publication_tables, pg_policies, pg_class.relrowsecurity, information_schema.columns, function signatures/prosecdef/proconfig, has_table_privilege/has_function_privilege and supabase_migrations.schema_migrations. Verify expected private-table revokes, service grants, anonymous event SELECT-only, exact four event columns and temporal policy; preserve/check pre-existing published table baseline. Refuse global FOR ALL TABLES publication that would include private reaction data. Check schema checks/indexes via pg_get_constraintdef/pg_get_indexdef. Catalog proof cannot replace browser delivery.

`watch` accepts exact observer target approved in runbook and polls GET canonical/reactions/admin supervision every 2s while visible observation session runs. Replay GET can materialize finalization and is excluded from passive observer; only humans open replay after CMS authorization. Admin credentials are supplied securely, never printed/stored in report. SQL SELECT only counts/aggregates/catalog, no actor values. Observer may compare presence rows before/after with server-side actor predicate without exposing identities in evidence; the connection must be read-only. No browser page.evaluate POST, APIRequestContext POST, seed or hidden “warmup” reaction. Evidence JSON lives under lot reports and includes criteria 1..21, timestamps, human actor labels A/B (no personal names), accepted event UUIDs, aggregate snapshots, roles, build and explicit GO references. Missing data remains NOT_RUN, never auto-filled PASS.

Runbook is procedural documentation, not a substitute for external evidence: copy Tasks 16–18 gates, exact migration names/hashes obtained from artifacts and selected verified deployment target. Operational target connection alias/root/previous artifact are mandatory operator inputs validated before action, never guessed from old scripts. No new deployment automation or credentials in this document.
- [ ] Step 4: Run exact GREEN command: `node --test scripts/live-reactions-release.test.mjs scripts/live-reactions-observe.test.mjs`.
- [ ] Step 5: Run regression command: `node --test scripts/assert-production-env.test.mjs scripts/live-reactions-load.test.mjs`; `npm test -- src/lib/live src/app/api/live src/app/api/admin/live src/components/live`; `npm run type-check`.
- [ ] Step 6: Inspect `git diff -- scripts/live-reactions-release.mjs scripts/live-reactions-release.test.mjs scripts/live-reactions-observe.mjs scripts/live-reactions-observe.test.mjs docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` and `git diff --check`.
- [ ] Step 7: Commit exact scoped files: `git add -- scripts/live-reactions-release.mjs scripts/live-reactions-release.test.mjs scripts/live-reactions-observe.mjs scripts/live-reactions-observe.test.mjs docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md`; `git commit -m "chore(live): prepare guarded reaction release and human E2E observation"`.

### Task 16: Separately authorized production DB application and publication proof

**Lot:** LIVE 4B.10

**Files:**
- Create: none in repository; operational evidence only under `C:/Users/Révérend Doxa/Desktop/CITADELLE/work/LIVE-4B-RELEASE/reports/`
- Modify: `docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` (gate checkboxes and evidence references only)
- Test: `scripts/live-reactions-release.test.mjs`; live catalog gate `node scripts/live-reactions-release.mjs verify-db`

**Interfaces:**
- Consumes: reviewed exact migration artifacts/hashes, passed isolated DB/role/load gates, explicit **GO DB PRODUCTION** for project `nvyuyffywnuollaxguen` and these two migrations only.
- Produces: applied schema/version and publication/permissions evidence. App is not deployed by this task.

- [ ] Step 1: Write failing test in operational form: add unchecked runbook assertions for both migration versions, all four tables, all function ACLs, INSERT publication and no private-table publication. The validator and its failing fixtures already exist from Task 15; no production code change here. Keep production DB application blocked until exact GO and catalog baseline are reviewed.
- [ ] Step 2: Run exact RED commands: `node --test scripts/live-reactions-release.test.mjs`; `node scripts/live-reactions-release.mjs verify-db`. Unit suite must pass; pre-application catalog gate is expected to fail for absent LIVE 4B relations/versions, not authentication/network failure. If schema is unexpectedly already present, stop to reconcile authorized history rather than reapply it blindly.
- [ ] Step 3: Implement minimal operational responsibility only after GO DB PRODUCTION. Select authenticated Supabase migration facility, verify project ref read-only, preview exact SQL plus checksum for `20260908120000_live_shared_reactions_foundation.sql` and `20260908123000_live_shared_reactions_runtime_functions.sql`, and apply each once with migration history. For CLI, discover installed version/help then use `supabase db push --linked --dry-run` as a preview only; if its pending list includes any unrelated migration, do not push. Prefer Supabase `apply_migration` with reviewed name and exact SQL for the two artifacts when that authenticated tool is available. Do not execute a guessed CLI flag or unscoped historical push. Operator selection of available migration facility is an explicit infrastructure input at this GO, not permission to change migration contents. Missing publication is a hard failure, not ignored. Do not create synthetic reaction rows for verification. Retain existing publication members.
- [ ] Step 4: Run exact GREEN command: `node scripts/live-reactions-release.mjs verify-db`. Require schema constraints/indexes/ACL/search_path/INVOKER, event SELECT policy, all private revokes and both applied migration hashes/version records to match. Realtime still not declared end-to-end ready until human Task 18.
- [ ] Step 5: Run regression commands: `node --test scripts/live-reactions-release.test.mjs`; `node scripts/live-reactions-observe.mjs watch` for public canonical/admin presence/share read-only baseline. Verify unchanged LIVE 4A migrations/tables/permissions and original publication members. Stop observation after baseline; no scripted reactions.
- [ ] Step 6: Inspect `git diff -- docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` and `git diff --check`; external evidence contains aggregate/catelog facts only, no secrets or actor history.
- [ ] Step 7: Commit exact scoped file: `git add -- docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md`; `git commit -m "docs(live): record approved reaction schema release gate"`. A failed/blocked gate is recorded externally and this success commit is not made.

### Task 17: Separately authorized app build, production release and rollback readiness

**Lot:** LIVE 4B.10

**Files:**
- Create: no source files; build/package/evidence under authorized release lot tmp/reports
- Modify: `docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` (deployment gate references only)
- Test: `scripts/live-reactions-release.test.mjs`, build artifact verification and existing regression suites

**Interfaces:**
- Consumes: Task 16 success, exact reviewed source commit, previous validated app artifact, operator-selected verified deployment connection/root; a distinct **GO APP PRODUCTION** tied to the reviewed new artifact checksum.
- Produces: actual new app build deployed to approved target, unchanged LIVE 4A continuity, actual artifact identity and rollback path. DB GO alone never authorizes this step.

- [ ] Step 1: Write failing gate: runbook requires the new release manifest/BUILD_ID/commit/checksum and zero leakage flags plus target readback. Existing Task 15 fixture tests prove rejection of stale/missing builds. Before app GO prepare the complete reviewable artifact and rollback instructions; do not request approval for an unspecified build.
- [ ] Step 2: Run exact RED command: `node scripts/live-reactions-release.mjs verify-build`. Expected failure for missing candidate build manifest or wrong source/build identity; never mark a production dependency/network failure as behavioral RED. Do not treat old LIVE 4A BUILD_ID as the new artifact.
- [ ] Step 3: Implement minimal operational responsibility. In authorized release worktree with production-safe environment, run `node scripts/live-reactions-release.mjs verify-env`, `npm run build`, `node scripts/live-reactions-release.mjs verify-build`, `node scripts/live-reactions-release.mjs package`. All temporary output stays under release lot tmp except Next's required worktree build output. Verify standalone runtime dependencies for the target Linux host and correct traced app path, static/public assets, no fixtures/secrets in payload and exact checksum. Inspect existing production startup contract read-only and preserve app.js/.env/.htaccess/logs. Record current artifact as rollback candidate without modifying it.

Present artifact checksum, source commit, BUILD_ID, migration gate and exact operational target for **GO APP PRODUCTION**. After that separate GO, use the operator-approved existing release transfer/activation procedure scoped to payload files only; no rsync --delete, no environment overwrite, no canonical main edit, no unapproved Git push. Activation must preserve current startup entrypoint and use the established process restart mechanism. If target/root/process manager differs from reviewed runbook, stop for target reconciliation instead of inventing SSH commands. App rollback restores the saved previous payload through the same approved mechanism; tables/events/final stats remain. DB reversal requires separate review/GO, never app rollback side effect.
- [ ] Step 4: Run exact GREEN commands: `node scripts/live-reactions-release.mjs verify-build`; `node scripts/live-reactions-release.mjs verify-db`; `node scripts/live-reactions-observe.mjs watch`. Read back deployed BUILD_ID/static asset identity from the approved host and compare to packaged manifest, then stop observer after health confirmation. Smoke /live, /member/dashboard/lives, root member dashboard, /api/live/canonical and admin supervision in real browsers; no reaction clicks scripted.
- [ ] Step 5: Run regression command on the exact build source before deployment: `npm test -- src/lib/live src/lib/home/youtube-live.test.ts src/app/api/live src/app/api/admin/live 'src/app/(public)/live' 'src/app/(admin)/admin/live/page.supervision.test.ts' 'src/app/(member)/member/dashboard'`; `npm run type-check`; `node --test scripts/assert-production-env.test.mjs scripts/live-reactions-release.test.mjs scripts/live-reactions-observe.test.mjs`. Require local browser suite already passed on same source. Do not run synthetic production load.
- [ ] Step 6: Inspect `git diff -- docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` and `git diff --check`; artifact ref/BUILD_ID are actual observations, not the later documentation-only commit. Verify canonical main unchanged, no new unexpected worktrees/files, no release-out mutation.
- [ ] Step 7: Commit exact scoped file: `git add -- docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md`; `git commit -m "docs(live): record approved shared reaction app release"`. Do not Git push without a separate instruction.

### Task 18: True human multi-browser YouTube Live acceptance

**Lot:** LIVE 4B.10

**Files:**
- Create: no repository files; `C:/Users/Révérend Doxa/Desktop/CITADELLE/work/LIVE-4B-RELEASE/reports/live-4b-production-e2e.json` and privacy-safe screenshots/observations during authorized execution
- Modify: `docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` (acceptance checklist and external evidence reference)
- Test: acceptance criteria 1–21 below; `scripts/live-reactions-release.mjs verify-evidence`

**Interfaces:**
- Consumes: exact deployed artifact, real new YouTube Live operated by authorized human, browser A authenticated member, B fresh guest storage, distinct admin view, separate authorized editorial replay publication and read-only DB observation.
- Produces: all 21 observed acceptance criteria, supplementary browser/security proof, no synthetic production reaction.

- [ ] Step 1: Write failing acceptance record in external reports with all criteria NOT_RUN, actual source/build/target slots populated from Task 17. Each criterion requires time, observed result, evidence reference and actor A/B/admin label only. No pre-populated PASS, fake actor, synthetic request or seed. Human operator starts/stops YouTube and clicks reaction buttons; scripts only observe. Use at least one public and one member live surface across participants; guest B stays on /live.
- [ ] Step 2: Run exact RED command: `node scripts/live-reactions-release.mjs verify-evidence`. Expected fail: NOT_RUN/missing human evidence, not a claimed application defect. This is an operational acceptance gate; behavioral test RED/GREEN was proved in earlier lots, and production is never deliberately broken to create RED.
- [ ] Step 3: Perform the following exact human sequence. It is the full mapping of spec §29, not a substitute checklist. Start with a new video/run so expected counts 1/2 are genuine. Pause if unplanned real audience reactions make exact expectations ambiguous; reconcile facts rather than editing counters. All success actions are human button clicks, never browser-less POSTs or automation-generated clicks.

| §29 criterion | Human action and required observed evidence | Implementation tasks |
| --- | --- | --- |
| 1 | Start actual YouTube broadcast. Observe canonical automatically LIVE, exact video ID and elapsed time; no browser-mocked canonical. | 4, 5, 18 |
| 2 | A member and B guest show same video/context on member/public surfaces; neither clicks presence. Capture video ID and UI context. | 6–8, 18 |
| 3 | A clicks Feu. Record browser Network 200 confirmation and accepted event UUID/time. | 3–8, 18 |
| 4 | B visibly receives real animation at low activity, correlate UUID and timing without scripted reaction. | 7–9, 18 |
| 5 | Public fire unique counter converges to 1 via GET. | 3–8, 18 |
| 6 | A clicks Feu again within allowed quota timing. | 3–8, 18 |
| 7 | B sees another real animation with a different accepted UUID. | 7–9, 18 |
| 8 | Public fire unique remains 1 after successful resync. | 3, 4, 6, 18 |
| 9 | Admin fire uniques=1/actions=2; global totals reconcile, no actors exposed. | 12, 18 |
| 10 | B clicks Prière without “Je suis là”. Observe guest reaction success. | 2–8, 18 |
| 11 | Authorized read-only aggregate/DB predicate confirms no new guest presence row for B; compare presence count before/after and require zero matching guest row. Do not infer from button UI alone. | 2–5, 14, 15, 18 |
| 12 | Public prayer unique converges to 1. | 3–8, 18 |
| 13 | After >=10s quiet for that identity, human sends four rapid clicks with each response before next click so local pending guard does not suppress requests. Network shows three at most accepted and fourth 429. Repeat across two tabs of the same identity after another empty window; each tab makes explicit human clicks. Rejected requests add no event/action. | 3–8, 14, 18 |
| 14 | After returned retryAfterMs, human sends another reaction; 200 and exactly one new accepted event/action, reconcile total rows/events. | 3–6, 18 |
| 15 | Human stops the actual YouTube broadcast. Record stop time independently. | 18 |
| 16 | Canonical automatically leaves LIVE. Measure delay against existing 30s LIVE cache/15s page poll and CMS coherence; do not force browser state or silently redesign canonical if it fails. | 4, 6, 18 |
| 17 | Human attempts an explicit reaction from a stale already-open tab before its next snapshot (or manually resends that specific request through browser DevTools if controls are already disabled). Require 409 not_live, zero new event/action, no late old-context animation. This is a human negative request, never an observer script-generated reaction. | 3–7, 13, 18 |
| 18 | Under separate editorial GO, human publishes existing CMS replay flow with exact same YouTube ID, ended/published and is_live=false. Open replay normally; finalization succeeds and final counters equal reconciled last live uniques. No script creates CMS row. | 3, 10, 11, 18 |
| 19 | Replay has no send UI or subscription. Human forced resend in browser DevTools is rejected by public LIVE API; reload/second browser returns same frozen counts. No automation script submits this request. | 3–5, 10, 11, 18 |
| 20 | Inspect public/member/admin for absence of invented participants/messages/profiles/percentages/counters. Authorized read-only DB compares sum(actor_totals.actions) and event counts per type and total; report aggregates only. | 1–12, 14, 15, 18 |
| 21 | While actual video plays, browser-level block of Realtime followed by reaction API failure preserves exact iframe/src/playback and canonical refresh. Restore connectivity and observe resync durable counts. Real DB failure injection is isolated test-only (Task 14), never destructive production mutation. | 6–9, 13–15, 18 |

Criterion 21's live-send/transport observation is performed before criterion 15 while the true LIVE is still playing; its replay playback check may repeat afterwards. All criteria retain their spec numbering even when the practical execution order differs. For criterion 13 local controls may delay a click while pending; all four must be actual Network requests within ten seconds, otherwise repeat after a fresh quiet window and mark the first attempt inconclusive. No client bypass changes to shipped code.

Supplementary gates: exercise all five reaction buttons across the two surfaces; keyboard/focus/44px targets/mobile/iframe fullscreen/reduced-motion; cancel one human POST response and prove no automatic reissue, then resync; compare same member across tabs; public SQL/API roles cannot write reaction tables/execute RPCs (real negative-write attempts belong to authorized test target; production uses read-only ACL verification and observed browser behavior); observe replay A while a later real live B is active and verify no B counts/animations in replay A. If a second real live is required for that supplementary case, schedule it with the human instead of synthesizing canonical. Transport cutoff may block only reaction channel/network in observer browser; do not disable shared production Supabase or harm notifications.

Independent canonical fallback limitation: if YouTube stop is masked by stale CMS live metadata, criterion 16 is FAIL, release acceptance remains blocked. Record the contradiction for a separately scoped LIVE 4A/canonical decision; no silent refactor or manual browser override earns PASS. If no real CMS replay exists, criterion 18 remains NOT_RUN until authorized editorial work occurs. Missing human time, project permissions or quotas does not become inferred success.
- [ ] Step 4: Run exact GREEN commands: `node scripts/live-reactions-release.mjs verify-evidence`; `node scripts/live-reactions-release.mjs verify-db`. Require all 21 PASS with real human/browser and aggregate evidence; production Realtime ready only after observed cross-browser committed event. Record actual durations for p95 where sample size supports it; one event is a latency observation, not a statistically meaningful p95.
- [ ] Step 5: Run regression commands: `node --test scripts/live-reactions-release.test.mjs scripts/live-reactions-observe.test.mjs`; `node scripts/live-reactions-observe.mjs watch` for final read-only canonical/public/admin reconciliation, then stop observer. Recheck real LIVE 4A presence/share through normal user flows only when authorized; no reaction-created presence. All earlier isolated/browser/load gates must still correspond to deployed source.
- [ ] Step 6: Inspect `git diff -- docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md` and `git diff --check`; verify external evidence avoids credentials/actor details. Confirm canonical main unchanged unless a separately authorized integration occurred, unexpected worktrees=0 relative to recorded baseline, stray project files=0, unexpected changed files=0.
- [ ] Step 7: Commit exact scoped file after complete acceptance only: `git add -- docs/superpowers/plans/2026-09-08-live-4b-release-runbook.md`; `git commit -m "docs(live): validate shared reactions on a real YouTube live"`. No Git push without separate instruction. LIVE 4B completion is conditional on this task, not on the planning commit.

## Full specification coverage and planning self-review

| Spec section | Implementation coverage or explicit non-goal |
| --- | --- |
| 1 Goal | Tasks 1–18; true shared experience and stable player |
| 2 Non-goals | Global constraints; no chat/profile/avatar/seed/auth redesign |
| 3 Existing LIVE 4A | Repository basis, regression command, Tasks 2, 4, 8, 12–14 |
| 4 Product decisions | Tasks 1–9, 11–12 |
| 5 Taxonomy | Tasks 1–2, 5, 8, 12 |
| 6 Identity | Tasks 2, 6, 14, 18; member/guest histories intentionally separate |
| 7 Canonical binding | Tasks 3–6, 8, 10, 18; cache/fallback limit preserved |
| 8 DB model | Tasks 1, 3, 14, 16; no purge |
| 9 Uniqueness | Tasks 1–4, 6, 12, 14, 18 |
| 10 Actions | Tasks 3–6, 12, 14, 18; no automatic retry |
| 11 Atomic quota | Task 3 real multi-session/window tests; Tasks 4–6, 14, 18 |
| 12 Server engine | Tasks 2–4, 10 |
| 13 Public APIs | Tasks 5, 10; full HTTP status matrix |
| 14 Realtime | Tasks 1, 7, 14, 16, 18 |
| 15 Resynchronization | Tasks 6–9, 13–14, 18 |
| 16 Client states | Tasks 6–8, 13 |
| 17 Animation algorithm | Tasks 8–9, 13–14 |
| 18 Public UX | Tasks 8, 11, 13, 18 |
| 19 Member UX | Tasks 8, 11, 13, 18; new root-dashboard commits preserved |
| 20 Replay | Tasks 3, 10–11, 18; no automatic CMS creation/backfill |
| 21 Admin | Tasks 4, 12–13, 18 |
| 22 Offline | Tasks 4–8, 13, 18; no offline send queue |
| 23 Isolation | Tasks 4, 6–8, 10–14, 18 |
| 24 Privacy/security | Tasks 1–7, 10, 12–16; no actor payloads |
| 25 Performance | Tasks 3, 6–9, 14, 18; fan-out cost measured |
| 26 Test strategy | All tasks with RED/GREEN/regression/commit; real DB/browser gates |
| 27 Ten lots | 4B.1 T1; 4B.2 T2–4; 4B.3 T5; 4B.4 T6–7; 4B.5 T8; 4B.6 T9; 4B.7 T10–11; 4B.8 T12; 4B.9 T13–14; 4B.10 T15–18 |
| 28 Migration/deployment | Tasks 15–17; separate GO DB/app, additive rollback |
| 29 Real E2E | Task 18 matrix maps all 21 verbatim-numbered criteria and supplementary checks |
| 30 Risks | Task 3 concurrency/deadlines; T2 auth ambiguity; T6 lost response; T10 exact replay; T14 fan-out/storage; T16 ACL; T18 canonical limits and player proof |

There are 18 tasks across the ten required lots. No boundary has been collapsed into a mega-task; foundations and runtime RPCs are separate migrations. Dependency order is T1→T2→T3→T4→T5→T6→T7→T8→T9→T10→T11→T12→T13→T14→T15→T16→T17→T18. Test code may prove an earlier lot's invariant again without changing its implementation. Operational gates have negative fixture tests and pre-action unmet assertions, not intentionally induced production faults.

Planning acceptance checklist (document review only, not implementation/test claims):

- [ ] Re-read complete spec sections 1–30 and map each in the table above.
- [ ] Verify all 21 production criteria and supplementary checks are explicitly covered in Task 18.
- [ ] Verify exact five-type taxonomy, reaction!=presence, public unique counts, separate action totals and precise PostgreSQL 3/10s quota.
- [ ] Verify clients only echo canonical as precondition, event transport is INSERT-only and DB remains truth.
- [ ] Verify read-only replay, no chat/fake metrics, member dashboard preservation and player failure isolation.
- [ ] Verify DB and app production authorization are separate; no implementation is started during planning.
- [ ] Scan for unfinished-placeholder tokens specified by the requester and remove all matches.
- [ ] Run git diff --check; ensure only this implementation plan is changed before staging.

Phase 1 completion procedure: stage only this plan, verify staged name list has exactly one path, run `git diff --cached --check`, commit `docs(live): plan shared realtime reactions`, then verify clean tracked worktree/staging, actual HEAD, unchanged canonical main/worktree inventory and untouched known release-out artifact. Do not execute this plan or push as part of Phase 1.
