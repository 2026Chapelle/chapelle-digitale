import {
  NextResponse,
} from 'next/server'

import {
  enrollMemberInRetreat,
} from '@/lib/mahanaim/member-retreats-server'

export const runtime =
  'nodejs'

export const dynamic =
  'force-dynamic'

type RouteContext = {
  params: {
    slug: string
  }
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  const result =
    await enrollMemberInRetreat(
      context.params.slug,
    )

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      alreadyEnrolled:
        result.alreadyEnrolled,
      enrollmentId:
        result.enrollmentId,
    })
  }

  if (
    result.reason ===
    'identity_required'
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          'identity_required',
      },
      {
        status: 401,
      },
    )
  }

  if (
    result.reason ===
    'member_not_found'
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          'member_not_found',
      },
      {
        status: 403,
      },
    )
  }

  if (
    result.reason ===
    'not_found'
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          'not_found',
      },
      {
        status: 404,
      },
    )
  }

  if (
    result.reason ===
    'closed'
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          'closed',
      },
      {
        status: 409,
      },
    )
  }

  return NextResponse.json(
    {
      ok: false,
      reason:
        'unavailable',
    },
    {
      status: 503,
    },
  )
}