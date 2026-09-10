import 'server-only'

import { supabaseAdmin, supabaseCmsRead } from '@/lib/supabase'
import { getCanonicalLiveState, liveKeyFromState } from './canonical-server'
import { resolveLiveReactionActor } from './live-reaction-identity-server'
import { REACTION_TYPES, type ReactionCounts, type ReactionType, parseReactionCounts } from './live-reactions'
import {
  parseReactionYouTubeId,
  type ReplayReactionSnapshot,
} from './live-reaction-replay'

const LIVE_KEY_RE = /^youtube:[A-Za-z0-9_-]{11}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RPC_TIMEOUT_MS = 2_000

export type ReactionRecordResult =
  | { ok: true; liveKey: string; event: { eventId: string; reaction: ReactionType; acceptedAt: string }; remaining: number }
  | { ok: false; reason: 'invalid_request' | 'not_live' | 'live_changed' | 'identity_required' | 'unavailable' | 'closed' }
  | { ok: false; reason: 'rate_limited'; retryAfterMs: number }

export type LiveReactionSnapshot =
  | { ok: true; live: false; state: 'not_live' | 'closed' }
  | { ok: true; live: true; liveKey: string; state: 'open'; uniqueByType: ReactionCounts; serverTime: string }
  | { ok: false; reason: 'unavailable' }

export type ReactionAdminResult =
  | { available: true; uniqueActors: number; totalActions: number; uniqueByType: ReactionCounts; actionsByType: ReactionCounts }
  | { available: false }

type RpcEnvelope = { data: unknown; error: unknown }

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && (REACTION_TYPES as readonly string[]).includes(value)
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

function isLiveKey(value: unknown): value is string {
  return typeof value === 'string' && LIVE_KEY_RE.test(value)
}

function sumCounts(counts: ReactionCounts): number {
  return REACTION_TYPES.reduce((sum, type) => sum + counts[type], 0)
}

function parseReactionAggregate(value: unknown): ReactionAdminResult {
  if (!isObject(value)) return { available: false }

  const uniqueActors = value.uniqueActors
  const totalActions = value.totalActions
  const uniqueByType = parseReactionCounts(value.uniqueByType)
  const actionsByType = parseReactionCounts(value.actionsByType)

  if (!isSafeNonNegativeInteger(uniqueActors) || !isSafeNonNegativeInteger(totalActions) || !uniqueByType || !actionsByType) {
    return { available: false }
  }

  if (sumCounts(actionsByType) !== totalActions) return { available: false }

  for (const type of REACTION_TYPES) {
    if (uniqueByType[type] > actionsByType[type]) return { available: false }
  }

  const uniqueTypeSum = sumCounts(uniqueByType)

  if (totalActions === 0) {
    if (uniqueActors !== 0 || uniqueTypeSum !== 0) return { available: false }
  } else {
    if (uniqueActors === 0 || uniqueActors > totalActions) return { available: false }
    if (uniqueTypeSum === 0 || uniqueActors > uniqueTypeSum) return { available: false }
  }

  return {
    available: true,
    uniqueActors,
    totalActions,
    uniqueByType,
    actionsByType,
  }
}

async function callReactionRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const request = supabaseAdmin.rpc(name, args).abortSignal(controller.signal)

    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        controller.abort()
        resolve(null)
      }, RPC_TIMEOUT_MS)
    })

    const result = await Promise.race<RpcEnvelope | null>([
      Promise.resolve(request as unknown as PromiseLike<RpcEnvelope>),
      timeout,
    ])

    if (!result || result.error) return null

    return result.data
  } catch {
    return null
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

function canonicalKeyFromState(state: Awaited<ReturnType<typeof getCanonicalLiveState>>): string | null {
  return liveKeyFromState(state)
}

export async function recordLiveReaction(input: {
  reaction: unknown
  guestSessionId?: unknown
  expectedLiveKey: string
}): Promise<ReactionRecordResult> {
  if (!isReactionType(input.reaction)) {
    return { ok: false, reason: 'invalid_request' }
  }

  let canonicalState: Awaited<ReturnType<typeof getCanonicalLiveState>>

  try {
    canonicalState = await getCanonicalLiveState()
  } catch {
    return { ok: false, reason: 'not_live' }
  }

  let canonicalKey = canonicalKeyFromState(canonicalState)

  if (!canonicalKey) {
    return { ok: false, reason: 'not_live' }
  }

  if (canonicalKey !== input.expectedLiveKey) {
    return { ok: false, reason: 'live_changed' }
  }

  let canonicalResolvedAt = Date.now()
  const identityStartedAt = canonicalResolvedAt

  const actor = await resolveLiveReactionActor(input.guestSessionId)
  const identityFinishedAt = Date.now()

  if (!actor.ok) {
    return { ok: false, reason: actor.reason }
  }

  if (identityFinishedAt - identityStartedAt > RPC_TIMEOUT_MS) {
    let refreshedState: Awaited<ReturnType<typeof getCanonicalLiveState>>

    try {
      refreshedState = await getCanonicalLiveState()
    } catch {
      return { ok: false, reason: 'not_live' }
    }

    const refreshedKey = canonicalKeyFromState(refreshedState)

    if (!refreshedKey) {
      return { ok: false, reason: 'not_live' }
    }

    if (refreshedKey !== canonicalKey) {
      return { ok: false, reason: 'live_changed' }
    }

    canonicalKey = refreshedKey
    canonicalResolvedAt = Date.now()
  }

  const raw = await callReactionRpc('live_reaction_record', {
    p_live_key: canonicalKey,
    p_actor_key: actor.actorKey,
    p_reaction: input.reaction,
    p_validation_expires_at: new Date(canonicalResolvedAt + RPC_TIMEOUT_MS).toISOString(),
  })

  if (!isObject(raw)) {
    return { ok: false, reason: 'unavailable' }
  }

  if (raw.accepted === false) {
    if (raw.reason === 'closed') {
      return { ok: false, reason: 'closed' }
    }

    if (raw.reason === 'rate_limited' && isSafeNonNegativeInteger(raw.retryAfterMs) && raw.retryAfterMs > 0) {
      return { ok: false, reason: 'rate_limited', retryAfterMs: raw.retryAfterMs }
    }

    return { ok: false, reason: 'unavailable' }
  }

  if (raw.accepted !== true) {
    return { ok: false, reason: 'unavailable' }
  }

  if (!UUID_RE.test(String(raw.eventId ?? ''))) {
    return { ok: false, reason: 'unavailable' }
  }

  if (!isIsoTimestamp(raw.acceptedAt)) {
    return { ok: false, reason: 'unavailable' }
  }

  if (!isSafeNonNegativeInteger(raw.remaining) || raw.remaining > 2) {
    return { ok: false, reason: 'unavailable' }
  }

  if (Object.hasOwn(raw, 'reaction') && raw.reaction !== input.reaction) {
    return { ok: false, reason: 'unavailable' }
  }

  if (Object.hasOwn(raw, 'liveKey') && raw.liveKey !== canonicalKey) {
    return { ok: false, reason: 'unavailable' }
  }

  return {
    ok: true,
    liveKey: canonicalKey,
    event: {
      eventId: raw.eventId as string,
      reaction: input.reaction,
      acceptedAt: raw.acceptedAt,
    },
    remaining: raw.remaining,
  }
}

export async function getLiveReactionSnapshot(): Promise<LiveReactionSnapshot> {
  let canonicalState: Awaited<ReturnType<typeof getCanonicalLiveState>>

  try {
    canonicalState = await getCanonicalLiveState()
  } catch {
    return { ok: true, live: false, state: 'not_live' }
  }

  const liveKey = canonicalKeyFromState(canonicalState)

  if (!liveKey) {
    return { ok: true, live: false, state: 'not_live' }
  }

  const raw = await callReactionRpc('live_reaction_snapshot', {
    p_live_key: liveKey,
  })

  if (!isObject(raw)) {
    return { ok: false, reason: 'unavailable' }
  }

  if (raw.state === 'closed') {
    if (raw.liveKey !== liveKey || !isIsoTimestamp(raw.serverTime)) {
      return { ok: false, reason: 'unavailable' }
    }

    if (!isObject(raw.stats) || !parseReactionCounts(raw.stats.uniqueByType)) {
      return { ok: false, reason: 'unavailable' }
    }

    return { ok: true, live: false, state: 'closed' }
  }

  if (raw.state !== 'open' || raw.liveKey !== liveKey || !isIsoTimestamp(raw.serverTime)) {
    return { ok: false, reason: 'unavailable' }
  }

  if (!isObject(raw.stats)) {
    return { ok: false, reason: 'unavailable' }
  }

  const uniqueByType = parseReactionCounts(raw.stats.uniqueByType)

  if (!uniqueByType) {
    return { ok: false, reason: 'unavailable' }
  }

  return {
    ok: true,
    live: true,
    liveKey,
    state: 'open',
    uniqueByType,
    serverTime: raw.serverTime,
  }
}

export async function getLiveReactionAdminAggregate(liveKey: string): Promise<ReactionAdminResult> {
  if (!isLiveKey(liveKey)) {
    return { available: false }
  }

  const raw = await callReactionRpc('live_reaction_admin_counts', {
    p_live_key: liveKey,
  })

  return parseReactionAggregate(raw)
}
const CMS_REPLAY_TIMEOUT_MS = 2_000

type CmsReplayRow = {
  id: string
  youtube_url: string | null
  video_url: string | null
  status: string | null
  is_live: boolean | null
}

async function withReplayTimeout<T>(
  work: PromiseLike<T>,
): Promise<T | null> {
  let timer:
    | ReturnType<typeof setTimeout>
    | undefined

  try {
    const timeout =
      new Promise<null>(
        resolve => {
          timer = setTimeout(
            () => resolve(null),
            CMS_REPLAY_TIMEOUT_MS,
          )
        },
      )

    return await Promise.race([
      Promise.resolve(work),
      timeout,
    ])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

async function finalizeReplayReactionRun(
  liveKey: string,
): Promise<ReplayReactionSnapshot> {
  const raw =
    await callReactionRpc(
      'live_reaction_finalize',
      {
        p_live_key:
          liveKey,
      },
    )

  if (!isObject(raw)) {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  if (
    raw.state ===
      'not_recorded'
  ) {
    return {
      ok: false,
      reason:
        'not_recorded',
    }
  }

  if (
    raw.state !== 'final' ||
    raw.liveKey !== liveKey ||
    !isObject(raw.stats)
  ) {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  const aggregate =
    parseReactionAggregate(
      raw.stats,
    )

  if (!aggregate.available) {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  return {
    ok: true,
    state: 'final',
    liveKey,
    uniqueByType:
      aggregate.uniqueByType,
  }
}

export async function getReplayReactionSnapshot(
  cmsLiveId: string,
): Promise<ReplayReactionSnapshot> {
  if (!UUID_RE.test(cmsLiveId)) {
    return {
      ok: false,
      reason: 'not_found',
    }
  }

  let cmsResult:
    | {
        data:
          | CmsReplayRow
          | null
        error: unknown
      }
    | null

  try {
    const query =
      supabaseCmsRead
        .from('cms_lives')
        .select(
          'id,youtube_url,video_url,status,is_live',
        )
        .eq(
          'id',
          cmsLiveId,
        )
        .maybeSingle()

    cmsResult =
      await withReplayTimeout(
        query,
      )
  } catch {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  if (!cmsResult) {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  if (cmsResult.error) {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  const row =
    cmsResult.data

  if (!row) {
    return {
      ok: false,
      reason: 'not_found',
    }
  }

  if (
    (
      row.status !== 'ended' &&
      row.status !== 'published'
    ) ||
    row.is_live !== false
  ) {
    return {
      ok: false,
      reason: 'not_found',
    }
  }

  const primary =
    typeof row.youtube_url ===
      'string' &&
    row.youtube_url.trim() !== ''
      ? row.youtube_url
      : null

  const source =
    primary ??
    row.video_url

  const videoId =
    parseReactionYouTubeId(
      source,
    )

  if (!videoId) {
    return {
      ok: false,
      reason:
        'not_recorded',
    }
  }

  const liveKey =
    `youtube:${videoId}`

  let canonicalState:
    Awaited<
      ReturnType<
        typeof getCanonicalLiveState
      >
    >

  try {
    canonicalState =
      await getCanonicalLiveState()
  } catch {
    return {
      ok: false,
      reason:
        'unavailable',
    }
  }

  const canonicalKey =
    canonicalKeyFromState(
      canonicalState,
    )

  if (
    canonicalKey ===
    liveKey
  ) {
    return {
      ok: false,
      reason:
        'not_final',
    }
  }

  /*
   * Editorial replay publication is the explicit
   * end assertion for this exact CMS row.
   * Canonical OFFLINE fallback is intentionally
   * not treated as an independent YouTube end clock.
   *
   * Important: finalize does NOT create a run.
   * Never call live_reaction_snapshot here because
   * that RPC inserts a run when absent.
   */
  return finalizeReplayReactionRun(
    liveKey,
  )
}