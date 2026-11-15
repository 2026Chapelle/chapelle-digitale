import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), fetchOwnedBroadcasts: vi.fn(), fetchVideoDetails: vi.fn(), reset: vi.fn(), config: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }))
vi.mock('@/lib/intelligence/connectors/youtube/config', () => ({ loadYouTubeConfig: mocks.config }))
vi.mock('@/lib/home/youtube-live', () => ({
  fetchOwnedBroadcasts: mocks.fetchOwnedBroadcasts,
  fetchVideoDetails: mocks.fetchVideoDetails,
  __resetYouTubeLiveCache: mocks.reset,
  youtubeErrorCode: (err: unknown) => (err instanceof Error && /^youtube_[a-z0-9_]+$/.test(err.message) ? err.message : 'youtube_live_error'),
}))

import { __resetYouTubeSyncLock, getYouTubeSyncStatus, syncYouTubeLives, SYNC_JOB } from './youtube-sync-server'

const ID = 'culte123456'
const upcoming = { id: ID, snippet: { title: 'Culte', scheduledStartTime: '2026-11-16T09:00:00Z', channelId: 'UCtest' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'public' } }

type Calls = { inserts: Array<Record<string, unknown>>; updates: Array<{ patch: Record<string, unknown>; id: string }>; deletes: string[]; cronInserts: number; cronUpdates: Array<Record<string, unknown>>; lock: { acquire: string[]; release: string[] } }
type DbOptions = { failWrites?: boolean; lastRun?: Record<string, unknown> | null; twins?: Array<Record<string, unknown>>; lockMissing?: boolean }

/**
 * Faux magasin de verrou reproduisant la sémantique ATOMIQUE de `acquire_sync_lock` : un seul détenteur
 * tant que le bail n'a pas expiré ou n'a pas été libéré par son propriétaire (JS mono-thread ⇒ atomique).
 */
function lockStore() {
  const state: { owner: string | null; until: number } = { owner: null, until: 0 }
  return {
    state,
    acquire(owner: string, ttl: number, nowMs = Date.now()) {
      if (state.owner === null || state.until <= nowMs || state.owner === owner) { state.owner = owner; state.until = nowMs + ttl * 1000; return true }
      return false
    },
    release(owner: string) { if (state.owner === owner) { state.until = 0; return true } return false },
  }
}

/** Mock Supabase chaîné : chaque opération résout selon la table et l'intention (lecture, insertion, mise à jour, journal, RPC). */
function database(rows: Array<Record<string, unknown>>, opts: DbOptions = {}, locks = lockStore()): Calls {
  const calls: Calls = { inserts: [], updates: [], deletes: [], cronInserts: 0, cronUpdates: [], lock: { acquire: [], release: [] } }
  const chain = (resolve: () => Promise<unknown>) => {
    const node: Record<string, unknown> = {}
    for (const m of ['select', 'or', 'order', 'limit', 'eq', 'is', 'gte', 'ilike', 'maybeSingle', 'single']) node[m] = () => node
    node.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resolve().then(ok, ko)
    return node
  }
  mocks.rpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    if (opts.lockMissing) return { data: null, error: { code: 'PGRST202', message: 'function not found' } }
    if (fn === 'acquire_sync_lock') { calls.lock.acquire.push(String(args.p_owner)); return { data: locks.acquire(String(args.p_owner), Number(args.p_ttl_seconds)), error: null } }
    if (fn === 'release_sync_lock') { calls.lock.release.push(String(args.p_owner)); return { data: locks.release(String(args.p_owner)), error: null } }
    throw new Error(`unexpected rpc ${fn}`)
  })
  mocks.from.mockImplementation((table: string) => {
    if (table === 'cms_lives') {
      return {
        select: (cols: string) => cols.startsWith('id,youtube_url,created_at')
          ? chain(async () => ({ data: opts.twins ?? [], error: null }))
          : chain(async () => ({ data: rows, error: null })),
        insert: (row: Record<string, unknown>) => chain(async () => { if (opts.failWrites) return { error: { message: 'boom' } }; calls.inserts.push(row); return { data: null, error: null } }),
        update: (patch: Record<string, unknown>) => ({ eq: async (_k: string, id: string) => { if (opts.failWrites) return { error: { message: 'boom' } }; calls.updates.push({ patch, id }); return { error: null } } }),
        delete: () => { throw new Error('cms_lives rows must never be deleted') },
      }
    }
    if (table === 'cron_runs') {
      return {
        insert: () => chain(async () => { calls.cronInserts++; return { data: { id: 'run-1' }, error: null } }),
        update: (patch: Record<string, unknown>) => ({ eq: async () => { calls.cronUpdates.push(patch); return { error: null } } }),
        select: () => chain(async () => ({ data: opts.lastRun ?? null, error: null })),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })
  return calls
}

describe('syncYouTubeLives', () => {
  beforeEach(() => { vi.clearAllMocks(); __resetYouTubeSyncLock(); mocks.config.mockReturnValue({ clientId: 'c', clientSecret: 's', refreshToken: 'r', channelId: null }); mocks.fetchVideoDetails.mockResolvedValue([]) })

  it('creates the scheduled row, journals the run and resets the detector cache', async () => {
    const calls = database([])
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z'), trigger: 'cron' })
    expect(summary).toMatchObject({ ok: true, error: null, inserted: 1, updated: 0, lifecycle: { scheduled: 1 } })
    expect(calls.inserts[0]).toMatchObject({ title: 'Culte', status: 'scheduled', youtube_url: `https://www.youtube.com/watch?v=${ID}`, platform: 'YouTube', sort_order: 0 })
    expect(calls.cronInserts).toBe(1)
    expect(calls.cronUpdates[0]).toMatchObject({ ok: true, summary: { trigger: 'cron', inserted: 1, duplicates: [] } })
    expect(calls.lock.acquire).toHaveLength(1)
    expect(calls.lock.release).toEqual(calls.lock.acquire)
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
    mocks.fetchVideoDetails.mockResolvedValue([{ id: ID, snippet: { liveBroadcastContent: 'none' }, status: { uploadStatus: 'processed', privacyStatus: 'public', embeddable: true }, contentDetails: { duration: 'PT1H' }, liveStreamingDetails: { actualEndTime: '2026-11-15T09:00:00Z' } }])
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

  it('does not publish an archive whose accessibility is uncertain (missing fields)', async () => {
    const calls = database([{ id: 'row-1', title: 'Culte', description: 'd', cover_url: 'c', platform: 'YouTube', youtube_url: `https://youtu.be/${ID}`, status: 'replay_pending', is_live: false }])
    mocks.fetchOwnedBroadcasts.mockResolvedValue([])
    mocks.fetchVideoDetails.mockResolvedValue([{ id: ID, snippet: { liveBroadcastContent: 'none' }, status: { uploadStatus: 'processed', privacyStatus: 'public' } }])
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(calls.updates).toHaveLength(0)
    expect(calls.updates.some(u => u.patch.status === 'ended')).toBe(false)
    expect(summary).toMatchObject({ ok: true, pendingVideoIds: [ID], skipped: [{ videoId: ID, reason: 'uncertain' }] })
  })

  it('serialises concurrent calls in the same process (single YouTube read, single insert)', async () => {
    const calls = database([])
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const [a, b] = await Promise.all([syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z'), trigger: 'cron' }), syncYouTubeLives({ now: new Date('2026-11-15T10:00:01Z'), trigger: 'admin' })])
    expect(a).toBe(b)
    expect(calls.inserts).toHaveLength(1)
    expect(mocks.fetchOwnedBroadcasts).toHaveBeenCalledTimes(3)
  })

  it('refuses to run when the atomic lock function is unavailable (migration not applied) — never a non-atomic fallback', async () => {
    const calls = database([], { lockMissing: true })
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(summary).toMatchObject({ ok: false, error: 'sync_lock_unavailable', inserted: 0 })
    expect(mocks.fetchOwnedBroadcasts).not.toHaveBeenCalled()
    expect(calls.inserts).toHaveLength(0)
    expect(calls.cronInserts).toBe(0)
  })

  it('reports as busy when another process holds the lock, without reading YouTube or writing', async () => {
    const locks = lockStore(); locks.acquire('other-process:1', 240)
    const calls = database([], {}, locks)
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(summary).toMatchObject({ ok: true, error: 'sync_already_running', inserted: 0 })
    expect(mocks.fetchOwnedBroadcasts).not.toHaveBeenCalled()
    expect(calls.inserts).toHaveLength(0)
    expect(calls.lock.release).toEqual([])
  })

  it('releases the lock even when the pass fails, and a later pass can acquire it', async () => {
    const locks = lockStore()
    const calls = database([], {}, locks)
    mocks.fetchOwnedBroadcasts.mockRejectedValue(new Error('youtube_live_503'))
    await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(calls.lock.release).toHaveLength(1)
    expect(locks.state.until).toBe(0)
    __resetYouTubeSyncLock()
    mocks.fetchOwnedBroadcasts.mockResolvedValue([])
    await expect(syncYouTubeLives({ now: new Date('2026-11-15T10:05:00Z') })).resolves.toMatchObject({ ok: true, error: null })
  })

  it('two concurrent synchronisations in DIFFERENT processes: exactly one runs, no duplicate row, no deletion', async () => {
    const locks = lockStore()
    const calls = database([], {}, locks)
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => { await gate; return status === 'upcoming' ? [upcoming] : [] })
    // Deux instances de module = deux processus Passenger (aucun verrou intra-processus partagé).
    vi.resetModules()
    const processA = await import('./youtube-sync-server')
    vi.resetModules()
    const processB = await import('./youtube-sync-server')
    const runA = processA.syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z'), trigger: 'cron' })
    const runB = processB.syncYouTubeLives({ now: new Date('2026-11-15T10:00:00.500Z'), trigger: 'admin' })
    await new Promise(r => setTimeout(r, 10))
    release()
    const [a, b] = await Promise.all([runA, runB])
    const results = [a, b].sort((x, y) => (x.error === null ? -1 : 1) - (y.error === null ? -1 : 1))
    expect(results[0]).toMatchObject({ ok: true, error: null, inserted: 1 })
    expect(results[1]).toMatchObject({ ok: true, error: 'sync_already_running', inserted: 0 })
    expect(calls.lock.acquire).toHaveLength(2)
    expect(calls.lock.release).toHaveLength(1)
    expect(calls.inserts).toHaveLength(1)
    expect(calls.deletes).toEqual([])
    expect(mocks.fetchOwnedBroadcasts).toHaveBeenCalledTimes(3)
  })

  it('never deletes a cms_lives row: a detected duplicate is only reported', async () => {
    const calls = database([], { twins: [{ id: 'older', youtube_url: `https://www.youtube.com/watch?v=${ID}`, created_at: '2026-11-15T09:59:59Z' }, { id: 'new-1', youtube_url: `https://www.youtube.com/watch?v=${ID}`, created_at: '2026-11-15T10:00:00Z' }] })
    mocks.fetchOwnedBroadcasts.mockImplementation(async (status: string) => (status === 'upcoming' ? [upcoming] : []))
    const summary = await syncYouTubeLives({ now: new Date('2026-11-15T10:00:00Z') })
    expect(calls.deletes).toEqual([])
    expect(summary).toMatchObject({ ok: true, inserted: 1, duplicates: [ID] })
    expect(calls.cronUpdates[0]).toMatchObject({ summary: { duplicates: [ID] } })
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
