import assert from 'node:assert/strict'
import test from 'node:test'

const moduleUrl = new URL(
  './live-release-guard.mjs',
  import.meta.url,
)

const EXPECTED_SCHEMA =
  'live-release-evidence/v1'

const EXPECTED_COMMIT =
  'a3963a1a99365826e3b12f4927968158bf3cde83'

const EXPECTED_GATES = [
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

function passingEvidence() {
  return {
    schemaVersion: EXPECTED_SCHEMA,
    certifiedCommit: EXPECTED_COMMIT,
    ...Object.fromEntries(
      EXPECTED_GATES.map(
        (gate) => [gate, true],
      ),
    ),
  }
}

test(
  'LIVE 4B.10 exposes a deterministic release evidence validator',
  async () => {
    const guard = await import(moduleUrl)

    assert.equal(
      typeof guard.validateReleaseEvidence,
      'function',
    )
  },
)

test(
  'LIVE 4B.10 freezes the release evidence schema version',
  async () => {
    const {
      RELEASE_EVIDENCE_SCHEMA,
    } = await import(moduleUrl)

    assert.equal(
      RELEASE_EVIDENCE_SCHEMA,
      EXPECTED_SCHEMA,
    )
  },
)

test(
  'LIVE 4B.10 freezes the certified TASK14 commit',
  async () => {
    const {
      CERTIFIED_RELEASE_COMMIT,
    } = await import(moduleUrl)

    assert.equal(
      CERTIFIED_RELEASE_COMMIT,
      EXPECTED_COMMIT,
    )
  },
)

test(
  'LIVE 4B.10 requires the complete frozen release gate set',
  async () => {
    const {
      REQUIRED_RELEASE_GATES,
    } = await import(moduleUrl)

    assert.deepEqual(
      REQUIRED_RELEASE_GATES,
      EXPECTED_GATES,
    )
  },
)

test(
  'LIVE 4B.10 accepts complete versioned evidence',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const result =
      validateReleaseEvidence(
        passingEvidence(),
      )

    assert.deepEqual(
      result,
      {
        ok: true,
        missing: [],
        failed: [],
        schema: {
          ok: true,
          expected: EXPECTED_SCHEMA,
          actual: EXPECTED_SCHEMA,
        },
        commit: {
          ok: true,
          expected: EXPECTED_COMMIT,
          actual: EXPECTED_COMMIT,
        },
      },
    )
  },
)

test(
  'LIVE 4B.10 fails closed when schemaVersion is missing',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    delete evidence.schemaVersion

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      false,
    )

    assert.deepEqual(
      result.schema,
      {
        ok: false,
        expected: EXPECTED_SCHEMA,
        actual: null,
      },
    )
  },
)

test(
  'LIVE 4B.10 rejects an unknown evidence schema version',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    evidence.schemaVersion =
      'live-release-evidence/v2'

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      false,
    )

    assert.deepEqual(
      result.schema,
      {
        ok: false,
        expected: EXPECTED_SCHEMA,
        actual:
          'live-release-evidence/v2',
      },
    )
  },
)

test(
  'LIVE 4B.10 rejects evidence for a different commit',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    evidence.certifiedCommit =
      '1111111111111111111111111111111111111111'

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      false,
    )

    assert.equal(
      result.commit.ok,
      false,
    )
  },
)

test(
  'LIVE 4B.10 fails closed when a required gate is missing',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    delete evidence.foundationDb

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      false,
    )

    assert.deepEqual(
      result.missing,
      ['foundationDb'],
    )
  },
)

test(
  'LIVE 4B.10 fails closed when a required gate is false',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    evidence.engineDb =
      false

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      false,
    )

    assert.deepEqual(
      result.failed,
      ['engineDb'],
    )
  },
)

test(
  'LIVE 4B.10 rejects non-boolean truthy release evidence',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    evidence.realtime =
      'PASS'

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      false,
    )
  },
)

test(
  'LIVE 4B.10 ignores unrelated evidence but never relaxes required gates',
  async () => {
    const {
      validateReleaseEvidence,
    } = await import(moduleUrl)

    const evidence =
      passingEvidence()

    evidence.unrelated =
      true

    const result =
      validateReleaseEvidence(evidence)

    assert.equal(
      result.ok,
      true,
    )
  },
)