import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  getReplayReactionSnapshot,
} from '@/lib/live/live-reactions-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store, max-age=0',
      },
    },
  )
}

export async function GET(
  request: NextRequest,
) {
  const params =
    request.nextUrl.searchParams

  const keys =
    Array.from(
      params.keys(),
    )

  const values =
    params.getAll(
      'cmsLiveId',
    )

  if (
    keys.length !== 1 ||
    keys[0] !==
      'cmsLiveId' ||
    values.length !== 1 ||
    !UUID_RE.test(
      values[0],
    )
  ) {
    return json(
      {
        ok: false,
        reason:
          'invalid_request',
      },
      400,
    )
  }

  let result:
    Awaited<
      ReturnType<
        typeof getReplayReactionSnapshot
      >
    >

  try {
    result =
      await getReplayReactionSnapshot(
        values[0],
      )
  } catch {
    return json(
      {
        ok: false,
        reason:
          'unavailable',
      },
      503,
    )
  }

  if (
    result.ok
  ) {
    return json(
      result,
      200,
    )
  }

  if (
    result.reason ===
      'not_found'
  ) {
    return json(
      result,
      404,
    )
  }

  if (
    result.reason ===
      'unavailable'
  ) {
    return json(
      result,
      503,
    )
  }

  return json(
    result,
    200,
  )
}