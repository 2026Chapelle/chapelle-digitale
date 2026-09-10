import { NextRequest, NextResponse } from 'next/server'

import {
  getLiveReactionSnapshot,
  recordLiveReaction,
} from '@/lib/live/live-reactions-server'
import { parseReactionRequest } from '@/lib/live/live-reaction-request'
import { SITE_URL } from '@/lib/site-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIVE_KEY_RE = /^youtube:[A-Za-z0-9_-]{11}$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const REACTIONS = new Set([
  'prayer',
  'fire',
  'heart',
  'praise',
  'kingdom',
])

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      ...extraHeaders,
    },
  })
}

function unavailable() {
  return json({ ok: false, reason: 'unavailable' }, 503)
}

function validCounts(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>
  const keys = ['prayer', 'fire', 'heart', 'praise', 'kingdom']

  if (
    Object.keys(record).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(record, key))
  ) {
    return false
  }

  return keys.every((key) => {
    const count = record[key]
    return (
      typeof count === 'number' &&
      Number.isSafeInteger(count) &&
      count >= 0
    )
  })
}

function validOpenSnapshot(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>

  return (
    record.ok === true &&
    record.live === true &&
    record.state === 'open' &&
    typeof record.liveKey === 'string' &&
    LIVE_KEY_RE.test(record.liveKey) &&
    typeof record.serverTime === 'string' &&
    Number.isFinite(Date.parse(record.serverTime)) &&
    validCounts(record.uniqueByType) &&
    Object.keys(record).every((key) =>
      ['ok', 'live', 'state', 'liveKey', 'uniqueByType', 'serverTime'].includes(
        key,
      ),
    )
  )
}

function validAccepted(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>

  if (
    record.ok !== true ||
    typeof record.liveKey !== 'string' ||
    !LIVE_KEY_RE.test(record.liveKey) ||
    typeof record.remaining !== 'number' ||
    !Number.isSafeInteger(record.remaining) ||
    record.remaining < 0 ||
    record.remaining > 2 ||
    !record.event ||
    typeof record.event !== 'object' ||
    Array.isArray(record.event)
  ) {
    return false
  }

  const event = record.event as Record<string, unknown>

  return (
    typeof event.eventId === 'string' &&
    UUID_RE.test(event.eventId) &&
    typeof event.reaction === 'string' &&
    REACTIONS.has(event.reaction) &&
    typeof event.acceptedAt === 'string' &&
    Number.isFinite(Date.parse(event.acceptedAt)) &&
    Object.keys(event).every((key) =>
      ['eventId', 'reaction', 'acceptedAt'].includes(key),
    ) &&
    Object.keys(record).every((key) =>
      ['ok', 'liveKey', 'event', 'remaining'].includes(key),
    )
  )
}

function configuredOrigin(): string | null {
  try {
    return new URL(SITE_URL).origin
  } catch {
    return null
  }
}

function allowedOrigin(request: NextRequest): boolean | null {
  const origin = configuredOrigin()

  if (!origin) return null

  if (request.headers.get('sec-fetch-site')?.toLowerCase() === 'cross-site') {
    return false
  }

  const presented = request.headers.get('origin')

  if (!presented || presented === 'null') {
    return false
  }

  try {
    return new URL(presented).origin === origin && presented === origin
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.search.length > 0) {
    return json({ ok: false, reason: 'invalid_request' }, 400)
  }

  let result: unknown

  try {
    result = await getLiveReactionSnapshot()
  } catch {
    return unavailable()
  }

  if (
    result &&
    typeof result === 'object' &&
    !Array.isArray(result)
  ) {
    const record = result as Record<string, unknown>

    if (
      record.ok === true &&
      record.live === false &&
      (record.state === 'not_live' || record.state === 'closed') &&
      Object.keys(record).every((key) =>
        ['ok', 'live', 'state'].includes(key),
      )
    ) {
      return json(record, 200)
    }

    if (validOpenSnapshot(record)) {
      return json(record, 200)
    }

    if (
      record.ok === false &&
      record.reason === 'unavailable' &&
      Object.keys(record).length === 2
    ) {
      return unavailable()
    }
  }

  return unavailable()
}

export async function POST(request: NextRequest) {
  const originAllowed = allowedOrigin(request)

  if (originAllowed === null) {
    return unavailable()
  }

  if (!originAllowed) {
    return json({ ok: false, reason: 'forbidden_origin' }, 403)
  }

  const parsed = await parseReactionRequest(request)

  if (!parsed.ok) {
    return json(parsed, 400)
  }

  let result: unknown

  try {
    result = await recordLiveReaction({
      reaction: parsed.reaction,
      ...(parsed.guestSessionId !== undefined
        ? { guestSessionId: parsed.guestSessionId }
        : {}),
      expectedLiveKey: parsed.expectedLiveKey,
    })
  } catch {
    return unavailable()
  }

  if (
    typeof parsed.reaction !== 'string' ||
    !REACTIONS.has(parsed.reaction)
  ) {
    return json({ ok: false, reason: 'invalid_request' }, 400)
  }

  if (validAccepted(result)) {
    return json(result, 200)
  }

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return unavailable()
  }

  const record = result as Record<string, unknown>

  if (record.ok !== false || typeof record.reason !== 'string') {
    return unavailable()
  }

  if (record.reason === 'invalid_request') {
    return json({ ok: false, reason: 'invalid_request' }, 400)
  }

  if (record.reason === 'identity_required') {
    return json({ ok: false, reason: 'identity_required' }, 400)
  }

  if (
    record.reason === 'not_live' ||
    record.reason === 'live_changed' ||
    record.reason === 'closed'
  ) {
    return json({ ok: false, reason: record.reason }, 409)
  }

  if (
    record.reason === 'rate_limited' &&
    typeof record.retryAfterMs === 'number' &&
    Number.isSafeInteger(record.retryAfterMs) &&
    record.retryAfterMs > 0
  ) {
    return json(
      {
        ok: false,
        reason: 'rate_limited',
        retryAfterMs: record.retryAfterMs,
      },
      429,
      {
        'Retry-After': String(Math.ceil(record.retryAfterMs / 1000)),
      },
    )
  }

  if (record.reason === 'unavailable') {
    return unavailable()
  }

  return unavailable()
}