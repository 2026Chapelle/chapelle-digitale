import { NextRequest, NextResponse } from 'next/server'

import { SITE_URL } from '@/lib/site-url'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { isLiveReplayReaction } from '@/lib/live/live-replay-reactions'
import {
  LIVE_REPLAY_GUEST_COOKIE,
  ReplayReactionIdentityError,
  resolveReplayReactionIdentity,
  type ReplayReactionIdentityResolution,
} from '@/lib/live/live-replay-reaction-identity'
import {
  deleteReplayReaction,
  getReplayReactionSnapshot,
  putReplayReaction,
  type ReplayReactionResult,
} from '@/lib/live/live-replay-reactions-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 4096
const MUTATION_LIMIT = { limit: 30, windowMs: 60_000 } as const

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

function failure(reason: string) {
  if (reason === 'identity_required') return json({ ok: false, reason }, 401)
  if (reason === 'invalid_request') return json({ ok: false, reason }, 400)
  if (reason === 'disabled') return json({ ok: false, reason }, 403)
  if (reason === 'not_replay') return json({ ok: false, reason }, 404)
  return json({ ok: false, reason: 'unavailable' }, 503)
}

function success(result: Extract<ReplayReactionResult, { ok: true }>) {
  return json({ ok: true, ...result.snapshot })
}

function sameOrigin(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase()
  if (secFetchSite === 'cross-site') return false

  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return false

  try {
    return new URL(origin).origin === new URL(SITE_URL).origin
  } catch {
    return false
  }
}

function hasJsonContentType(request: NextRequest): boolean {
  return (request.headers.get('content-type')?.toLowerCase() ?? '')
    .startsWith('application/json')
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function hasExactKeys(row: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(row)
  return actual.length === keys.length && keys.every((key) => actual.includes(key))
}

async function readBoundedJsonObject(
  request: NextRequest,
): Promise<Record<string, unknown> | null> {
  const declared = request.headers.get('content-length')
  if (declared && Number(declared) > MAX_BODY_BYTES) return null

  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null

    const body = JSON.parse(raw) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

async function identityResolution(): Promise<
  | { ok: true; value: ReplayReactionIdentityResolution }
  | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, value: await resolveReplayReactionIdentity() }
  } catch (error) {
    if (error instanceof ReplayReactionIdentityError) {
      return { ok: false, response: failure(error.reason) }
    }
    return { ok: false, response: failure('unavailable') }
  }
}

function attachGuestCookie(
  response: NextResponse,
  resolution: ReplayReactionIdentityResolution,
): NextResponse {
  if (!resolution.newGuestToken) return response

  response.cookies.set(LIVE_REPLAY_GUEST_COOKIE, resolution.newGuestToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 31_536_000,
  })
  return response
}

function limitedMutation(
  request: NextRequest,
  actorKey: string,
): NextResponse | null {
  const actor = rateLimit(`replay-reaction:actor:${actorKey}`, MUTATION_LIMIT)
  const ip = rateLimit(`replay-reaction:ip:${clientIp(request)}`, MUTATION_LIMIT)

  if (actor.ok && ip.ok) return null

  const retryAfterSec = Math.max(
    actor.ok ? 0 : actor.retryAfterSec,
    ip.ok ? 0 : ip.retryAfterSec,
  )

  const response = json({ ok: false, reason: 'rate_limited' }, 429)
  response.headers.set('Retry-After', String(Math.max(1, retryAfterSec)))
  return response
}

function mutationGate(request: NextRequest): NextResponse | null {
  if (!sameOrigin(request)) return json({ ok: false, reason: 'invalid_origin' }, 403)
  if (!hasJsonContentType(request)) return failure('invalid_request')
  return null
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const keys = Array.from(params.keys())
  const values = params.getAll('cmsLiveId')

  if (
    keys.length !== 1 ||
    keys[0] !== 'cmsLiveId' ||
    values.length !== 1 ||
    !validUuid(values[0])
  ) {
    return failure('invalid_request')
  }

  const resolved = await identityResolution()
  if (!resolved.ok) return resolved.response

  const result = await getReplayReactionSnapshot(values[0], resolved.value.identity)
  const response = result.ok ? success(result) : failure(result.reason)
  return attachGuestCookie(response, resolved.value)
}

export async function PUT(request: NextRequest) {
  const gated = mutationGate(request)
  if (gated) return gated

  const row = await readBoundedJsonObject(request)
  if (
    !row ||
    !hasExactKeys(row, ['cmsLiveId', 'reaction']) ||
    !validUuid(row.cmsLiveId) ||
    !isLiveReplayReaction(row.reaction)
  ) {
    return failure('invalid_request')
  }

  const resolved = await identityResolution()
  if (!resolved.ok) return resolved.response

  const limited = limitedMutation(request, resolved.value.identity.actorKey)
  if (limited) return attachGuestCookie(limited, resolved.value)

  const result = await putReplayReaction(
    row.cmsLiveId,
    row.reaction,
    resolved.value.identity,
  )
  const response = result.ok ? success(result) : failure(result.reason)
  return attachGuestCookie(response, resolved.value)
}

export async function DELETE(request: NextRequest) {
  const gated = mutationGate(request)
  if (gated) return gated

  const row = await readBoundedJsonObject(request)
  if (
    !row ||
    !hasExactKeys(row, ['cmsLiveId']) ||
    !validUuid(row.cmsLiveId)
  ) {
    return failure('invalid_request')
  }

  const resolved = await identityResolution()
  if (!resolved.ok) return resolved.response

  const limited = limitedMutation(request, resolved.value.identity.actorKey)
  if (limited) return attachGuestCookie(limited, resolved.value)

  const result = await deleteReplayReaction(row.cmsLiveId, resolved.value.identity)
  const response = result.ok ? success(result) : failure(result.reason)
  return attachGuestCookie(response, resolved.value)
}
