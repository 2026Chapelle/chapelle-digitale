import type { SupabaseClient } from '@supabase/supabase-js'

import {
  REACTION_TYPES,
  type ReactionType,
} from './live-reactions'

import type { ReactionEvent } from './live-reactions-client'

const LIVE_KEY_RE = /^youtube:[A-Za-z0-9_-]{11}$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DEDUPE_LIMIT = 512
const DEDUPE_TTL_MS = 60_000

export type ReactionRealtimeStatus =
  | 'connecting'
  | 'subscribed'
  | 'degraded'

export type ReactionDedupe = {
  accept: (event: ReactionEvent) => boolean
  clear: () => void
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
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

function isReactionType(
  value: unknown,
): value is ReactionType {
  return (
    typeof value === 'string' &&
    REACTION_TYPES.includes(value as ReactionType)
  )
}

function isLiveKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    LIVE_KEY_RE.test(value)
  )
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    UUID_RE.test(value)
  )
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value))
  )
}

function isValidReactionEvent(
  event: unknown,
): event is ReactionEvent {
  if (!isObject(event)) return false

  if (
    !hasExactKeys(
      event,
      ['eventId', 'liveKey', 'reaction', 'acceptedAt'],
    )
  ) {
    return false
  }

  return (
    isUuid(event.eventId) &&
    isLiveKey(event.liveKey) &&
    isReactionType(event.reaction) &&
    isIsoDate(event.acceptedAt)
  )
}

function parseCommittedPayload(
  payload: unknown,
  expectedLiveKey: string,
): ReactionEvent | null {
  if (!isObject(payload)) return null

  if (
    payload.eventType !== 'INSERT' ||
    payload.schema !== 'public' ||
    payload.table !== 'live_reaction_events' ||
    !isObject(payload.new)
  ) {
    return null
  }

  const row = payload.new

  if (
    !hasExactKeys(
      row,
      ['event_id', 'live_key', 'reaction', 'accepted_at'],
    )
  ) {
    return null
  }

  if (
    !isUuid(row.event_id) ||
    !isLiveKey(row.live_key) ||
    row.live_key !== expectedLiveKey ||
    !isReactionType(row.reaction) ||
    !isIsoDate(row.accepted_at)
  ) {
    return null
  }

  return {
    eventId: row.event_id,
    liveKey: row.live_key,
    reaction: row.reaction,
    acceptedAt: row.accepted_at,
  }
}

export function createReactionDedupe(
  now: () => number,
): ReactionDedupe {
  const seen = new Map<string, number>()

  function prune(current: number): void {
    seen.forEach((acceptedAt, eventId) => {
      if (current - acceptedAt >= DEDUPE_TTL_MS) {
        seen.delete(eventId)
      }
    })

    while (seen.size > DEDUPE_LIMIT) {
      const oldest = seen.keys().next()

      if (oldest.done) break

      seen.delete(oldest.value)
    }
  }

  function accept(event: ReactionEvent): boolean {
    if (!isValidReactionEvent(event)) {
      return false
    }

    const current = now()

    prune(current)

    if (seen.has(event.eventId)) {
      return false
    }

    seen.set(event.eventId, current)

    while (seen.size > DEDUPE_LIMIT) {
      const oldest = seen.keys().next()

      if (oldest.done) break

      seen.delete(oldest.value)
    }

    return true
  }

  function clear(): void {
    seen.clear()
  }

  return {
    accept,
    clear,
  }
}

export function subscribeLiveReactionEvents(
  client: Pick<SupabaseClient, 'channel' | 'removeChannel'>,
  liveKey: string,
  onEvent: (event: ReactionEvent) => void,
  onStatus: (status: ReactionRealtimeStatus) => void,
): () => void {
  let active = true
  let removed = false

  onStatus('connecting')

  const channel = client.channel(
    `live-reactions:${liveKey}`,
  )

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_reaction_events',
        filter: `live_key=eq.${liveKey}`,
      },
      payload => {
        if (!active) return

        const event = parseCommittedPayload(
          payload,
          liveKey,
        )

        if (!event) return

        onEvent(event)
      },
    )
    .subscribe(status => {
      if (!active) return

      if (status === 'SUBSCRIBED') {
        onStatus('subscribed')
        return
      }

      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        onStatus('degraded')
      }
    })

  return () => {
    if (removed) return

    removed = true
    active = false

    void client.removeChannel(channel)
  }
}