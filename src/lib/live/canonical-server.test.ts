import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cmsList: vi.fn(),
  detectYouTubeLiveDetailed: vi.fn(),
  resolveLiveState: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('@/lib/cms', () => ({
  cmsList: mocks.cmsList,
}))

vi.mock('@/lib/home/youtube-live', () => ({
  detectYouTubeLiveDetailed: mocks.detectYouTubeLiveDetailed,
  verifyYouTubeVideoLive: vi.fn(async () => 'UNKNOWN'),
  getYouTubeLiveDiagnostics: vi.fn(() => ({ oauthConfigured: true, channelIdConfigured: false, lastError: null, lastCheckedAt: null, cachedStatus: null, cacheExpiresAt: null })),
}))

vi.mock('@/lib/home/contextual', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/home/contextual')>()),
  resolveLiveState: mocks.resolveLiveState,
}))

import {
  getCanonicalLiveSnapshot,
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

    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: youtubeLive, error: null, fromCache: false })

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

    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: null, fromCache: false })
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

    expect(mocks.resolveLiveState).toHaveBeenCalledWith(rows, expect.any(Date), { maxLiveDurationMs: 8 * 60 * 60_000 })
    expect(state).toEqual(cmsState)
  })

  it('tries CMS when YouTube detection throws', async () => {
    mocks.detectYouTubeLiveDetailed.mockRejectedValue(
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
    mocks.detectYouTubeLiveDetailed.mockRejectedValue(
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

describe('getCanonicalLiveSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports the YouTube error code while falling back to the CMS', async () => {
    const cmsState = {
      status: 'UPCOMING',
      title: 'Programme CMS',
      watchUrl: '/live',
      scheduledAt: '2026-11-16T09:00:00.000Z',
    } as const

    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: 'youtube_oauth_invalid_grant', fromCache: false })
    mocks.cmsList.mockResolvedValue([{ title: 'Programme CMS' }])
    mocks.resolveLiveState.mockReturnValue(cmsState)

    await expect(getCanonicalLiveSnapshot()).resolves.toEqual({
      state: cmsState,
      source: 'cms',
      youtubeError: 'youtube_oauth_invalid_grant',
    })
  })

  it('distinguishes a healthy YouTube OFFLINE from an error', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: null, fromCache: true })
    mocks.cmsList.mockResolvedValue([])
    mocks.resolveLiveState.mockReturnValue({ status: 'OFFLINE' })

    await expect(getCanonicalLiveSnapshot()).resolves.toEqual({
      state: { status: 'OFFLINE' },
      source: 'none',
      youtubeError: null,
    })
  })

  it('marks YouTube as the source when it identifies a live or upcoming broadcast', async () => {
    const upcoming = { status: 'UPCOMING', title: 'Prochain culte', youtubeVideoId: 'ABCDEFGHIJK', watchUrl: '/live', scheduledAt: '2026-11-16T09:00:00Z' } as const
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: upcoming, error: null, fromCache: false })

    await expect(getCanonicalLiveSnapshot()).resolves.toEqual({ state: upcoming, source: 'youtube', youtubeError: null })
    expect(mocks.cmsList).not.toHaveBeenCalled()
  })

  it('still answers with the CMS when the detector itself throws', async () => {
    mocks.detectYouTubeLiveDetailed.mockRejectedValue(new Error('boom'))
    mocks.cmsList.mockResolvedValue([])
    mocks.resolveLiveState.mockReturnValue({ status: 'OFFLINE' })

    await expect(getCanonicalLiveSnapshot()).resolves.toEqual({ state: { status: 'OFFLINE' }, source: 'none', youtubeError: 'youtube_live_error' })
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