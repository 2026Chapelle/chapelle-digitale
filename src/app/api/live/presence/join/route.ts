import {
  NextResponse,
  type NextRequest,
} from 'next/server'
import {
  joinLivePresence,
} from '@/lib/live/live-participation-server'
import {
  clientIp,
  rateLimit,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type ParsedBody =
  | {
      ok: true
      guestSessionId?: unknown
    }
  | {
      ok: false
    }

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...headers,
      },
    },
  )
}

async function parseBody(
  req: NextRequest,
): Promise<ParsedBody> {
  const raw = await req.text()

  if (raw.length > 1024) {
    return { ok: false }
  }

  if (!raw.trim()) {
    return { ok: true }
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return { ok: false }
    }

    const body =
      parsed as Record<string, unknown>

    const keys = Object.keys(body)

    if (
      keys.some(
        key => key !== 'guestSessionId',
      )
    ) {
      return { ok: false }
    }

    if (
      'guestSessionId' in body &&
      typeof body.guestSessionId !== 'string'
    ) {
      return { ok: false }
    }

    return {
      ok: true,
      guestSessionId:
        body.guestSessionId,
    }
  } catch {
    return { ok: false }
  }
}

export async function POST(
  req: NextRequest,
) {
  const rl = rateLimit(
    `live-presence-join:${clientIp(req)}`,
    {
      limit: 60,
      windowMs: 60_000,
    },
  )

  if (!rl.ok) {
    return json(
      {
        ok: false,
        reason: 'rate_limited',
      },
      429,
      {
        'Retry-After':
          String(rl.retryAfterSec),
      },
    )
  }

  const parsed = await parseBody(req)

  if (!parsed.ok) {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  const input =
    parsed.guestSessionId === undefined
      ? {}
      : {
          guestSessionId:
            parsed.guestSessionId,
        }

  const result =
    await joinLivePresence(input)

  if (result.ok) {
    return json({
      ok: true,
      participantKind:
        result.participantKind,
    })
  }

  if (
    result.reason ===
    'identity_required'
  ) {
    return json(
      {
        ok: false,
        reason: 'identity_required',
      },
      400,
    )
  }

  if (result.reason === 'not_live') {
    return json(
      {
        ok: false,
        reason: 'not_live',
      },
      409,
    )
  }

  return json(
    {
      ok: false,
      reason: 'unavailable',
    },
    503,
  )
}