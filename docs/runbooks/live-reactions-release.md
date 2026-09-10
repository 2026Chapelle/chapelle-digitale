# Citadelle Live — Shared Reactions Release Runbook

## Purpose

TASK15 defines release readiness for LIVE 4B shared reactions.
It does not deploy, push, mutate production, mutate Supabase production, or modify release-out.
A release is READY only when every required proof is valid. Otherwise it is BLOCKED.

## Certified baseline

Evidence schema: live-release-evidence/v1
Certified TASK14 commit: a3963a1a99365826e3b12f4927968158bf3cde83

## Required release gates

All gates must be exactly boolean true:
foundationDb
engineDb
realtime
task14PureTests
lowLoad
mediumLoad
burstLoad
liveRegression
typecheck
build
exactScope
noRemoteMutation
noProductionMutation
noGitPush
releaseOutUntouched

Strings such as PASS, numeric values, missing fields, or false values are rejected.

## Evidence contract

A valid manifest must declare schemaVersion live-release-evidence/v1.
It must declare certifiedCommit a3963a1a99365826e3b12f4927968158bf3cde83.
It must contain all 15 required gates.

Validator: scripts/live-release-guard.mjs
Tests: scripts/live-release-guard.test.mjs

The validator returns ok, missing, failed, schema, and commit.
The validator is fail-closed.

## TASK14 evidence baseline

Foundation DB: 2/2 PASS
Engine DB: 15/15 PASS
Realtime: 8/8 PASS
Pure safety: 13/13 PASS
LOW load: PASS
MEDIUM load: PASS
BURST load: PASS
Live regression: PASS
Typecheck: PASS
Build: PASS

These proofs belong only to the certified TASK14 commit.

## Release decision

Verify commit, schema, all 15 gates, exact scope, no remote mutation, no production mutation, no Git push, and releaseOutUntouched.
Continue only when validateReleaseEvidence(evidence).ok is true.
Otherwise the release is BLOCKED.

## Production separation

TASK15 is release-readiness only.
It must not deploy, SSH into production, push Git, mutate production Supabase, reset databases, alter rollback assets, or modify release-out.

## Failure handling

On failure: stop, preserve output, identify the failing gate, fix only the root cause, rerun verification, then rerun the final gate.
Never replace missing or failed evidence with a manually printed PASS.

## Rollback principle

Rollback belongs to the separately authorized deployment phase.
A TASK15 READY verdict never authorizes production deployment by itself.
