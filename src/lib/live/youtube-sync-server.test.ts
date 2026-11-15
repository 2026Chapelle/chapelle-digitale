import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), fetchOwnedBroadcasts: vi.fn(), fetchVideoDetails: vi.fn(), reset: vi.fn(), config: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
vi.mock('@/lib/intelligence/connectors/youtube/config', () => ({ loadYouTubeConfig: mocks.config }))
vi.mock('@/lib/home/youtube-live', () => ({
  fetchOwnedBroadcasts: mocks.fetchOwnedBroadcasts,
  fetchVideoDetails: mocks.fetchVideoDetails,
  __resetYouTubeLiveCache: mocks.reset,
  youtubeErrorCode: (err: unknown) => (err instanceof Error && /^youtube_[a-z0-9_]+$/.test(err.message) ? err.message : 'youtube_live_error'),
}))

import { getYouTubeSyncStatus, syncYouTubeLives, SYNC_JOB } from './youtube-sync-server'

const ID = 'culte123456'
const upcoming = { id: ID, snippet: { title: 'Culte', scheduledStartTime: '2026-11-16T09:00:00Z', channelId: 'UCtest' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }

type Calls = { inserts: Array<Record<string, unknown>>; updates: Array<{ patch: Record<string, unknown>; id: string }>; cronInserts: number; cronUpdates: Array<Record<string, unknown>> }

function database(rows: Array<Record<string, unknown>>, opts: { failWrites?: boolean; lastRun?: Record<string, unknown> | null } = {}): Calls {
  const calls: Calls = { inserts: [], updates: [], cronInserts: 0, cronUpdates: [] }
  mocks.from.mockImplementation((table: string) => {
    if (table === 'cms_lives') {
      return {
        select: () => ({ or: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }),
        insert: async (row: Record<string, unknown>) => { if (opts.failWrites) return { error: { message: 'boom' } }; calls.inserts.push(row); return { error: null } },
        update: (patch: Record<string, unknown>) => ({ eq: async (_k: string, id: string) => { if (opts.failWrites) return { error: { message: 'boom' } }; calls.updates.push({ patch, id }); return { error: null } } }),
      }
    }
    if (table === 'cron_runs') {
      return {
        insert: () => ({ select: () => ({ single: async () => { calls.cronInserts++; return { data: { id: 'run-1' }, error: null } } }) }),
        update: (patch: Record<string, unknown>) => ({ eq: async () => { calls.cronUpdates.push(patch); return { error: null } } }),
        select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: opts.lastRun ?? null, error: null }) }) }) }) }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })
  return calls
}

describe('syncYouTubeLives', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.config.mockReturnValue({ clientId: 'c', clientSecret: 's', refreshToken: 'r', channelId: null }); mocks.fetchVideoDetails.mockResolvedValue([]) })

  it('creates the scheduled row, journals the run and resets the detector cache', async () => {
    const calls = database([])
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z'), trigger: 'cron' })
    expect(summary).toMatchObject({ ok: true, error: null, inserted: 1, updated: 0, lifecycle: { scheduled: 1 } })
    expect(calls.inserts[0]).toMatchObject({ title: 'Culte', status: 'scheduled', youtube_url: `https://www.youtube.com/watch?v=${ID}`, platform: 'YouTube', sort_order: 0 })
    expect(calls.cronInserts).toBe(1)
    expect(calls.cronUpdates[0]).toMatchObject({ ok: true, summary: { trigger: 'cron', inserted: 1 } })
    expect(mocks.reset).toHaveBeenCalled()
    expect(JSON.stringify(summary)).not.toMatch(/refresh|secret/i)
  })

  it('is a no-op on a second pass (idempotent) and does not reset the cache', async () => {
    const calls = database([{ id: 'row-1', title: 'Culte', youtube_url: `https://youtu.be/${ID}`, status: 'scheduled', is_live: false, scheduled_at: '2026-11-16T09:00:00Z', platform: 'YouTube', cover_url: 'x', description: 'y' }])
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(summary).toMatchObject({ ok: true, inserted: 0, updated: 0 })
    expect(calls.inserts).toHaveLength(0); expect(calls.updates).toHaveLength(0)
    expect(mocks.reset).not.toHaveBeenCalled()
  })

  it('verifies pending replays through videos.list and publishes them as ended', async () => {
    const calls = database([{ id: 'row-1', title: 'Culte', youtube_url: `https://youtu.be/${ID}`, status: 'replay_pending', is_live: false }])
    mocks.fetchOwnedBroadcasts.mockResolvedValue([])
    mocks.fetchVideoDetails.mockResolvedValue([{ id: ID, snippet: { liveBroadcastContent: 'none' }, status: { uploadStatus: 'processed', privacyStatus: 'public' } }])
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(mocks.fetchVideoDetails).toHaveBeenCalledWith([ID], expect.anything())
    expect(calls.updates[0]).toMatchObject({ id: 'row-1', patch: { status: 'ended' } })
    expect(summary.lifecycle.replay_available).toBe(1)
  })

  it('reports a non-sensitive YouTube error and journals it without writing cms_lives', async () => {
    const calls = database([])
    mocks.fetchOwnedBroadcasts.mockRejectedValue(new Error('youtube_oauth_invalid_grant'))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(summary).toMatchObject({ ok: false, error: 'youtube_oauth_invalid_grant', inserted: 0, updated: 0 })
    expect(calls.inserts).toHaveLength(0)
    expect(calls.cronUpdates[0]).toMatchObject({ ok: false, summary: { error: 'youtube_oauth_invalid_grant' } })
  })

  it('counts write failures without aborting the whole pass', async () => {
    database([], { failWrites: true })
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(summary).toMatchObject({ ok: false, error: 'cms_lives_write_failed', writeErrors: 1 })
  })

  it('refuses to run without OAuth configuration', async () => {
    mocks.config.mockReturnValue(null)
    await expect(syncYouTubeLives()).resolves.toMatchObject({ ok: false, error: 'youtube_oauth_not_configured' })
    expect(mocks.fetchOwnedBroadcasts).not.toHaveBeenCalled()
  })

  it('exposes the last run and lifecycle counts for the admin panel', async () => {
    database([{ id: 'a', status: 'scheduled', youtube_url: `https://youtu.be/${ID}` }, { id: 'b', status: 'replay_pending', youtube_url: 'https://youtu.be/abcdefghijk' }], { lastRun: { started_at: '2026-11-15T09:55:00Z', finished_at: '2026-11-15T09:55:02Z', ok: false, summary: { error: 'youtube_live_403' } } })
    const status = await getYouTubeSyncStatus()
    expect(status).toEqual({ configured: true, lastRun: { startedAt: '2026-11-15T09:55:00Z', finishedAt: '2026-11-15T09:55:02Z', ok: false, summary: { error: 'youtube_live_403' } }, states: { scheduled: 1, live: 0, replayPending: 1, replayAvailable: 0 } })
    expect(SYNC_JOB).toBe('youtube-live-sync')
  })
})
