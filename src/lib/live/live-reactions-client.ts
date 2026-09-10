import {
  REACTION_TYPES,
  parseReactionCounts,
  type ReactionCounts,
  type ReactionType,
} from './live-reactions'

import {
  getOrCreateGuestSessionId,
  type LivePresenceCrypto,
  type LivePresenceStorage,
} from './live-presence-client'

const API_PATH = '/api/live/reactions'
const GUEST_STORAGE_KEY = 'citadelle_live_guest_session_id_v1'

const LIVE_KEY_RE = /^youtube:[A-Za-z0-9_-]{11}$/
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const GET_TIMEOUT_MS = 2_000
const POST_TIMEOUT_MS = 4_000
const IDLE_POLL_MS = 15_000
const EVENT_REFRESH_MIN_MS = 2_000

type FailureReason =
  | 'invalid_request'
  | 'identity_required'
  | 'not_live'
  | 'live_changed'
  | 'closed'
  | 'rate_limited'
  | 'unavailable'

export type ReactionEvent = {
  eventId: string
  liveKey: string
  reaction: ReactionType
  acceptedAt: string
}

export type LiveReactionSnapshot =
  | {
      ok: true
      live: true
      state: 'open'
      liveKey: string
      uniqueByType: ReactionCounts
      serverTime: string
    }
  | {
      ok: true
      live: false
      state: 'not_live' | 'closed'
    }
  | {
      ok: false
      reason: 'unavailable'
    }

export type ReactionRecordResult =
  | {
      ok: true
      liveKey: string
      event: {
        eventId: string
        reaction: ReactionType
        acceptedAt: string
      }
      remaining: number
    }
  | {
      ok: false
      reason: Exclude<FailureReason, 'rate_limited'>
    }
  | {
      ok: false
      reason: 'rate_limited'
      retryAfterMs: number
    }

export type ReactionTransportState =
  | 'connecting'
  | 'subscribed'
  | 'degraded'

export type ReactionClientState = {
  context:
    | 'loading'
    | 'open'
    | 'not_live'
    | 'closed'
    | 'unavailable'
  liveKey: string | null
  uniqueByType: ReactionCounts | null
  stale: boolean
  send:
    | 'idle'
    | 'pending'
    | 'rate_limited'
    | 'uncertain'
  retryUntil: number | null
  transport: ReactionTransportState
}

export type ReactionClockSample = {
  serverTime: string
  sentWall: number
  receivedWall: number
  receivedMono: number
}

type FetchLike = typeof fetch

type ReactionControllerDeps = {
  fetcher?: FetchLike
  now: () => number
  wallNow: () => number
  guestId: () => string | undefined
  onState: (state: ReactionClientState) => void
  onEvent: (event: ReactionEvent) => void
  onClock: (sample: ReactionClockSample) => void
  onReset: () => void
}

export type ReactionController = {
  setContext(videoId: string | null, enabled: boolean): void
  refresh(): Promise<void>
  send(reaction: ReactionType): Promise<void>
  receive(event: ReactionEvent): void
  transport(status: ReactionTransportState): void
  dispose(): void
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value)

  return (
    actual.length === keys.length &&
    actual.every(key => keys.includes(key))
  )
}

function isReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === 'string' &&
    REACTION_TYPES.includes(value as ReactionType)
  )
}

function isLiveKey(value: unknown): value is string {
  return typeof value === 'string' && LIVE_KEY_RE.test(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value))
  )
}

function isSafeCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
}

function unavailableSnapshot(): LiveReactionSnapshot {
  return { ok: false, reason: 'unavailable' }
}

function unavailableRecord(): ReactionRecordResult {
  return { ok: false, reason: 'unavailable' }
}

function parseSnapshot(value: unknown): LiveReactionSnapshot {
  if (!isObject(value)) return unavailableSnapshot()

  if (
    hasExactKeys(value, ['ok', 'live', 'state']) &&
    value.ok === true &&
    value.live === false &&
    (value.state === 'not_live' || value.state === 'closed')
  ) {
    return {
      ok: true,
      live: false,
      state: value.state,
    }
  }

  if (
    !hasExactKeys(
      value,
      ['ok', 'live', 'state', 'liveKey', 'uniqueByType', 'serverTime'],
    ) ||
    value.ok !== true ||
    value.live !== true ||
    value.state !== 'open' ||
    !isLiveKey(value.liveKey) ||
    !isIsoDate(value.serverTime)
  ) {
    return unavailableSnapshot()
  }

  const counts = parseReactionCounts(value.uniqueByType)

  if (!counts) return unavailableSnapshot()

  return {
    ok: true,
    live: true,
    state: 'open',
    liveKey: value.liveKey,
    uniqueByType: counts,
    serverTime: value.serverTime,
  }
}

function parseRecord(value: unknown): ReactionRecordResult {
  if (!isObject(value)) return unavailableRecord()

  if (value.ok === true) {
    if (
      !hasExactKeys(value, ['ok', 'liveKey', 'event', 'remaining']) ||
      !isLiveKey(value.liveKey) ||
      !isSafeCount(value.remaining) ||
      value.remaining > 2 ||
      !isObject(value.event) ||
      !hasExactKeys(value.event, ['eventId', 'reaction', 'acceptedAt']) ||
      !isUuid(value.event.eventId) ||
      !isReactionType(value.event.reaction) ||
      !isIsoDate(value.event.acceptedAt)
    ) {
      return unavailableRecord()
    }

    return {
      ok: true,
      liveKey: value.liveKey,
      event: {
        eventId: value.event.eventId,
        reaction: value.event.reaction,
        acceptedAt: value.event.acceptedAt,
      },
      remaining: value.remaining,
    }
  }

  if (value.ok !== false || typeof value.reason !== 'string') {
    return unavailableRecord()
  }

  if (value.reason === 'rate_limited') {
    if (
      !hasExactKeys(value, ['ok', 'reason', 'retryAfterMs']) ||
      !isSafeCount(value.retryAfterMs) ||
      value.retryAfterMs <= 0
    ) {
      return unavailableRecord()
    }

    return {
      ok: false,
      reason: 'rate_limited',
      retryAfterMs: value.retryAfterMs,
    }
  }

  if (
    !hasExactKeys(value, ['ok', 'reason']) ||
    ![
      'invalid_request',
      'identity_required',
      'not_live',
      'live_changed',
      'closed',
      'unavailable',
    ].includes(value.reason)
  ) {
    return unavailableRecord()
  }

  return {
    ok: false,
    reason: value.reason as
      | 'invalid_request'
      | 'identity_required'
      | 'not_live'
      | 'live_changed'
      | 'closed'
      | 'unavailable',
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function requestReactionSnapshot(
  fetcher: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<LiveReactionSnapshot> {
  try {
    const response = await fetcher(API_PATH, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal,
    })

    return parseSnapshot(await readJson(response))
  } catch {
    return unavailableSnapshot()
  }
}

export async function requestLiveReaction(
  input: {
    reaction: ReactionType
    guestSessionId?: string
    expectedLiveKey: string
  },
  fetcher: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<ReactionRecordResult> {
  try {
    const body =
      input.guestSessionId === undefined
        ? { reaction: input.reaction }
        : {
            reaction: input.reaction,
            guestSessionId: input.guestSessionId,
          }

    const response = await fetcher(API_PATH, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Live-Context': input.expectedLiveKey,
      },
      body: JSON.stringify(body),
      signal,
    })

    return parseRecord(await readJson(response))
  } catch {
    return unavailableRecord()
  }
}

function normalizeUuid(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const normalized = value.trim().toLowerCase()

  return UUID_RE.test(normalized)
    ? normalized
    : undefined
}

export function createReactionGuestIdentity(
  deps: {
    getStorage: () => LivePresenceStorage
    cryptoApi: LivePresenceCrypto
  },
): {
  get: () => string | undefined
  adopt: (event: { key: string | null; newValue: string | null }) => void
} {
  let memory: string | undefined

  function acquireStorage(): LivePresenceStorage | undefined {
    try {
      return deps.getStorage()
    } catch {
      return undefined
    }
  }

  function get(): string | undefined {
    const storage = acquireStorage()

    if (storage) {
      try {
        const stored = normalizeUuid(
          storage.getItem(GUEST_STORAGE_KEY),
        )

        if (stored) {
          memory = stored
          return stored
        }
      } catch {
        // Storage read failure is isolated.
      }
    }

    if (memory) return memory

    const facade: LivePresenceStorage = {
      getItem(key: string) {
        if (key !== GUEST_STORAGE_KEY) return null

        if (storage) {
          try {
            const value = storage.getItem(key)
            if (value !== null) return value
          } catch {
            // Fall through to memory.
          }
        }

        return memory ?? null
      },

      setItem(key: string, value: string) {
        const normalized = normalizeUuid(value)

        if (key === GUEST_STORAGE_KEY && normalized) {
          memory = normalized
        }

        if (storage) {
          try {
            storage.setItem(key, value)
          } catch {
            // Memory remains the durable fallback for this tab.
          }
        }
      },
    }

    try {
      const generated = normalizeUuid(
        getOrCreateGuestSessionId(
          facade,
          deps.cryptoApi,
        ),
      )

      if (generated) {
        memory = generated
        return generated
      }
    } catch {
      return undefined
    }

    return undefined
  }

  function adopt(
    event: {
      key: string | null
      newValue: string | null
    },
  ): void {
    if (event.key !== GUEST_STORAGE_KEY) return

    const adopted = normalizeUuid(event.newValue)

    if (!adopted) {
      return
    }

    memory = adopted

    const storage = acquireStorage()

    if (storage) {
      try {
        storage.setItem(GUEST_STORAGE_KEY, adopted)
      } catch {
        // Adoption remains valid in memory.
      }
    }
  }

  return { get, adopt }
}

function copyCounts(value: ReactionCounts): ReactionCounts {
  return {
    prayer: value.prayer,
    fire: value.fire,
    heart: value.heart,
    praise: value.praise,
    kingdom: value.kingdom,
  }
}

function countsRegress(
  previous: ReactionCounts,
  next: ReactionCounts,
): boolean {
  return REACTION_TYPES.some(
    reaction => next[reaction] < previous[reaction],
  )
}

export function createReactionController(
  deps: ReactionControllerDeps,
): ReactionController {
  const fetcher = deps.fetcher ?? fetch

  let generation = 0
  let disposed = false
  let enabled = false
  let videoId: string | null = null
  let expectedLiveKey: string | null = null

  let getInFlight = false
  let getPromise: Promise<void> | null = null
  let getAbort: AbortController | null = null

  let postAbort: AbortController | null = null

  let dirty = false
  let lastGetStartedAt = Number.NEGATIVE_INFINITY

  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let getTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  let postTimeoutTimer: ReturnType<typeof setTimeout> | null = null

  let state: ReactionClientState = {
    context: 'loading',
    liveKey: null,
    uniqueByType: null,
    stale: false,
    send: 'idle',
    retryUntil: null,
    transport: 'connecting',
  }

  function emit(patch?: Partial<ReactionClientState>) {
    if (disposed) return

    state = {
      ...state,
      ...(patch ?? {}),
    }

    deps.onState({
      ...state,
      uniqueByType: state.uniqueByType
        ? copyCounts(state.uniqueByType)
        : null,
    })
  }

  function clearTimer(
    timer: ReturnType<typeof setTimeout> | null,
  ) {
    if (timer !== null) clearTimeout(timer)
  }

  function clearAllTimers() {
    clearTimer(refreshTimer)
    clearTimer(pollTimer)
    clearTimer(getTimeoutTimer)
    clearTimer(postTimeoutTimer)

    refreshTimer = null
    pollTimer = null
    getTimeoutTimer = null
    postTimeoutTimer = null
  }

  function abortPending() {
    getAbort?.abort()
    postAbort?.abort()

    getAbort = null
    postAbort = null
  }

  function browserVisible(): boolean {
    return (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
    )
  }

  function scheduleIdlePoll(localGeneration: number) {
    clearTimer(pollTimer)
    pollTimer = null

    if (
      disposed ||
      !enabled ||
      localGeneration !== generation ||
      !browserVisible()
    ) {
      return
    }

    pollTimer = setTimeout(() => {
      pollTimer = null

      if (
        disposed ||
        !enabled ||
        localGeneration !== generation
      ) {
        return
      }

      void refresh()

      scheduleIdlePoll(localGeneration)
    }, IDLE_POLL_MS)
  }

  function resetForContext() {
    dirty = false
    getInFlight = false
    getPromise = null
    lastGetStartedAt = Number.NEGATIVE_INFINITY

    clearAllTimers()
    abortPending()
  }

  function markLoading() {
    emit({
      context: 'loading',
      liveKey: null,
      uniqueByType: null,
      stale: false,
      send: 'idle',
      retryUntil: null,
    })
  }

  function scheduleTrailingRefresh(localGeneration: number) {
    if (
      disposed ||
      !enabled ||
      localGeneration !== generation
    ) {
      return
    }

    const elapsed = deps.now() - lastGetStartedAt
    const delay = Math.max(
      0,
      EVENT_REFRESH_MIN_MS - elapsed,
    )

    clearTimer(refreshTimer)

    refreshTimer = setTimeout(() => {
      refreshTimer = null

      if (
        disposed ||
        !enabled ||
        localGeneration !== generation
      ) {
        return
      }

      void refresh()
    }, delay)
  }

  async function refresh(): Promise<void> {
    if (
      disposed ||
      !enabled ||
      !expectedLiveKey
    ) {
      return
    }

    const localGeneration = generation

    if (getInFlight) {
      dirty = true
      return getPromise ?? Promise.resolve()
    }

    const elapsed = deps.now() - lastGetStartedAt

    if (
      Number.isFinite(lastGetStartedAt) &&
      elapsed < EVENT_REFRESH_MIN_MS &&
      dirty
    ) {
      scheduleTrailingRefresh(localGeneration)
      return
    }

    dirty = false
    getInFlight = true
    lastGetStartedAt = deps.now()

    const controller = new AbortController()
    getAbort = controller

    const sentWall = deps.wallNow()

    const timeout = new Promise<'timeout'>(resolve => {
      getTimeoutTimer = setTimeout(() => {
        controller.abort()
        resolve('timeout')
      }, GET_TIMEOUT_MS)
    })

    const task = (async () => {
      const result = await Promise.race([
        requestReactionSnapshot(
          fetcher,
          controller.signal,
        ),
        timeout,
      ])

      clearTimer(getTimeoutTimer)
      getTimeoutTimer = null

      if (
        disposed ||
        localGeneration !== generation ||
        !enabled
      ) {
        return
      }

      const snapshot =
        result === 'timeout'
          ? unavailableSnapshot()
          : result

      if (!snapshot.ok) {
        emit({
          context: 'unavailable',
          stale: state.uniqueByType !== null,
        })
        return
      }

      if (!snapshot.live) {
        emit({
          context: snapshot.state,
          liveKey: null,
          uniqueByType: null,
          stale: false,
          send: 'idle',
          retryUntil: null,
        })
        return
      }

      if (snapshot.liveKey !== expectedLiveKey) {
        deps.onReset()
        markLoading()
        return
      }

      const receivedWall = deps.wallNow()
      const receivedMono = deps.now()

      deps.onClock({
        serverTime: snapshot.serverTime,
        sentWall,
        receivedWall,
        receivedMono,
      })

      if (
        state.liveKey === snapshot.liveKey &&
        state.uniqueByType &&
        countsRegress(
          state.uniqueByType,
          snapshot.uniqueByType,
        )
      ) {
        emit({
          context: 'open',
          liveKey: snapshot.liveKey,
          uniqueByType: state.uniqueByType,
          stale: true,
        })
        return
      }

      emit({
        context: 'open',
        liveKey: snapshot.liveKey,
        uniqueByType: copyCounts(snapshot.uniqueByType),
        stale: false,
      })

      scheduleIdlePoll(localGeneration)
    })()

    getPromise = task

    try {
      await task
    } finally {
      if (localGeneration === generation) {
        getInFlight = false
        getPromise = null

        if (getAbort === controller) {
          getAbort = null
        }

        if (dirty) {
          scheduleTrailingRefresh(localGeneration)
        }
      }
    }
  }

  async function send(
    reaction: ReactionType,
  ): Promise<void> {
    if (
      disposed ||
      !enabled ||
      !expectedLiveKey ||
      !isReactionType(reaction)
    ) {
      return
    }

    if (
      state.context === 'unavailable' ||
      state.context === 'not_live' ||
      state.context === 'closed'
    ) {
      return
    }

    const currentNow = deps.now()

    if (
      state.retryUntil !== null &&
      currentNow < state.retryUntil
    ) {
      emit({
        send: 'rate_limited',
      })
      return
    }

    const localGeneration = generation
    const localLiveKey = expectedLiveKey

    const controller = new AbortController()
    postAbort?.abort()
    postAbort = controller

    emit({
      send: 'pending',
      retryUntil:
        state.retryUntil !== null &&
        currentNow >= state.retryUntil
          ? null
          : state.retryUntil,
    })

    let timedOut = false

    const timeout = new Promise<'timeout'>(resolve => {
      postTimeoutTimer = setTimeout(() => {
        timedOut = true
        controller.abort()
        resolve('timeout')
      }, POST_TIMEOUT_MS)
    })

    const guestSessionId = deps.guestId()

    const request = requestLiveReaction(
      {
        reaction,
        ...(guestSessionId
          ? { guestSessionId }
          : {}),
        expectedLiveKey: localLiveKey,
      },
      fetcher,
      controller.signal,
    )

    const result = await Promise.race([
      request,
      timeout,
    ])

    clearTimer(postTimeoutTimer)
    postTimeoutTimer = null

    if (
      disposed ||
      localGeneration !== generation ||
      !enabled
    ) {
      return
    }

    if (postAbort === controller) {
      postAbort = null
    }

    if (result === 'timeout' || timedOut) {
      emit({
        send: 'uncertain',
      })
      return
    }

    if (result.ok) {
      if (result.liveKey !== localLiveKey) {
        deps.onReset()
        markLoading()
        dirty = true
        scheduleTrailingRefresh(localGeneration)
        return
      }

      emit({
        send: 'idle',
        retryUntil: null,
      })

      deps.onEvent({
        eventId: result.event.eventId,
        liveKey: result.liveKey,
        reaction: result.event.reaction,
        acceptedAt: result.event.acceptedAt,
      })

      dirty = true
      scheduleTrailingRefresh(localGeneration)
      return
    }

    if (result.reason === 'rate_limited') {
      const retryUntil =
        deps.now() + result.retryAfterMs

      emit({
        send: 'rate_limited',
        retryUntil,
      })
      return
    }

    if (
      result.reason === 'not_live' ||
      result.reason === 'live_changed' ||
      result.reason === 'closed'
    ) {
      deps.onReset()
      markLoading()
      dirty = true
      await refresh()
      return
    }

    if (result.reason === 'unavailable') {
      emit({
        send: 'uncertain',
      })
      return
    }

    emit({
      send: 'idle',
    })
  }

  function receive(event: ReactionEvent): void {
    if (
      disposed ||
      !enabled ||
      !expectedLiveKey ||
      event.liveKey !== expectedLiveKey ||
      !isUuid(event.eventId) ||
      !isReactionType(event.reaction) ||
      !isIsoDate(event.acceptedAt)
    ) {
      return
    }

    deps.onEvent(event)

    dirty = true

    if (!getInFlight) {
      scheduleTrailingRefresh(generation)
    }
  }

  function transport(
    status: ReactionTransportState,
  ): void {
    if (disposed) return

    emit({
      transport: status,
    })

    if (status === 'subscribed') {
      deps.onReset()
      dirty = true

      if (!getInFlight) {
        scheduleTrailingRefresh(generation)
      }
    }
  }

  function setContext(
    nextVideoId: string | null,
    nextEnabled: boolean,
  ): void {
    generation += 1
    resetForContext()

    enabled =
      nextEnabled &&
      typeof nextVideoId === 'string' &&
      VIDEO_ID_RE.test(nextVideoId)

    videoId = enabled
      ? nextVideoId
      : null

    expectedLiveKey = videoId
      ? `youtube:${videoId}`
      : null

    deps.onReset()

    if (!enabled || !expectedLiveKey) {
      emit({
        context: 'not_live',
        liveKey: null,
        uniqueByType: null,
        stale: false,
        send: 'idle',
        retryUntil: null,
      })
      return
    }

    markLoading()
    void refresh()
  }

  function dispose(): void {
    if (disposed) return

    disposed = true
    generation += 1
    enabled = false
    videoId = null
    expectedLiveKey = null

    resetForContext()
  }

  emit()

  return {
    setContext,
    refresh,
    send,
    receive,
    transport,
    dispose,
  }
}