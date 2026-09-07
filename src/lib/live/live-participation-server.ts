import 'server-only'

import { createHash } from 'node:crypto'
import {
  getCanonicalLiveState,
  liveKeyFromState,
} from '@/lib/live/canonical-server'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const LIVE_HEARTBEAT_INTERVAL_MS = 30_000
export const LIVE_PRESENCE_TTL_MS = 90_000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LiveParticipantKind =
  | 'member'
  | 'guest'

export type LivePresenceFailureReason =
  | 'not_live'
  | 'identity_required'
  | 'unavailable'

type JoinSuccess = {
  ok: true
  liveKey: string
  participantKind: LiveParticipantKind
}

type HeartbeatSuccess = {
  ok: true
  liveKey: string
  participantKind: LiveParticipantKind
  active: boolean
}

type CountsSuccess = {
  ok: true
  liveKey: string
  activeTotal: number
  activeMembers: number
  activeGuests: number
  joinedTotal: number
}

type Failure = {
  ok: false
  reason: LivePresenceFailureReason
}

export type LivePresenceJoinResult =
  | JoinSuccess
  | Failure

export type LivePresenceHeartbeatResult =
  | HeartbeatSuccess
  | Failure

export type LivePresenceCountsResult =
  | CountsSuccess
  | Failure

type PresenceInput = {
  guestSessionId?: unknown
}

type ParticipantIdentity =
  | {
      kind: 'member'
      userId: string
      guestSessionHash: string | null
    }
  | {
      kind: 'guest'
      userId: null
      guestSessionHash: string
    }

export function normalizeGuestSessionId(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()

  return UUID_RE.test(normalized)
    ? normalized
    : null
}

export function hashGuestSessionId(
  guestSessionId: string,
): string {
  return createHash('sha256')
    .update(guestSessionId, 'utf8')
    .digest('hex')
}

async function resolveActiveLiveKey():
  Promise<string | null> {
  const state = await getCanonicalLiveState()
  return liveKeyFromState(state)
}

async function resolveParticipantIdentity(
  guestSessionId: unknown,
): Promise<ParticipantIdentity | null> {
  const normalizedGuest =
    normalizeGuestSessionId(guestSessionId)

  const guestSessionHash = normalizedGuest
    ? hashGuestSessionId(normalizedGuest)
    : null

  const profile =
    await getVerifiedRouteProfile()

  if (profile?.uid) {
    return {
      kind: 'member',
      userId: profile.uid,
      guestSessionHash,
    }
  }

  if (!guestSessionHash) {
    return null
  }

  return {
    kind: 'guest',
    userId: null,
    guestSessionHash,
  }
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] === true
  }

  return false
}

function asCount(value: unknown): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.trunc(parsed)
}

function firstCountRow(
  data: unknown,
): Record<string, unknown> {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0] &&
    typeof data[0] === 'object'
  ) {
    return data[0] as Record<string, unknown>
  }

  if (
    data &&
    typeof data === 'object'
  ) {
    return data as Record<string, unknown>
  }

  return {}
}

export async function joinLivePresence(
  input: PresenceInput = {},
): Promise<LivePresenceJoinResult> {
  try {
    const liveKey = await resolveActiveLiveKey()

    if (!liveKey) {
      return {
        ok: false,
        reason: 'not_live',
      }
    }

    const identity =
      await resolveParticipantIdentity(
        input.guestSessionId,
      )

    if (!identity) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    const { error } = await supabaseAdmin.rpc(
      'live_presence_join',
      {
        p_live_key: liveKey,
        p_user_id: identity.userId,
        p_guest_session_hash:
          identity.guestSessionHash,
      },
    )

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      liveKey,
      participantKind: identity.kind,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function heartbeatLivePresence(
  input: PresenceInput = {},
): Promise<LivePresenceHeartbeatResult> {
  try {
    const liveKey = await resolveActiveLiveKey()

    if (!liveKey) {
      return {
        ok: false,
        reason: 'not_live',
      }
    }

    const identity =
      await resolveParticipantIdentity(
        input.guestSessionId,
      )

    if (!identity) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    const { data, error } =
      await supabaseAdmin.rpc(
        'live_presence_heartbeat',
        {
          p_live_key: liveKey,
          p_user_id: identity.userId,
          p_guest_session_hash:
            identity.guestSessionHash,
        },
      )

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      liveKey,
      participantKind: identity.kind,
      active: asBoolean(data),
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function getLivePresenceCounts(
  options: {
    now?: Date
  } = {},
): Promise<LivePresenceCountsResult> {
  try {
    const liveKey = await resolveActiveLiveKey()

    if (!liveKey) {
      return {
        ok: false,
        reason: 'not_live',
      }
    }

    const now = options.now ?? new Date()

    const activeSince = new Date(
      now.getTime() - LIVE_PRESENCE_TTL_MS,
    ).toISOString()

    const { data, error } =
      await supabaseAdmin.rpc(
        'live_presence_counts',
        {
          p_live_key: liveKey,
          p_active_since: activeSince,
        },
      )

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    const row = firstCountRow(data)

    return {
      ok: true,
      liveKey,
      activeTotal:
        asCount(row.active_total),
      activeMembers:
        asCount(row.active_members),
      activeGuests:
        asCount(row.active_guests),
      joinedTotal:
        asCount(row.joined_total),
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}