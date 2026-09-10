import assert from 'node:assert/strict'
import test from 'node:test'

import {
  summarizeMeasurements,
  validateLoadTarget,
} from './live-reactions-load.mjs'

const PRODUCTION_REF =
  'nvyuyffywnuollaxguen'

const TEST_REF =
  'abcdefghijklmnopqrst'

const TEST_APP_URL =
  'https://live4b-test.example.test'

const TEST_SUPABASE_URL =
  `https://${TEST_REF}.supabase.co`

function validTarget(overrides = {}) {
  return {
    go: true,
    projectRef: TEST_REF,
    expectedProjectRef: TEST_REF,
    appUrl: TEST_APP_URL,
    supabaseUrl: TEST_SUPABASE_URL,
    scenario: 'low',
    ...overrides,
  }
}

test(
  'rejects execution without explicit LIVE 4B test authorization',
  () => {
    assert.throws(
      () =>
        validateLoadTarget(
          validTarget({
            go: false,
          }),
        ),
      /authorization|go|test/i,
    )
  },
)

test(
  'rejects the Citadelle production Supabase project even with GO',
  () => {
    assert.throws(
      () =>
        validateLoadTarget(
          validTarget({
            projectRef: PRODUCTION_REF,
            expectedProjectRef:
              PRODUCTION_REF,
            supabaseUrl:
              `https://${PRODUCTION_REF}.supabase.co`,
          }),
        ),
      /production|forbidden|ref/i,
    )
  },
)

test(
  'rejects a configured project ref that does not match the authorized manifest ref',
  () => {
    assert.throws(
      () =>
        validateLoadTarget(
          validTarget({
            expectedProjectRef:
              'zzzzzzzzzzzzzzzzzzzz',
          }),
        ),
      /mismatch|project|ref/i,
    )
  },
)

test(
  'rejects a Supabase URL that does not belong to the authorized test project',
  () => {
    assert.throws(
      () =>
        validateLoadTarget(
          validTarget({
            supabaseUrl:
              'https://zzzzzzzzzzzzzzzzzzzz.supabase.co',
          }),
        ),
      /supabase|project|url|mismatch/i,
    )
  },
)

test(
  'rejects the production Citadelle application host',
  () => {
    assert.throws(
      () =>
        validateLoadTarget(
          validTarget({
            appUrl:
              'https://citadelle.chapelleduroyaume.org',
          }),
        ),
      /production|host|app|forbidden/i,
    )
  },
)

test(
  'rejects unknown load scenarios',
  () => {
    assert.throws(
      () =>
        validateLoadTarget(
          validTarget({
            scenario:
              'unbounded',
          }),
        ),
      /scenario/i,
    )
  },
)

test(
  'accepts only the declared low medium and burst scenarios on an authorized test target',
  () => {
    for (
      const scenario of
        ['low', 'medium', 'burst']
    ) {
      const result =
        validateLoadTarget(
          validTarget({
            scenario,
          }),
        )

      assert.equal(
        result.scenario,
        scenario,
      )

      assert.equal(
        result.projectRef,
        TEST_REF,
      )
    }
  },
)

test(
  'summarizes count minimum maximum average p95 and p99 from real samples',
  () => {
    const summary =
      summarizeMeasurements(
        [100, 200, 300, 400],
      )

    assert.deepEqual(
      summary,
      {
        count: 4,
        min: 100,
        max: 400,
        average: 250,
        p95: 400,
        p99: 400,
      },
    )
  },
)

test(
  'uses nearest-rank percentile boundaries rather than interpolation',
  () => {
    const summary =
      summarizeMeasurements(
        [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
        ],
      )

    assert.equal(
      summary.p95,
      100,
    )

    assert.equal(
      summary.p99,
      100,
    )
  },
)

test(
  'fails closed when measurement samples are missing',
  () => {
    assert.throws(
      () =>
        summarizeMeasurements([]),
      /sample|measurement/i,
    )

    assert.throws(
      () =>
        summarizeMeasurements(null),
      /sample|measurement/i,
    )
  },
)

test(
  'fails closed for non-finite or negative latency samples',
  () => {
    for (
      const samples of [
        [100, Number.NaN],
        [100, Number.POSITIVE_INFINITY],
        [100, -1],
        ['100'],
      ]
    ) {
      assert.throws(
        () =>
          summarizeMeasurements(samples),
        /sample|measurement|number/i,
      )
    }
  },
)
/* TASK14_LOCAL_LOOPBACK_TDD_V1 */

test('validateLoadTarget accepts explicit local loopback target', () => {
  assert.doesNotThrow(() =>
    validateLoadTarget({
      go: true,
      targetMode: 'local',
      projectRef: 'local-task14',
      expectedProjectRef: 'local-task14',
      appUrl: 'http://127.0.0.1:3000',
      supabaseUrl: 'http://127.0.0.1:54321',
      scenario: 'low',
    }),
  )
})

test('validateLoadTarget rejects non-loopback URL in local mode', () => {
  assert.throws(
    () =>
      validateLoadTarget({
        go: true,
        targetMode: 'local',
        projectRef: 'local-task14',
        expectedProjectRef: 'local-task14',
        appUrl: 'http://127.0.0.1:3000',
        supabaseUrl: 'http://192.168.1.74:54321',
        scenario: 'low',
      }),
    /loopback|local/i,
  )
})