import {
  NextResponse,
  type NextRequest,
} from 'next/server'

import {
  isAdminRequest,
} from '@/lib/admin-auth'

import {
  getVerifiedRouteProfile,
} from '@/lib/member-auth'

import {
  isAdminCapable,
} from '@/lib/admin/admin-access'

import {
  getLiveAdminSupervision,
} from '@/lib/live/live-admin-supervision-server'

export const runtime =
  'nodejs'

export const dynamic =
  'force-dynamic'

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
          'no-store',
      },
    },
  )
}

export async function GET(
  req: NextRequest,
) {
  if (!isAdminRequest(req)) {
    return json(
      {
        ok: false,
        message:
          'Non autorisé.',
      },
      401,
    )
  }

  let profile:
    | Awaited<
        ReturnType<
          typeof getVerifiedRouteProfile
        >
      >
    | null = null

  try {
    profile =
      await getVerifiedRouteProfile()
  } catch {
    profile = null
  }

  if (
    profile &&
    !isAdminCapable(profile.role)
  ) {
    return json(
      {
        ok: false,
        message:
          'Accès administrateur requis.',
      },
      403,
    )
  }

  try {
    const data =
      await getLiveAdminSupervision()

    return json({
      ok: true,
      data,
    })
  } catch {
    return json(
      {
        ok: false,
        message:
          'Supervision momentanément indisponible.',
      },
      503,
    )
  }
}