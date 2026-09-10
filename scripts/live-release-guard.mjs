export const RELEASE_EVIDENCE_SCHEMA =
  'live-release-evidence/v1'

export const CERTIFIED_RELEASE_COMMIT =
  'a3963a1a99365826e3b12f4927968158bf3cde83'

export const REQUIRED_RELEASE_GATES = [
  'foundationDb',
  'engineDb',
  'realtime',
  'task14PureTests',
  'lowLoad',
  'mediumLoad',
  'burstLoad',
  'liveRegression',
  'typecheck',
  'build',
  'exactScope',
  'noRemoteMutation',
  'noProductionMutation',
  'noGitPush',
  'releaseOutUntouched',
]

export function validateReleaseEvidence(evidence = {}) {
  const missing = []
  const failed = []

  for (const gate of REQUIRED_RELEASE_GATES) {
    if (!(gate in evidence)) {
      missing.push(gate)
      continue
    }

    if (evidence[gate] !== true) {
      failed.push(gate)
    }
  }

  const actualSchema =
    typeof evidence.schemaVersion === 'string'
      ? evidence.schemaVersion
      : null

  const schema = {
    ok: actualSchema === RELEASE_EVIDENCE_SCHEMA,
    expected: RELEASE_EVIDENCE_SCHEMA,
    actual: actualSchema,
  }

  const actualCommit =
    typeof evidence.certifiedCommit === 'string'
      ? evidence.certifiedCommit
      : null

  const commit = {
    ok: actualCommit === CERTIFIED_RELEASE_COMMIT,
    expected: CERTIFIED_RELEASE_COMMIT,
    actual: actualCommit,
  }

  return {
    ok:
      missing.length === 0 &&
      failed.length === 0 &&
      schema.ok &&
      commit.ok,
    missing,
    failed,
    schema,
    commit,
  }
}