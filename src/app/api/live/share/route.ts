import {
  NextResponse,
  type NextRequest,
} from 'next/server'

import {
  recordLiveShareAction,
  type LiveShareActionKind,
} from '@/lib/live/live-share-server'

import {
  clientIp,
  rateLimit,
} from '@/lib/rate-limit'

export const dynamic =
  'force-dynamic'

function json(
  body: unknown,
  status = 200,
  headers: Record<
    string,
    string
  > = {},
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store',
        ...headers,
      },
    },
  )
}

type ParsedBody =
  | {
      ok: true
      actionKind:
        LiveShareActionKind
      guestSessionId?: string
    }
  | {
      ok: false
    }

async function parseBody(
  req: NextRequest,
): Promise<ParsedBody> {
  const raw =
    await req.text()

  if (
    !raw.trim() ||
    raw.length > 1024
  ) {
    return {
      ok: false,
    }
  }

  try {
    const parsed =
      JSON.parse(raw) as unknown

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {
        ok: false,
      }
    }

    const body =
      parsed as Record<
        string,
        unknown
      >

    const keys =
      Object.keys(body)

    if (
      keys.some(
        key =>
          key !== 'actionKind' &&
          key !== 'guestSessionId',
      )
    ) {
      return {
        ok: false,
      }
    }

    if (
      body.actionKind !==
        'native_share' &&
      body.actionKind !==
        'copy_link'
    ) {
      return {
        ok: false,
      }
    }

    if (
      'guestSessionId' in body &&
      typeof body.guestSessionId !==
        'string'
    ) {
      return {
        ok: false,
      }
    }

    return {
      ok: true,
      actionKind:
        body.actionKind,
      guestSessionId:
        typeof body.guestSessionId ===
          'string'
          ? body.guestSessionId
          : undefined,
    }
  } catch {
    return {
      ok: false,
    }
  }
}

export async function POST(
  req: NextRequest,
) {
  const rl =
    rateLimit(
      `live-share:${clientIp(req)}`,
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
          String(
            rl.retryAfterSec,
          ),
      },
    )
  }

  const parsed =
    await parseBody(req)

  if (!parsed.ok) {
    return json(
      {
        ok: false,
        reason:
          'invalid_request',
      },
      400,
    )
  }

  const result =
    await recordLiveShareAction({
      actionKind:
        parsed.actionKind,
      guestSessionId:
        parsed.guestSessionId,
    })

  if (result.ok) {
    return json({
      ok: true,
    })
  }

  if (
    result.reason ===
      'invalid_action' ||
    result.reason ===
      'identity_required'
  ) {
    return json(
      {
        ok: false,
        reason:
          result.reason,
      },
      400,
    )
  }

  if (
    result.reason ===
    'not_live'
  ) {
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