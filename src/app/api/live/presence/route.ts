import {
  NextResponse,
  type NextRequest,
} from 'next/server'
import {
  getLivePresenceCounts,
} from '@/lib/live/live-participation-server'
import {
  clientIp,
  rateLimit,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

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

export async function GET(
  req: NextRequest,
) {
  const rl = rateLimit(
    `live-presence-count:${clientIp(req)}`,
    {
      limit: 120,
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

  const result =
    await getLivePresenceCounts()

  if (result.ok) {
    return json({
      ok: true,
      live: true,
      activeTotal:
        result.activeTotal,
    })
  }

  if (result.reason === 'not_live') {
    return json({
      ok: true,
      live: false,
      activeTotal: 0,
    })
  }

  return json(
    {
      ok: false,
      reason: 'unavailable',
    },
    503,
  )
}