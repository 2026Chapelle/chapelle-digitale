import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cmsList: vi.fn(),
  detectYouTubeLiveDetailed: vi.fn(),
  verifyYouTubeVideoLive: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/cms', () => ({ cmsList: mocks.cmsList }))
vi.mock('@/lib/home/youtube-live', () => ({
  detectYouTubeLiveDetailed: mocks.detectYouTubeLiveDetailed,
  verifyYouTubeVideoLive: mocks.verifyYouTubeVideoLive,
  getYouTubeLiveDiagnostics: () => ({ oauthConfigured: true, channelIdConfigured: true, lastError: null, lastCheckedAt: '2026-11-15T10:00:00.000Z', cachedStatus: 'OFFLINE', cacheExpiresAt: '2026-11-15T10:01:00.000Z' }),
}))

import { cmsLiveMaxDurationMs, getCanonicalLiveDiagnostics, getCanonicalLiveSnapshot } from './canonical-server'

const recent = () => new Date(Date.now() - 30 * 60_000).toISOString()
const staleLive = { title: 'Culte du 5 novembre', status: 'live', is_live: true, youtube_url: 'https://youtu.be/stale123456', updated_at: recent(), created_at: recent() }
const next = { title: 'Prochain culte', status: 'scheduled', scheduled_at: new Date(Date.now() + 24 * 3_600_000).toISOString(), youtube_url: 'https://youtu.be/next1234567' }

describe('canonical live expiry policy (YouTube truth + bounded CMS fallback)', () => {
  const originalHours = process.env.LIVE_CMS_MAX_HOURS
  beforeEach(() => { vi.clearAllMocks(); delete process.env.LIVE_CMS_MAX_HOURS })
  afterEach(() => { if (originalHours === undefined) delete process.env.LIVE_CMS_MAX_HOURS; else process.env.LIVE_CMS_MAX_HOURS = originalHours })

  it('drops a CMS live row whose YouTube broadcast is confirmed ENDED and falls through to the next scheduled live', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: null, fromCache: false })
    mocks.cmsList.mockResolvedValue([staleLive, next])
    mocks.verifyYouTubeVideoLive.mockResolvedValue('ENDED')

    await expect(getCanonicalLiveSnapshot()).resolves.toMatchObject({ source: 'cms', youtubeError: null, state: { status: 'UPCOMING', youtubeVideoId: 'next1234567' } })
    expect(mocks.verifyYouTubeVideoLive).toHaveBeenCalledWith('stale123456')
  })

  it('keeps the CMS live row when YouTube reports it live, upcoming, a plain video or unknown', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: null, fromCache: false })
    mocks.cmsList.mockResolvedValue([staleLive])
    for (const verdict of ['LIVE', 'UPCOMING', 'NOT_LIVE', 'UNKNOWN'] as const) {
      mocks.verifyYouTubeVideoLive.mockResolvedValue(verdict)
      await expect(getCanonicalLiveSnapshot()).resolves.toMatchObject({ source: 'cms', state: { status: 'LIVE', youtubeVideoId: 'stale123456' } })
    }
  })

  it('does not call YouTube verification when YouTube itself is in error (bounded fallback only)', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: 'youtube_oauth_invalid_grant', fromCache: false })
    mocks.cmsList.mockResolvedValue([staleLive])

    await expect(getCanonicalLiveSnapshot()).resolves.toMatchObject({ source: 'cms', youtubeError: 'youtube_oauth_invalid_grant', state: { status: 'LIVE' } })
    expect(mocks.verifyYouTubeVideoLive).not.toHaveBeenCalled()
  })

  it('expires a CMS live row after the bounded duration even when YouTube is unreachable', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: 'youtube_live_403', fromCache: false })
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3_600_000).toISOString()
    mocks.cmsList.mockResolvedValue([{ ...staleLive, updated_at: tenDaysAgo, created_at: tenDaysAgo, scheduled_at: tenDaysAgo }])

    await expect(getCanonicalLiveSnapshot()).resolves.toEqual({ state: { status: 'OFFLINE' }, source: 'none', youtubeError: 'youtube_live_403' })
  })

  it('reads LIVE_CMS_MAX_HOURS with a safe default and bounds', () => {
    expect(cmsLiveMaxDurationMs({})).toBe(8 * 3_600_000)
    expect(cmsLiveMaxDurationMs({ LIVE_CMS_MAX_HOURS: '12' })).toBe(12 * 3_600_000)
    expect(cmsLiveMaxDurationMs({ LIVE_CMS_MAX_HOURS: '1.5' })).toBe(1.5 * 3_600_000)
    expect(cmsLiveMaxDurationMs({ LIVE_CMS_MAX_HOURS: '0' })).toBe(8 * 3_600_000)
    expect(cmsLiveMaxDurationMs({ LIVE_CMS_MAX_HOURS: '999' })).toBe(8 * 3_600_000)
    expect(cmsLiveMaxDurationMs({ LIVE_CMS_MAX_HOURS: 'abc' })).toBe(8 * 3_600_000)
  })

  it('applies LIVE_CMS_MAX_HOURS to the fallback (exceptional long services)', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: 'youtube_live_403', fromCache: false })
    const tenHoursAgo = new Date(Date.now() - 10 * 3_600_000).toISOString()
    mocks.cmsList.mockResolvedValue([{ ...staleLive, updated_at: tenHoursAgo, created_at: tenHoursAgo }])
    await expect(getCanonicalLiveSnapshot()).resolves.toMatchObject({ state: { status: 'OFFLINE' } })
    process.env.LIVE_CMS_MAX_HOURS = '12'
    await expect(getCanonicalLiveSnapshot()).resolves.toMatchObject({ state: { status: 'LIVE' } })
  })

  it('exposes admin diagnostics without any secret value', async () => {
    mocks.detectYouTubeLiveDetailed.mockResolvedValue({ state: null, error: null, fromCache: true })
    mocks.cmsList.mockResolvedValue([])
    const diag = await getCanonicalLiveDiagnostics()
    expect(diag).toMatchObject({ state: { status: 'OFFLINE' }, source: 'none', youtubeError: null, youtube: { oauthConfigured: true }, policy: { cmsLiveMaxHours: 8, cmsVerifiedAgainstYouTube: true } })
    expect(typeof diag.checkedAt).toBe('string')
  })
})
