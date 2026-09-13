import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  applyReplayProgressSample,
  clampReplaySeconds,
  computeReplayPercent,
  formatReplayPosition,
  shouldOfferReplayResume,
  type LiveReplayProgress,
} from './live-replay-progress'

import {
  chooseNewestReplayProgress,
} from './live-replay-progress-client'

const CMS_LIVE_ID =
  '11111111-1111-4111-8111-111111111111'

function progress(
  overrides: Partial<LiveReplayProgress> = {},
): LiveReplayProgress {
  return {
    cmsLiveId: CMS_LIVE_ID,
    lastPositionSeconds: 0,
    durationSeconds: 100,
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

describe('LIVE 4C replay progress contract', () => {
  it('formats a saved position for the return message', () => {
    expect(formatReplayPosition(65)).toBe('01:05')
    expect(formatReplayPosition(2297)).toBe('38:17')
    expect(formatReplayPosition(3723)).toBe('1:02:03')
  })

  it('clamps playback position and computes percentage', () => {
    expect(clampReplaySeconds(-5)).toBe(0)
    expect(clampReplaySeconds(120, 100)).toBe(100)
    expect(computeReplayPercent(45, 100)).toBe(45)
    expect(computeReplayPercent(500, 0)).toBe(0)
  })

  it('offers resume from 15 seconds and never after completion', () => {
    expect(
      shouldOfferReplayResume(
        progress({
          lastPositionSeconds: 14,
          percentComplete: 14,
        }),
      ),
    ).toBe(false)

    expect(
      shouldOfferReplayResume(
        progress({
          lastPositionSeconds: 15,
          percentComplete: 15,
        }),
      ),
    ).toBe(true)

    expect(
      shouldOfferReplayResume(
        progress({
          lastPositionSeconds: 90,
          percentComplete: 90,
        }),
      ),
    ).toBe(false)

    expect(
      shouldOfferReplayResume(
        progress({
          lastPositionSeconds: 50,
          percentComplete: 50,
          completedAt: '2026-09-13T16:00:00.000Z',
        }),
      ),
    ).toBe(false)
  })

  it('keeps maximum completion while preserving the real latest position', () => {
    const first =
      applyReplayProgressSample(
        null,
        {
          cmsLiveId: CMS_LIVE_ID,
          positionSeconds: 30,
          durationSeconds: 100,
          sessionKey: 'session_1',
        },
        '2026-09-13T16:00:00.000Z',
      )

    expect(first.lastPositionSeconds).toBe(30)
    expect(first.percentComplete).toBe(30)
    expect(first.viewCount).toBe(1)

    const rewind =
      applyReplayProgressSample(
        first,
        {
          cmsLiveId: CMS_LIVE_ID,
          positionSeconds: 10,
          durationSeconds: 100,
          sessionKey: 'session_1',
        },
        '2026-09-13T16:01:00.000Z',
      )

    expect(rewind.lastPositionSeconds).toBe(10)
    expect(rewind.percentComplete).toBe(30)
    expect(rewind.viewCount).toBe(1)
  })

  it('counts another session once and makes completion irreversible', () => {
    const first =
      applyReplayProgressSample(
        null,
        {
          cmsLiveId: CMS_LIVE_ID,
          positionSeconds: 40,
          durationSeconds: 100,
          sessionKey: 'session_1',
        },
        '2026-09-13T16:00:00.000Z',
      )

    const secondSession =
      applyReplayProgressSample(
        first,
        {
          cmsLiveId: CMS_LIVE_ID,
          positionSeconds: 50,
          durationSeconds: 100,
          sessionKey: 'session_2',
        },
        '2026-09-13T16:10:00.000Z',
      )

    expect(secondSession.viewCount).toBe(2)

    const completed =
      applyReplayProgressSample(
        secondSession,
        {
          cmsLiveId: CMS_LIVE_ID,
          positionSeconds: 90,
          durationSeconds: 100,
          sessionKey: 'session_2',
        },
        '2026-09-13T16:20:00.000Z',
      )

    expect(completed.percentComplete).toBe(90)
    expect(completed.completedAt)
      .toBe('2026-09-13T16:20:00.000Z')

    const later =
      applyReplayProgressSample(
        completed,
        {
          cmsLiveId: CMS_LIVE_ID,
          positionSeconds: 20,
          durationSeconds: 100,
          sessionKey: 'session_2',
        },
        '2026-09-13T16:30:00.000Z',
      )

    expect(later.completedAt)
      .toBe('2026-09-13T16:20:00.000Z')
  })

  it('chooses the newest local or server copy', () => {
    const local =
      progress({
        lastPositionSeconds: 30,
        updatedAt: '2026-09-13T16:10:00.000Z',
      })

    const server =
      progress({
        lastPositionSeconds: 20,
        updatedAt: '2026-09-13T16:00:00.000Z',
      })

    expect(
      chooseNewestReplayProgress(
        local,
        server,
      )?.lastPositionSeconds,
    ).toBe(30)

    expect(
      chooseNewestReplayProgress(
        null,
        server,
      )?.lastPositionSeconds,
    ).toBe(20)
  })
})