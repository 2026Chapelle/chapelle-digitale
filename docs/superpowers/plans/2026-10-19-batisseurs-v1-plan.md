# Batisseurs V1 Implementation Plan

> For agentic workers: use superpowers:executing-plans for inline execution.
> Track completed steps using the checkboxes below.

## Goal
Create a private group space with meetings, prayer requests,
announcements, resources and testimonies.

## Architecture
Reuse existing membership, leadership and meeting services.
Store group posts in a new protected table.
All content access passes through authenticated server routes.
Google Meet opens externally; no embedded conferencing in V1.

## Tech Stack
Next.js, TypeScript, Supabase Postgres, Vitest.
Use the existing project versions and test configuration.

## Spec
docs/superpowers/specs/2026-10-19-batisseurs-v1-design.md

## Global Constraints
- Work only in the BATISSEURS-V1 isolated worktree.
- Preserve the two inherited Sentinelles modifications.
- No remote database mutation without explicit GO.
- No production deployment without explicit GO.
- Never expose secrets.
- Never use db push production or rsync --delete.
- Private responses: Cache-Control private, no-store.
- Confidential prayers cannot become group-visible through moderation.

## Review Focus
- Membership removed between page load and submission: reject submission.
- Archived group: reject reads and writes.
- Guessed content ID from another group: reject access.
- External resource URL: reject dangerous protocols.
- Missing meeting link or network failure: explicit usable UI state.

## Task 1 - Content model and access rules
Create:
- src/lib/community/group-space.ts
- src/lib/community/group-space.test.ts

Interfaces:
- GroupPostKind: annonce | priere | ressource | temoignage.
- GroupPostState: en_attente | publie | refuse | archive.
- GroupPostVisibility: groupe | responsables.
- validateGroupPost(input: unknown): validation result.
- canReadGroupPost(actor, post): boolean.
- canModerateGroupPost(actor, post): boolean.
Actor contains uid, activeMember, manager and activeGroup.

- [ ] Write failing tests for inactive group, outsider, author,
      active member, manager and confidential content.
- [ ] Test testimony consent, text limits and safe resource URLs.
- [ ] Implement pure validation and authorization.
- [ ] Run targeted Vitest tests; require PASS.
- [ ] Commit only Task 1 files.

## Task 2 - Storage and server service
Create:
- supabase/migrations/20261019220000_group_space_posts.sql
- src/lib/community/group-space-server.ts
- src/lib/community/group-space-server.test.ts

Table group_space_posts:
id UUID primary key, groupe_id FK groupes,
author_id FK profiles, kind, title, body, resource_url,
visibility, state, consent boolean,
moderated_by FK profiles, moderated_at, created_at, updated_at.
Constrain enumerations, index groupe_id/state/created_at.
Enable RLS, revoke browser access, grant service_role access.
No seed data and no modification of existing group membership.

Interfaces:
- getGroupSpaceAccess(uid, groupId): actor.
- listGroupPosts(actor, groupId): permitted posts.
- createGroupPost(actor, groupId, input): post.
- moderateGroupPost(actor, groupId, postId, decision): post.
- withdrawGroupPost(actor, groupId, postId): void.

- [ ] Check existing membership/schema/auth conventions.
- [ ] Test access using active membership and existing manager scope.
- [ ] Test group/post mismatch and confidentiality filtering.
- [ ] Implement service; propagate database errors explicitly.
- [ ] Test migration locally, including browser-role denial.
- [ ] Commit Task 2 files after tests pass.

## Task 3 - Private API
Create:
- src/app/api/member/groupes/[id]/espace/route.ts
- src/app/api/member/groupes/[id]/espace/route.test.ts

GET: authorized group details, permissions and filtered posts.
POST actions: create, moderate, withdraw.
Use getSessionProfile and the Task 2 service.
Derive author from session; never trust client identity or role.
Recheck membership and group status on every request.
Return 401 unauthenticated, 403 unauthorized, 400 invalid input.
No private data in error messages.

- [ ] Write failing tests for the GET and POST access matrix.
- [ ] Test removed membership, inactive group, forged author/role
      and a post belonging to another group.
- [ ] Implement API with private no-store responses.
- [ ] Run API tests and require PASS.
- [ ] Commit Task 3 files.

## Task 4 - Member interface and meetings
Create:
- src/app/(member)/member/dashboard/groupes/[id]/page.tsx
- src/components/community/GroupSpace.tsx
- src/components/community/GroupSpace.test.tsx
Modify:
- src/app/(member)/member/dashboard/groupes/page.tsx

Consume /api/member/groupes/[id]/espace.
Reuse /api/member/reunions?groupe_id=UUID for meetings.
Show five sections and next planned meeting first.
Format dates explicitly with Africa/Abidjan.
Open validated meeting URLs with noopener noreferrer.
Provide member submission, manager moderation and author withdrawal.
Confidentiality label remains visible to author and manager.
Use plain text rendering, never raw user HTML.

- [ ] Verify the available UI test environment.
- [ ] Test authorized content, empty/error/loading states,
      missing meeting URL and confidential submission.
- [ ] Implement accessible mobile interface and form feedback.
- [ ] Add Open group button for active memberships.
- [ ] Run tests and type checks.
- [ ] Commit Task 4 files.

## Task 5 - Mahanaim entry and final validation
Modify:
- src/app/(public)/plateformes/[id]/PlateformePage.tsx
Create:
- scripts/verify-batisseurs-v1.mjs

Public entry shows no private content or meeting URL.
Link to the member groups page with Mahanaim context.
Resolve Batisseurs through its existing UUID before adding
a direct group link; never hard-code an unverified identifier.
Non-members can use the existing discovery/join flow.

- [ ] Add Mahanaim entry and verify active-member navigation.
- [ ] Test outsider, pending member, member and manager flows.
- [ ] Test confidential prayer and testimony moderation end to end.
- [ ] Run targeted tests, type checks and npm.cmd run build.
- [ ] Require production environment and bundle guards PASS.
- [ ] Review git diff and inherited-change baseline.
- [ ] Commit only intended files; record remaining limitations.
- [ ] Prepare deployment instructions separately.
      No production action without explicit GO.