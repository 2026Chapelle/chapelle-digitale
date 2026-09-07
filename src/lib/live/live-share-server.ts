import 'server-only'

import {
  getCanonicalLiveState,
  liveKeyFromState,
} from '@/lib/live/canonical-server'

import {
  getVerifiedRouteProfile,
} from '@/lib/member-auth'

import {
  supabaseAdmin,
} from '@/lib/supabase'

import {
  hashGuestSessionId,
  normalizeGuestSessionId,
} from '@/lib/live/live-participation-server'

export type LiveShareActionKind =
  | 'native_share'
  | 'copy_link'

export type LiveShareFailureReason =
  | 'invalid_action'
  | 'not_live'
  | 'identity_required'
  | 'unavailable'

type ShareInput = {
  actionKind: LiveShareActionKind
  guestSessionId?: unknown
}

type ShareSuccess = {
  ok: true
  participantKind:
    | 'member'
    | 'guest'
}

type ShareFailure = {
  ok: false
  reason: LiveShareFailureReason
}

export type LiveShareResult =
  | ShareSuccess
  | ShareFailure

function isActionKind(
  value: unknown,
): value is LiveShareActionKind {
  return (
    value === 'native_share' ||
    value === 'copy_link'
  )
}

export async function recordLiveShareAction(
  input: ShareInput,
): Promise<LiveShareResult> {
  try {
    if (!isActionKind(input.actionKind)) {
      return {
        ok: false,
        reason: 'invalid_action',
      }
    }

    const canonical =
      await getCanonicalLiveState()

    const liveKey =
      liveKeyFromState(canonical)

    if (!liveKey) {
      return {
        ok: false,
        reason: 'not_live',
      }
    }

    const profile =
      await getVerifiedRouteProfile()

    if (profile?.uid) {
      const { error } =
        await supabaseAdmin
          .from('live_share_actions')
          .insert({
            live_key: liveKey,
            participant_kind: 'member',
            user_id: profile.uid,
            guest_session_hash: null,
            action_kind:
              input.actionKind,
          })

      if (error) {
        return {
          ok: false,
          reason: 'unavailable',
        }
      }

      return {
        ok: true,
        participantKind: 'member',
      }
    }

    const guestSessionId =
      normalizeGuestSessionId(
        input.guestSessionId,
      )

    if (!guestSessionId) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    const guestSessionHash =
      hashGuestSessionId(
        guestSessionId,
      )

    const { error } =
      await supabaseAdmin
        .from('live_share_actions')
        .insert({
          live_key: liveKey,
          participant_kind: 'guest',
          user_id: null,
          guest_session_hash:
            guestSessionHash,
          action_kind:
            input.actionKind,
        })

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      participantKind: 'guest',
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}