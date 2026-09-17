import 'server-only'
import { createHmac, randomBytes } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { createRouteClient } from '@/lib/supabase-server'

export const LIVE_REPLAY_GUEST_COOKIE = 'citadelle_replay_guest_v1'

export type ReplayReactionIdentity =
  | {
      kind: 'member'
      actorKey: string
      userId: string
      guestActorKey: string | null
    }
  | {
      kind: 'guest'
      actorKey: string
      userId: null
      guestActorKey: string
    }

export type ReplayReactionIdentityFailure =
  | 'identity_required'
  | 'unavailable'

export class ReplayReactionIdentityError extends Error {
  readonly reason: ReplayReactionIdentityFailure

  constructor(reason: ReplayReactionIdentityFailure) {
    super(reason === 'identity_required'
      ? 'LIVE_REPLAY_REACTION_IDENTITY_REQUIRED'
      : 'LIVE_REPLAY_REACTION_IDENTITY_UNAVAILABLE')
    this.name = 'ReplayReactionIdentityError'
    this.reason = reason
  }
}

export type ReplayReactionIdentityResolution = {
  identity: ReplayReactionIdentity
  newGuestToken: string | null
}

const REPLAY_GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function hashReplayGuestToken(token: string, secret: string): string {
  if (secret.length < 32) {
    throw new Error('LIVE_REPLAY_GUEST_SECRET_INVALID')
  }

  return createHmac('sha256', secret)
    .update(token, 'utf8')
    .digest('hex')
}

function validReplayGuestToken(value: unknown): string | null {
  return typeof value === 'string' && REPLAY_GUEST_TOKEN_PATTERN.test(value)
    ? value
    : null
}

function hasPresentedAuth(cookieEntries: Array<{ name: string }>): boolean {
  return Boolean(headers().get('authorization')) || cookieEntries.some(
    ({ name }) =>
      /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i.test(name) ||
      name === 'supabase-auth-token',
  )
}

function guestActorKey(token: string): string {
  const secret = process.env.LIVE_REPLAY_GUEST_SECRET ?? ''

  try {
    return `guest:${hashReplayGuestToken(token, secret)}`
  } catch {
    throw new ReplayReactionIdentityError('unavailable')
  }
}

export async function resolveReplayReactionIdentity(): Promise<ReplayReactionIdentityResolution> {
  let cookieEntries: Array<{ name: string }>
  let replayGuestToken: string | null
  let presentedAuth: boolean

  try {
    const cookieStore = cookies()
    cookieEntries = cookieStore.getAll()
    replayGuestToken = validReplayGuestToken(
      cookieStore.get(LIVE_REPLAY_GUEST_COOKIE)?.value,
    )
    presentedAuth = hasPresentedAuth(cookieEntries)
  } catch {
    throw new ReplayReactionIdentityError('unavailable')
  }

  let authResult: Awaited<ReturnType<ReturnType<typeof createRouteClient>['auth']['getUser']>>

  try {
    authResult = await createRouteClient().auth.getUser()
  } catch {
    throw new ReplayReactionIdentityError('unavailable')
  }

  const { user } = authResult.data

  if (authResult.error) {
    const authError = authResult.error as {
      status?: number
      name?: string
    }
    const missingUnpresentedSession =
      authError.name === 'AuthSessionMissingError' && !presentedAuth

    if (!missingUnpresentedSession) {
      const identityFailure =
        authError.status === 400 ||
        authError.status === 401 ||
        authError.status === 403

      throw new ReplayReactionIdentityError(
        identityFailure ? 'identity_required' : 'unavailable',
      )
    }
  }

  if (user?.id) {
    let profile: Awaited<ReturnType<typeof getVerifiedRouteProfile>>

    try {
      profile = await getVerifiedRouteProfile()
    } catch {
      throw new ReplayReactionIdentityError('unavailable')
    }

    if (profile?.uid !== user.id) {
      throw new ReplayReactionIdentityError('unavailable')
    }

    return {
      identity: {
        kind: 'member',
        actorKey: `member:${user.id}`,
        userId: user.id,
        guestActorKey: replayGuestToken
          ? guestActorKey(replayGuestToken)
          : null,
      },
      newGuestToken: null,
    }
  }

  if (presentedAuth) {
    throw new ReplayReactionIdentityError('identity_required')
  }

  const guestToken = replayGuestToken ?? randomBytes(32).toString('base64url')
  const actorKey = guestActorKey(guestToken)

  return {
    identity: {
      kind: 'guest',
      actorKey,
      userId: null,
      guestActorKey: actorKey,
    },
    newGuestToken: replayGuestToken ? null : guestToken,
  }
}
