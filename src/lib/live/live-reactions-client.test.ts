import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createReactionController,
  createReactionGuestIdentity,
  requestLiveReaction,
  requestReactionSnapshot,
  type ReactionClientState,
} from './live-reactions-client'

const GUEST = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_GUEST = '550e8400-e29b-41d4-a716-446655440001'
const LIVE = 'youtube:ABCDEFGHIJK'
const OTHER_LIVE = 'youtube:LMNOPQRSTUV'
const COUNTS = { prayer: 1, fire: 2, heart: 0, praise: 0, kingdom: 0 }

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
}

function open(liveKey = LIVE, uniqueByType = COUNTS) {
  return { ok: true, live: true, state: 'open', liveKey, uniqueByType, serverTime: '2026-09-10T10:00:00.000Z' }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function storage(values = new Map<string, string>()) {
  return { values, getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => values.set(key, value)) }
}

function controller(fetcher: typeof fetch, state: ReactionClientState[] = []) {
  const events: unknown[] = []
  const clocks: unknown[] = []
  const resets = vi.fn()
  const api = createReactionController({
    fetcher, now: () => Date.now(), wallNow: () => Date.now(), guestId: () => GUEST,
    onState: nextState => state.push(structuredClone(nextState)), onEvent: event => events.push(event),
    onClock: sample => clocks.push(sample), onReset: resets,
  })
  return { api, state, events, clocks, resets }
}

describe('LIVE reaction request client', () => {
  afterEach(() => vi.useRealTimers())

  it('requests the canonical no-store snapshot with same-origin credentials and validates its public shape', async () => {
    const fetcher = vi.fn(async () => json(open())) as unknown as typeof fetch
    await expect(requestReactionSnapshot(fetcher)).resolves.toEqual(open())
    expect(fetcher).toHaveBeenCalledWith('/api/live/reactions', expect.objectContaining({ method: 'GET', cache: 'no-store', credentials: 'same-origin' }))
  })

  it('fails closed for malformed snapshot responses', async () => {
    await expect(requestReactionSnapshot((async () => json({ ok: true, live: true, state: 'open', liveKey: LIVE })) as typeof fetch)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('posts exactly once with only reaction and optional guest identity in its body', async () => {
    const fetcher = vi.fn(async () => json({ ok: true, liveKey: LIVE, event: { eventId: '11111111-1111-4111-8111-111111111111', reaction: 'fire', acceptedAt: '2026-09-10T10:00:00.000Z' }, remaining: 2 })) as unknown as typeof fetch
    await expect(requestLiveReaction({ reaction: 'fire', guestSessionId: GUEST, expectedLiveKey: LIVE }, fetcher)).resolves.toMatchObject({ ok: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
    const init = vi.mocked(fetcher).mock.calls[0][1]!
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'same-origin' })
    expect(new Headers(init.headers).get('X-Live-Context')).toBe(LIVE)
    expect(JSON.parse(String(init.body))).toEqual({ reaction: 'fire', guestSessionId: GUEST })
  })

  it('omits unavailable guest identity and converts malformed or lost POST responses to unavailable without retry', async () => {
    const malformed = vi.fn(async () => json({ ok: true, liveKey: LIVE })) as unknown as typeof fetch
    await expect(requestLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE }, malformed)).resolves.toEqual({ ok: false, reason: 'unavailable' })
    expect(JSON.parse(String(vi.mocked(malformed).mock.calls[0][1]!.body))).toEqual({ reaction: 'fire' })
    const lost = vi.fn(async () => { throw new TypeError('lost') }) as unknown as typeof fetch
    await expect(requestLiveReaction({ reaction: 'fire', expectedLiveKey: LIVE }, lost)).resolves.toEqual({ ok: false, reason: 'unavailable' })
    expect(lost).toHaveBeenCalledTimes(1)
  })
})

describe('shared reaction guest identity', () => {
  it('reuses a stored normalized UUID and re-reads storage so another tab wins', () => {
    const store = storage(new Map([['citadelle_live_guest_session_id_v1', ` ${GUEST.toUpperCase()} `]]))
    const identity = createReactionGuestIdentity({ getStorage: () => store, cryptoApi: { randomUUID: () => OTHER_GUEST, getRandomValues: array => array } })
    expect(identity.get()).toBe(GUEST)
    store.values.set('citadelle_live_guest_session_id_v1', OTHER_GUEST)
    expect(identity.get()).toBe(OTHER_GUEST)
  })

  it('uses the existing UUID helper once, adopts a valid storage event, and does not regenerate on removal', () => {
    const store = storage()
    const randomUUID = vi.fn(() => GUEST)
    const identity = createReactionGuestIdentity({ getStorage: () => store, cryptoApi: { randomUUID, getRandomValues: array => array } })
    expect(identity.get()).toBe(GUEST)
    identity.adopt({ key: 'citadelle_live_guest_session_id_v1', newValue: OTHER_GUEST.toUpperCase() })
    expect(identity.get()).toBe(OTHER_GUEST)
    identity.adopt({ key: 'citadelle_live_guest_session_id_v1', newValue: null })
    expect(identity.get()).toBe(OTHER_GUEST)
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  it('isolates storage acquisition/read/write and crypto failures', () => {
    const crypto = { randomUUID: () => GUEST, getRandomValues: (array: Uint8Array) => array }
    expect(createReactionGuestIdentity({ getStorage: () => { throw new Error('blocked') }, cryptoApi: crypto }).get()).toBe(GUEST)
    expect(createReactionGuestIdentity({ getStorage: () => ({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }), cryptoApi: crypto }).get()).toBe(GUEST)
    expect(createReactionGuestIdentity({ getStorage: () => storage(), cryptoApi: { randomUUID: () => { throw new Error('crypto') }, getRandomValues: () => { throw new Error('crypto') } } }).get()).toBeUndefined()
  })
})

describe('reaction context controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  it('starts with absent counts, accepts only a snapshot matching displayed video, and samples the clock', async () => {
    const { api, state, clocks } = controller((async () => json(open())) as typeof fetch)
    expect(state.at(-1)).toMatchObject({ context: 'loading', uniqueByType: null })
    api.setContext('ABCDEFGHIJK', true)
    await vi.runAllTimersAsync()
    expect(state.at(-1)).toMatchObject({ context: 'open', liveKey: LIVE, uniqueByType: COUNTS })
    expect(clocks).toHaveLength(1)
  })

  it('resets a mismatched live snapshot rather than displaying it', async () => {
    const { api, state, resets } = controller((async () => json(open(OTHER_LIVE))) as typeof fetch)
    api.setContext('ABCDEFGHIJK', true)
    await vi.runAllTimersAsync()
    expect(state.at(-1)).toMatchObject({ context: 'loading', liveKey: null, uniqueByType: null })
    expect(resets).toHaveBeenCalled()
  })

  it('keeps one GET in flight, coalesces an event into one trailing refresh, and never increments counts from the event', async () => {
    const first = deferred<Response>()
    const fetcher = vi.fn(() => first.promise) as unknown as typeof fetch
    const { api, state, events } = controller(fetcher)
    api.setContext('ABCDEFGHIJK', true)
    api.refresh(); api.receive({ eventId: '11111111-1111-4111-8111-111111111111', reaction: 'fire', acceptedAt: '2026-09-10T10:00:00.000Z', liveKey: LIVE })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(events).toHaveLength(1)
    first.resolve(json(open()))
    await vi.runAllTimersAsync()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(state.at(-1)).toMatchObject({ uniqueByType: COUNTS })
  })

  it('ignores stale GET and POST completions after a context switch', async () => {
    const oldGet = deferred<Response>(); const oldPost = deferred<Response>()
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST' ? oldPost.promise : oldGet.promise) as unknown as typeof fetch
    const { api, state } = controller(fetcher)
    api.setContext('ABCDEFGHIJK', true); const sent = api.send('fire'); api.setContext('LMNOPQRSTUV', true)
    oldGet.resolve(json(open())); oldPost.resolve(json({ ok: true, liveKey: LIVE, event: { eventId: '11111111-1111-4111-8111-111111111111', reaction: 'fire', acceptedAt: '2026-09-10T10:00:00.000Z' }, remaining: 2 }))
    await sent; await vi.runAllTimersAsync()
    expect(state.at(-1)).not.toMatchObject({ liveKey: LIVE })
  })

  it('samples guest identity exactly once for one reaction send', async () => {
    const guestId = vi.fn()
      .mockReturnValueOnce(GUEST)
      .mockReturnValueOnce(OTHER_GUEST)

    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return json(open())

      return json({
        ok: true,
        liveKey: LIVE,
        event: {
          eventId: '11111111-1111-4111-8111-111111111111',
          reaction: 'fire',
          acceptedAt: '2026-09-10T10:00:00.000Z',
        },
        remaining: 2,
      })
    }) as unknown as typeof fetch

    const state: ReactionClientState[] = []

    const api = createReactionController({
      fetcher,
      now: () => Date.now(),
      wallNow: () => Date.now(),
      guestId,
      onState: nextState => state.push(structuredClone(nextState)),
      onEvent: () => undefined,
      onClock: () => undefined,
      onReset: () => undefined,
    })

    api.setContext('ABCDEFGHIJK', true)
    await vi.runAllTimersAsync()

    await api.send('fire')

    expect(guestId).toHaveBeenCalledTimes(1)

    const postCall = vi.mocked(fetcher).mock.calls.find(
      ([, init]) => init?.method === 'POST',
    )

    expect(postCall).toBeDefined()

    expect(JSON.parse(String(postCall![1]!.body))).toEqual({
      reaction: 'fire',
      guestSessionId: GUEST,
    })

    api.dispose()
  })
  it('classifies an exactly-once lost POST response as uncertain after 4000ms', async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST' ? new Promise<Response>(() => {}) : Promise.resolve(json(open()))) as unknown as typeof fetch
    const { api, state } = controller(fetcher)
    api.setContext('ABCDEFGHIJK', true); await vi.runAllTimersAsync(); void api.send('fire')
    await vi.advanceTimersByTimeAsync(4_000)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(state.at(-1)).toMatchObject({ send: 'uncertain' })
  })

  it('uses the server retry duration as a monotonic retry deadline and resets/refreshes on 409 result', async () => {
    let call = 0
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return json(open())
      call++; return json(call === 1 ? { ok: false, reason: 'rate_limited', retryAfterMs: 1200 } : { ok: false, reason: 'live_changed' }, call === 1 ? 429 : 409)
    }) as unknown as typeof fetch
    const { api, state, resets } = controller(fetcher)
    api.setContext('ABCDEFGHIJK', true); await vi.runAllTimersAsync(); await api.send('fire')
    expect(state.at(-1)).toMatchObject({ send: 'rate_limited', retryUntil: 1200 })
    await vi.advanceTimersByTimeAsync(1200); await api.send('fire')
    expect(resets).toHaveBeenCalled()
  })

  it('preserves lower same-run counts as stale, suspends unavailable snapshots, but transport degradation alone leaves sending available', async () => {
    const snapshots = [open(), open(LIVE, { ...COUNTS, fire: 1 }), { ok: false, reason: 'unavailable' }]
    const { api, state } = controller((async () => json(snapshots.shift())) as typeof fetch)
    api.setContext('ABCDEFGHIJK', true); await vi.runAllTimersAsync(); await api.refresh()
    expect(state.at(-1)).toMatchObject({ uniqueByType: COUNTS, stale: true })
    api.transport('degraded'); expect(state.at(-1)).toMatchObject({ transport: 'degraded', context: 'open' })
    await api.refresh(); expect(state.at(-1)).toMatchObject({ context: 'unavailable', stale: true })
  })

  it('uses 15s idle polling, a 2s event refresh minimum, 2s GET timeout, and clears pending work on disable/dispose', async () => {
    const pending = deferred<Response>()
    const fetcher = vi.fn(() => pending.promise) as unknown as typeof fetch
    const { api } = controller(fetcher)
    api.setContext('ABCDEFGHIJK', true); await vi.advanceTimersByTimeAsync(2_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    api.setContext('ABCDEFGHIJK', false); await vi.advanceTimersByTimeAsync(30_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    api.dispose()
  })
})
