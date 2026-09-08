import 'server-only'

import {
  getCanonicalLiveState,
  liveKeyFromState,
} from '@/lib/live/canonical-server'

import {
  getLivePresenceCounts,
} from '@/lib/live/live-participation-server'

import {
  supabaseAdmin,
} from '@/lib/supabase'

type AvailablePresence = {
  available: true
  activeTotal: number
  activeMembers: number
  activeGuests: number
  joinedTotal: number
}

type UnavailableAggregate = {
  available: false
}

type AvailableShares = {
  available: true
  totalActions: number
  nativeShare: number
  copyLink: number
}

export type LiveAdminSupervisionData = {
  live: boolean
  canonical: {
    status: string
    title: string | null
    youtubeVideoId: string | null
  }
  presence:
    | AvailablePresence
    | UnavailableAggregate
    | null
  shares:
    | AvailableShares
    | UnavailableAggregate
    | null
}

type ShareCountResult =
  | {
      ok: true
      count: number
    }
  | {
      ok: false
    }

function canonicalTitle(
  state: unknown,
): string | null {
  if (
    !state ||
    typeof state !== 'object'
  ) {
    return null
  }

  const row =
    state as Record<
      string,
      unknown
    >

  const candidate =
    typeof row.titre === 'string'
      ? row.titre
      : typeof row.title === 'string'
        ? row.title
        : null

  const trimmed =
    candidate?.trim() ?? ''

  return trimmed || null
}

function canonicalVideoId(
  state: unknown,
): string | null {
  if (
    !state ||
    typeof state !== 'object'
  ) {
    return null
  }

  const value =
    (
      state as Record<
        string,
        unknown
      >
    ).youtubeVideoId

  if (
    typeof value !== 'string'
  ) {
    return null
  }

  const trimmed =
    value.trim()

  return trimmed || null
}

async function countShareKind(
  liveKey: string,
  actionKind:
    | 'native_share'
    | 'copy_link',
): Promise<ShareCountResult> {
  try {
    const {
      count,
      error,
    } =
      await supabaseAdmin
        .from('live_share_actions')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )
        .eq(
          'live_key',
          liveKey,
        )
        .eq(
          'action_kind',
          actionKind,
        )

    if (error) {
      return {
        ok: false,
      }
    }

    return {
      ok: true,
      count:
        typeof count === 'number' &&
        Number.isFinite(count) &&
        count >= 0
          ? Math.trunc(count)
          : 0,
    }
  } catch {
    return {
      ok: false,
    }
  }
}

export async function getLiveAdminSupervision():
  Promise<LiveAdminSupervisionData> {
  const canonical =
    await getCanonicalLiveState()

  const status =
    typeof canonical.status ===
      'string'
      ? canonical.status
      : 'OFFLINE'

  const canonicalData = {
    status,
    title:
      canonicalTitle(canonical),
    youtubeVideoId:
      canonicalVideoId(
        canonical,
      ),
  }

  const liveKey =
    liveKeyFromState(canonical)

  if (!liveKey) {
    return {
      live: false,
      canonical:
        canonicalData,
      presence: null,
      shares: null,
    }
  }

  const [
    presenceResult,
    nativeResult,
    copyResult,
  ] =
    await Promise.all([
      getLivePresenceCounts(),
      countShareKind(
        liveKey,
        'native_share',
      ),
      countShareKind(
        liveKey,
        'copy_link',
      ),
    ])

  const presence =
    presenceResult.ok &&
    presenceResult.liveKey ===
      liveKey
      ? {
          available: true as const,
          activeTotal:
            presenceResult.activeTotal,
          activeMembers:
            presenceResult.activeMembers,
          activeGuests:
            presenceResult.activeGuests,
          joinedTotal:
            presenceResult.joinedTotal,
        }
      : {
          available: false as const,
        }

  const shares =
    nativeResult.ok &&
    copyResult.ok
      ? {
          available: true as const,
          totalActions:
            nativeResult.count +
            copyResult.count,
          nativeShare:
            nativeResult.count,
          copyLink:
            copyResult.count,
        }
      : {
          available: false as const,
        }

  return {
    live: true,
    canonical:
      canonicalData,
    presence,
    shares,
  }
}