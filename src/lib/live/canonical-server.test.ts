import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cmsList: vi.fn(),
  detectYouTubeLive: vi.fn(),
  resolveLiveState: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/cms', () => ({
  cmsList: mocks.cmsList,
}))

vi.mock('@/lib/home/youtube-live', () => ({
  detectYouTubeLive: mocks.detectYouTubeLive,
}))

vi.mock('@/lib/home/contextual', () => ({
  resolveLiveState: mocks.resolveLiveState,
}))

import {
  getCanonicalLiveState,
  liveKeyFromState,
} from './canonical-server'

describe('getCanonicalLiveState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses YouTube LIVE as the first source of truth', async () => {
    const youtubeLive = {
      status: 'LIVE',
      title: 'Culte Royal',
      youtubeVideoId: 'ABCDEFGHIJK',
      watchUrl: '/live',
    } as const

    mocks.detectYouTubeLive.mockResolvedValue(youtubeLive)

    const state = await getCanonicalLiveState()

    expect(state).toEqual(youtubeLive)
    expect(mocks.cmsList).not.toHaveBeenCalled()
  })

  it('falls back to cms_lives when YouTube has no active live', async () => {
    const rows = [{ title: 'Programme CMS' }]

    const cmsState = {
      status: 'UPCOMING',
      title: 'Programme CMS',
      youtubeVideoId: 'LMNOPQRSTUV',
      watchUrl: '/live',
      scheduledAt: '2026-09-08T05:30:00.000Z',
    } as const

    mocks.detectYouTubeLive.mockResolvedValue(null)
    mocks.cmsList.mockResolvedValue(rows)
    mocks.resolveLiveState.mockReturnValue(cmsState)

    const state = await getCanonicalLiveState()

    expect(mocks.cmsList).toHaveBeenCalledWith(
      'cms_lives',
      {
        publicOnly: true,
        noStore: true,
        orderBy: 'created_at',
        ascending: false,
        limit: 12,
      },
    )

    expect(mocks.resolveLiveState).toHaveBeenCalledWith(rows)
    expect(state).toEqual(cmsState)
  })

  it('tries CMS when YouTube detection throws', async () => {
    mocks.detectYouTubeLive.mockRejectedValue(
      new Error('youtube unavailable'),
    )

    mocks.cmsList.mockResolvedValue([])
    mocks.resolveLiveState.mockReturnValue({
      status: 'OFFLINE',
    })

    await expect(
      getCanonicalLiveState(),
    ).resolves.toEqual({
      status: 'OFFLINE',
    })

    expect(mocks.cmsList).toHaveBeenCalled()
  })

  it('returns OFFLINE when YouTube and CMS both fail', async () => {
    mocks.detectYouTubeLive.mockRejectedValue(
      new Error('youtube unavailable'),
    )

    mocks.cmsList.mockRejectedValue(
      new Error('cms unavailable'),
    )

    await expect(
      getCanonicalLiveState(),
    ).resolves.toEqual({
      status: 'OFFLINE',
    })
  })
})

describe('liveKeyFromState', () => {
  it('builds youtube:<videoId> only for an active LIVE', () => {
    expect(
      liveKeyFromState({
        status: 'LIVE',
        title: 'Culte Royal',
        youtubeVideoId: 'ABCDEFGHIJK',
        watchUrl: '/live',
      }),
    ).toBe('youtube:ABCDEFGHIJK')
  })

  it('returns null for UPCOMING, OFFLINE and invalid ids', () => {
    expect(
      liveKeyFromState({
        status: 'UPCOMING',
        title: 'Prochain culte',
        youtubeVideoId: 'ABCDEFGHIJK',
        watchUrl: '/live',
      }),
    ).toBeNull()

    expect(
      liveKeyFromState({
        status: 'OFFLINE',
      }),
    ).toBeNull()

    expect(
      liveKeyFromState({
        status: 'LIVE',
        title: 'Culte',
        youtubeVideoId: 'bad-id',
        watchUrl: '/live',
      }),
    ).toBeNull()
  })
})