import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  canonical: vi.fn(),
  identity: vi.fn(),
  rpc: vi.fn(),
  abortSignal: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./canonical-server', () => ({
  getCanonicalLiveState: mocks.canonical,
  liveKeyFromState: (state: { status?: string; youtubeVideoId?: string }) =>
    state.status === 'LIVE' && /^[A-Za-z0-9_-]{11}$/.test(state.youtubeVideoId?.trim() ?? '')
      ? `youtube:${state.youtubeVideoId!.trim()}`
      : null,
}))
vi.mock('./live-reaction-identity-server', () => ({ resolveLiveReactionActor: mocks.identity }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))

import {
  getLiveReactionAdminAggregate,
  getLiveReactionSnapshot,
  recordLiveReaction,
} from './live-reactions-server'

const LIVE = 'youtube:ABCDEFGHIJK'
const OTHER_LIVE = 'youtube:LMNOPQRSTUV'
const EVENT = '11111111-1111-4111-8111-111111111111'
const ACCEPTED_AT = '2026-09-09T12:00:00.000Z'
const SERVER_TIME = '2026-09-09T12:00:01.000Z'
const ZERO = { prayer: 0, fire: 0, heart: 0, praise: 0, kingdom: 0 }
const AGGREGATE = {
  uniqueActors: 2,
  totalActions: 3,
  uniqueByType: { prayer: 1, fire: 1, heart: 0, praise: 0, kingdom: 0 },
  actionsByType: { prayer: 2, fire: 1, heart: 0, praise: 0, kingdom: 0 },
}

function live(videoId = 'ABCDEFGHIJK') {
  return { status: 'LIVE', youtubeVideoId: videoId }
}

function rpcResult(data: unknown, error: unknown = null) {
  mocks.abortSignal.mockImplementation(() => Promise.resolve({ data, error }))
  mocks.rpc.mockReturnValue({ abortSignal: mocks.abortSignal })
}

describe('LIVE 4B.2 canonical-bound reaction server engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.canonical.mockResolvedValue(live())
    mocks.identity.mockResolvedValue({ ok: true, actorKey: 'guest:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })
    rpcResult({ accepted: true, eventId: EVENT, acceptedAt: ACCEPTED_AT, remaining: 2 })
  })

  afterEach(() => vi.useRealTimers())

  it('rejects an invalid reaction before canonical, identity, or database work', async () => {
    await expect(recordLiveReaction({ reaction: 'sparkle', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'invalid_request' })
    expect(mocks.canonical).not.toHaveBeenCalled()
    expect(mocks.identity).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it.each([
    [{ status: 'OFFLINE' }, 'offline'],
    [{ status: 'UPCOMING' }, 'upcoming'],
    [{ status: 'LIVE', youtubeVideoId: 'bad' }, 'invalid video'],
  ])('stops %s canonical state before identity and database work', async (state, _label) => {
    mocks.canonical.mockResolvedValue(state)
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'not_live' })
    expect(mocks.identity).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('does not write when the displayed context is stale', async () => {
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: OTHER_LIVE })).resolves.toEqual({ ok: false, reason: 'live_changed' })
    expect(mocks.identity).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it.each(['identity_required', 'unavailable'] as const)('normalizes %s identity failures without a write', async (reason) => {
    mocks.identity.mockResolvedValue({ ok: false, reason })
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('does not re-resolve canonical identity work at or below two seconds', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValueOnce(10_000).mockReturnValueOnce(12_000)
    await recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })
    expect(mocks.canonical).toHaveBeenCalledTimes(1)
    expect(mocks.rpc).toHaveBeenCalledWith('live_reaction_record', expect.any(Object))
    expect(now).toHaveBeenCalled()
  })

  it('rechecks canonical after identity work exceeds two seconds and denies a changed live without a write', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(10_000).mockReturnValueOnce(12_001)
    mocks.canonical.mockResolvedValueOnce(live()).mockResolvedValueOnce(live('LMNOPQRSTUV'))
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'live_changed' })
    expect(mocks.canonical).toHaveBeenCalledTimes(2)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('denies a canonical live that disappears on the mandatory recheck without a stale write', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(10_000).mockReturnValueOnce(12_001)
    mocks.canonical.mockResolvedValueOnce(live()).mockResolvedValueOnce({ status: 'OFFLINE' })
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'not_live' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('binds one record RPC to the canonical key with the exact validation deadline and arguments', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(50_000)
    await expect(recordLiveReaction({ reaction: 'fire', guestSessionId: 'guest', expectedLiveKey: LIVE })).resolves.toEqual({
      ok: true, liveKey: LIVE, event: { eventId: EVENT, reaction: 'fire', acceptedAt: ACCEPTED_AT }, remaining: 2,
    })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.rpc).toHaveBeenCalledWith('live_reaction_record', {
      p_live_key: LIVE,
      p_actor_key: expect.stringMatching(/^guest:/),
      p_reaction: 'fire',
      p_validation_expires_at: new Date(52_000).toISOString(),
    })
    expect(mocks.abortSignal).toHaveBeenCalledTimes(1)
    expect(mocks.abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
  })

  it('fails closed for timeout, thrown, and rejected RPC responses without retrying', async () => {
    vi.useFakeTimers()
    mocks.abortSignal.mockReturnValue(new Promise(() => {}))
    mocks.rpc.mockReturnValue({ abortSignal: mocks.abortSignal })
    const timedOut = recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(timedOut).resolves.toEqual({ ok: false, reason: 'unavailable' })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)

    mocks.rpc.mockImplementation(() => { throw new Error('network') })
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'unavailable' })

    rpcResult(null, { message: 'database failure' })
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('preserves valid rate-limited and closed results', async () => {
    rpcResult({ accepted: false, reason: 'rate_limited', retryAfterMs: 789 })
    await expect(recordLiveReaction({ reaction: 'heart', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'rate_limited', retryAfterMs: 789 })
    rpcResult({ accepted: false, reason: 'closed' })
    await expect(recordLiveReaction({ reaction: 'heart', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'closed' })
  })

  it.each([
    [{ accepted: true, eventId: EVENT, acceptedAt: ACCEPTED_AT, remaining: 3 }],
    [{ accepted: true, eventId: EVENT, acceptedAt: ACCEPTED_AT, remaining: 2, reaction: 'heart' }],
    [{ accepted: true, eventId: 'not-a-uuid', acceptedAt: ACCEPTED_AT, remaining: 2 }],
    [{ accepted: true, eventId: EVENT, acceptedAt: ACCEPTED_AT, remaining: 2, liveKey: OTHER_LIVE }],
  ])('fails closed for malformed or mismatched accepted record payloads', async (payload) => {
    rpcResult(payload)
    await expect(recordLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE })).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('resolves snapshots without actor work and projects only public unique counts', async () => {
    rpcResult({ state: 'open', liveKey: LIVE, stats: { ...AGGREGATE, uniqueByType: ZERO }, serverTime: SERVER_TIME })
    await expect(getLiveReactionSnapshot()).resolves.toEqual({ ok: true, live: true, liveKey: LIVE, state: 'open', uniqueByType: ZERO, serverTime: SERVER_TIME })
    expect(mocks.identity).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith('live_reaction_snapshot', { p_live_key: LIVE })
    const result = await getLiveReactionSnapshot()
    expect(result).not.toHaveProperty('totalActions')
    expect(result).not.toHaveProperty('actionsByType')
    expect(result).not.toHaveProperty('uniqueActors')
  })

  it('does not read a snapshot when canonical is offline and recognizes closed snapshots', async () => {
    mocks.canonical.mockResolvedValueOnce({ status: 'OFFLINE' })
    await expect(getLiveReactionSnapshot()).resolves.toEqual({ ok: true, live: false, state: 'not_live' })
    expect(mocks.rpc).not.toHaveBeenCalled()
    rpcResult({ state: 'closed', liveKey: LIVE, stats: AGGREGATE, serverTime: SERVER_TIME })
    await expect(getLiveReactionSnapshot()).resolves.toEqual({ ok: true, live: false, state: 'closed' })
  })

  it.each([
    [{ state: 'open', liveKey: LIVE, stats: { ...AGGREGATE, uniqueByType: { ...ZERO, fire: '1' } }, serverTime: SERVER_TIME }],
    [{ state: 'open', liveKey: LIVE, stats: { ...AGGREGATE, uniqueByType: { ...ZERO, fire: Number.MAX_SAFE_INTEGER + 1 } }, serverTime: SERVER_TIME }],
    [{ state: 'open', liveKey: LIVE, stats: null, serverTime: SERVER_TIME }],
  ])('fails closed for malformed snapshot counts', async (payload) => {
    rpcResult(payload)
    await expect(getLiveReactionSnapshot()).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('uses the supplied admin key without canonical or identity resolution and accepts genuine zero aggregates', async () => {
    rpcResult({ uniqueActors: 0, totalActions: 0, uniqueByType: ZERO, actionsByType: ZERO })
    await expect(getLiveReactionAdminAggregate(OTHER_LIVE)).resolves.toEqual({ available: true, uniqueActors: 0, totalActions: 0, uniqueByType: ZERO, actionsByType: ZERO })
    expect(mocks.canonical).not.toHaveBeenCalled()
    expect(mocks.identity).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith('live_reaction_admin_counts', { p_live_key: OTHER_LIVE })
  })

  it('fails closed for invalid admin keys, malformed aggregates, and database errors', async () => {
    await expect(getLiveReactionAdminAggregate('title-index')).resolves.toEqual({ available: false })
    expect(mocks.rpc).not.toHaveBeenCalled()
    rpcResult({ uniqueActors: 1, totalActions: 0, uniqueByType: ZERO, actionsByType: ZERO })
    await expect(getLiveReactionAdminAggregate(LIVE)).resolves.toEqual({ available: false })
    rpcResult(null, { message: 'read failure' })
    await expect(getLiveReactionAdminAggregate(LIVE)).resolves.toEqual({ available: false })
  })
})
