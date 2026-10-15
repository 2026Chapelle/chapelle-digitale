# MAHANAÏM P0.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive participant experience for the ten Mahanaïm retreat days with safe in-page selection, media-aware cards, CMS-managed imagery, and a separately reviewed P0.3 security-hardening migration.

**Architecture:** Preserve P0.2's server-side identity, enrollment, catalog, and unlock checks. Add a small client presentation layer that receives only the server-filtered day data, selects one day in local state, and renders cards plus one detail panel. Resolve optional card imagery through published CMS media using the convention `mahanaim-<retreat-slug>-jour-<NN>`; a missing image falls back to an illustrated gradient.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vitest, Supabase server clients (read-only application code; no migration or remote operation).

**Spec:** User-approved MAHANAÏM P0.3 design in the conversation of 2026-10-13.

## Global Constraints

- Modify only `feat/mahanaim-participant-p03` in its isolated worktree.
- No Supabase Production access, migration application, storage mutation, deployment, or push during implementation or review.
- Preserve the P0.2 enrollment, identity and server-side unlock protections.
- Enrollment is mandatory for every participant: `access_type='members'` never bypasses an individual active enrollment.
- The versioned `20261015113000_mahanaim_p03_security_hardening.sql` migration is a delivery dependency and must be approved and applied separately by an authorized operator.
- CMS imagery uses existing `cms_media` records and the documented slug convention; it is always optional.
- The desktop and mobile UI selects a day without changing route or exposing locked content.

## Review Focus

- An absent or unpublished CMS image must leave each day selectable and legible via the fallback visual.
- A locked day must never receive spiritual content or resource identifiers in the client payload.
- Cards must remain keyboard-operable and indicate the selected day without URL navigation.
- The current unlocked day selection must be deterministic when several days are available.
- CMS lookup failure must degrade to image fallbacks rather than turn the retreat page unavailable.

---

### Task 1: Carry forward P0.2 security and media primitives

**Files:**
- Create: P0.2-only server/resource files and tests in their corresponding paths
- Modify: `src/lib/mahanaim/member-retreats-server.ts`
- Test: `src/lib/mahanaim/member-retreats-server.test.ts`, `src/lib/mahanaim/member-retreats.security.test.ts`

**Interfaces:**
- Produces: `MemberRetreatDay` data that includes content only after server unlock evaluation.

- [ ] Write and run targeted failing security/data tests for content and resource visibility.
- [ ] Port only the P0.2 media and server access implementation needed by the participant route.
- [ ] Run the targeted tests and commit the P0.2 integration.

### Task 2: Resolve optional CMS card images

**Files:**
- Create: `src/lib/mahanaim/retreat-day-images.ts`, `src/lib/mahanaim/retreat-day-images.test.ts`
- Modify: `src/lib/mahanaim/member-retreats-server.ts`

**Interfaces:**
- Consumes: retreat slug and ordered day number.
- Produces: optional `imageUrl` on the card-only public day model, based on `mahanaim-<slug>-jour-<NN>`.

- [ ] Write failing tests for slug creation, missing media, and lookup failure fallback.
- [ ] Implement the pure slug helper and guarded server lookup without exposing protected content.
- [ ] Run targeted tests and commit the image resolver.

### Task 3: Build interactive day-card and detail-panel presentation

**Files:**
- Create: `src/components/mahanaim/MahanaimRetreatJourney.tsx`, `src/components/mahanaim/MahanaimRetreatJourney.test.ts`
- Modify: `src/app/(member)/member/plateformes/mahanaim/retraites/[slug]/page.tsx`

**Interfaces:**
- Consumes: server-filtered `MemberRetreatDetail`.
- Produces: ten horizontal cards and one local-state detail panel, with optional resources only for unlocked selected days.

- [ ] Write failing component/helper tests for fallback imagery, initial selection, and locked-day content suppression.
- [ ] Implement responsive cards and in-page selection, retaining accessible button semantics and server-provided unlock state.
- [ ] Replace the route's repeated day cards with the client presentation component; run targeted tests and commit.

### Task 4: Expose the CMS convention to administrators

**Files:**
- Modify: `src/components/admin/mahanaim/RetreatDaysEditor.tsx`
- Test: existing admin-day shared tests if a pure helper is added

**Interfaces:**
- Consumes: selected day number and retreat slug convention.
- Produces: clear CMS media slug guidance without writing a new column or running a migration.

- [ ] Write a failing pure helper test if slug display logic is extracted.
- [ ] Add concise per-day guidance in the existing admin editor, explaining media type/status and fallback behavior.
- [ ] Run affected tests and commit.

### Task 5: Verify responsive build and protection boundaries

**Files:**
- Modify: only files required by test/build findings

- [ ] Run targeted Vitest tests, then the full test suite.
- [ ] Run `npm run type-check` and `npm run build` with production guard outputs inspected.
- [ ] Run local browser checks at desktop and mobile widths if the dev server can be started safely.
- [ ] Review the complete diff for accidental P0.2 scope expansion or protected payload leakage.

## P0.3 release-consolidation addendum

### Delivery dependencies and scope split

- **SQL security dependency:** deliver `20261015113000_mahanaim_p03_security_hardening.sql` as an unapplied, versioned migration. Its final function ACL order is `CREATE OR REPLACE FUNCTION` → `REVOKE ALL ... FROM PUBLIC, anon` → `GRANT EXECUTE ... TO authenticated` → direct-day RLS policy. It also revokes client `UPDATE` on enrollments.
- **Calendar operation (J1–J10):** use the controlled calendar script only with an approved ID manifest. It validates ten unique days, their number/date sequence, target environment, and explicit mutation authorization before it can create a transaction payload.
- **Accueil/sitemap correction:** this is an independent application-delivery item. Review its diff and tests separately; it must neither be bundled into the calendar transaction nor treated as evidence that the SQL migration was applied.

### Pre-delivery controls

- Confirm the migration filename is new and historical migrations are untouched.
- Confirm the security test proves mandatory enrollment, authenticated-only catalog execution, revoked enrollment `UPDATE`, and post-function ACL placement.
- Run `git diff --check`, inspect every added file, and scan changed/untracked text for secrets without printing values.
- Confirm no `.env*` file is tracked, no Supabase CLI command, no production connection, and `DEPLOY_READY=NO`.
- For a future authorized calendar execution: provide `TargetEnvironment`, the approved manifest of retreat/day IDs, `-AuthorizeMutation`, and `-Execute`; review the generated transaction before it is sent to an operator.
- For a future authorized calendar execution: also provide an approved target-identity manifest. Before any mutation, the script reads `app.cier_environment_id` from the target database and requires one exact match with the approved non-secret identity; an absent, ambiguous, or mismatched identity stops execution.

### Post-delivery verification (authorized operator only)

- Verify migration history and function/table grants against the approved SQL, then test an enrolled member, a non-enrolled authenticated member, and a `serviteur` account.
- Verify J1–J10 dates against the signed manifest and confirm exactly ten affected rows inside the transaction result.
- Verify locked content remains absent before the Abidjan 18:00 cutoff and that the public/home/sitemap correction is separately reachable and indexed as intended.

### Rollback conditions and procedure

- Stop immediately if the manifest has duplicate IDs, missing day numbers, non-consecutive dates, a non-target environment, an authorization mismatch, or any row-count mismatch.
- Stop immediately if the database target identity is absent, ambiguous, or does not match the approved identity manifest; `TargetEnvironment` and a connection string alone are never proof of target identity.
- Do not improvise a rollback from application data. Use the separately approved rollback manifest containing the prior J1–J10 dates and the same ID/day-number checks.
- SQL ACL rollback requires a separately reviewed versioned migration; never edit or reapply a historical migration.
- `DEPLOY_READY=NO` remains until an authorized release review accepts the SQL migration, calendar manifest, rollback manifest, application diffs, and post-delivery evidence.
