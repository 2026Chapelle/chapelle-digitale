import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  getReplayProgress,
  saveReplayProgress,
  validReplayProgressId,
  validReplaySessionKey,
} from '@/lib/live/live-replay-progress-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function failure(
  reason: string,
) {
  if (reason === 'identity_required') {
    return json(
      { ok: false, reason },
      401,
    )
  }

  if (reason === 'invalid_request') {
    return json(
      { ok: false, reason },
      400,
    )
  }

  if (reason === 'not_replay') {
    return json(
      { ok: false, reason },
      404,
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

function sameOrigin(
  request: NextRequest,
): boolean {
  const secFetchSite =
    request.headers
      .get('sec-fetch-site')
      ?.toLowerCase()

  if (secFetchSite === 'cross-site') {
    return false
  }

  const origin =
    request.headers.get('origin')

  if (
    !origin ||
    origin === 'null'
  ) {
    return false
  }

  try {
    return (
      new URL(origin).origin ===
      new URL(request.url).origin
    )
  } catch {
    return false
  }
}

export async function GET(
  request: NextRequest,
) {
  const params =
    request.nextUrl.searchParams

  const keys =
    Array.from(params.keys())

  const values =
    params.getAll('cmsLiveId')

  if (
    keys.length !== 1 ||
    keys[0] !== 'cmsLiveId' ||
    values.length !== 1 ||
    !validReplayProgressId(
      values[0],
    )
  ) {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  const result =
    await getReplayProgress(
      values[0],
    )

  if (!result.ok) {
    return failure(result.reason)
  }

  return json({
    ok: true,
    progress: result.progress,
  })
}

export async function POST(
  request: NextRequest,
) {
  if (!sameOrigin(request)) {
    return json(
      {
        ok: false,
        reason: 'invalid_origin',
      },
      403,
    )
  }

  const contentType =
    request.headers
      .get('content-type')
      ?.toLowerCase() ?? ''

  if (
    !contentType.startsWith(
      'application/json',
    )
  ) {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  let body: unknown

  try {
    body =
      await request.json()
  } catch {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  const row =
    body as Record<
      string,
      unknown
    >

  const allowedKeys =
    new Set([
      'cmsLiveId',
      'positionSeconds',
      'durationSeconds',
      'sessionKey',
      'ended',
    ])

  if (
    Object.keys(row)
      .some(
        key =>
          !allowedKeys.has(key),
      )
  ) {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  const cmsLiveId =
    row.cmsLiveId

  const sessionKey =
    row.sessionKey

  const positionSeconds =
    Number(row.positionSeconds)

  const durationSeconds =
    Number(row.durationSeconds)

  const ended =
    row.ended

  if (
    !validReplayProgressId(
      cmsLiveId,
    ) ||
    !validReplaySessionKey(
      sessionKey,
    ) ||
    !Number.isFinite(
      positionSeconds,
    ) ||
    positionSeconds < 0 ||
    !Number.isFinite(
      durationSeconds,
    ) ||
    durationSeconds < 0 ||
    (
      ended !== undefined &&
      typeof ended !== 'boolean'
    )
  ) {
    return json(
      {
        ok: false,
        reason: 'invalid_request',
      },
      400,
    )
  }

  const result =
    await saveReplayProgress({
      cmsLiveId,
      positionSeconds,
      durationSeconds,
      sessionKey,
      ...(
        ended === true
          ? { ended: true }
          : {}
      ),
    })

  if (!result.ok) {
    return failure(result.reason)
  }

  return json({
    ok: true,
    progress: result.progress,
  })
}