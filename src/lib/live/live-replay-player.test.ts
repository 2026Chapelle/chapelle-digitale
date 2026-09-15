import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  replayStartForChoice,
  resolveReplayOpening,
  shouldPersistReplaySample,
} from './live-replay-player'

import type {
  LiveReplayProgress,
} from './live-replay-progress'

const CMS_LIVE_ID =
  '11111111-1111-4111-8111-111111111111'

function progress(
  overrides: Partial<LiveReplayProgress> = {},
): LiveReplayProgress {
  return {
    cmsLiveId: CMS_LIVE_ID,
    lastPositionSeconds: 0,
    durationSeconds: 3600,
    percentComplete: 0,
    completedAt: null,
    viewCount: 1,
    lastSessionKey: null,
    firstWatchedAt: null,
    lastWatchedAt: null,
    updatedAt: null,
    ...overrides,
  }
}

describe('LIVE 4C replay player contract', () => {
  it('shows a return choice for meaningful unfinished progress', () => {
    const result =
      resolveReplayOpening(
        progress({
          lastPositionSeconds: 2297,
          percentComplete: 63.8,
        }),
      )

    expect(result.showReturnChoice)
      .toBe(true)

    expect(result.savedPositionSeconds)
      .toBe(2297)

    expect(result.savedPositionLabel)
      .toBe('38:17')
  })

  it('starts from zero when no meaningful resume exists', () => {
    const result =
      resolveReplayOpening(
        progress({
          lastPositionSeconds: 8,
          percentComplete: 1,
        }),
      )

    expect(result.showReturnChoice)
      .toBe(false)

    expect(result.savedPositionSeconds)
      .toBe(0)
  })

  it('never prompts an already completed replay', () => {
    const result =
      resolveReplayOpening(
        progress({
          lastPositionSeconds: 3300,
          percentComplete: 92,
          completedAt:
            '2026-09-13T17:00:00.000Z',
        }),
      )

    expect(result.showReturnChoice)
      .toBe(false)

    expect(result.savedPositionSeconds)
      .toBe(0)
  })

  it('resolves resume and restart choices explicitly', () => {
    expect(
      replayStartForChoice(
        'resume',
        2297,
      ),
    ).toBe(2297)

    expect(
      replayStartForChoice(
        'restart',
        2297,
      ),
    ).toBe(0)
  })

  it('allows the first save immediately then throttles normal saves', () => {
    expect(
      shouldPersistReplaySample(
        0,
        2500,
        false,
      ),
    ).toBe(true)

    expect(
      shouldPersistReplaySample(
        1000,
        8999,
        false,
      ),
    ).toBe(false)

    expect(
      shouldPersistReplaySample(
        1000,
        9000,
        false,
      ),
    ).toBe(true)
  })

  it('always allows forced pause or end persistence', () => {
    expect(
      shouldPersistReplaySample(
        5000,
        5001,
        true,
      ),
    ).toBe(true)
  })
})