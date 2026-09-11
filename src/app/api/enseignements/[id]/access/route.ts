/**
 * CITADELLE — ENSEIGNEMENTS-SEC
 *
 * GET /api/enseignements/:id/access
 *
 * Le client ne transmet jamais :
 * - access_level ;
 * - body ;
 * - video_url ;
 * - audio_url ;
 * - statut Premium.
 *
 * Le serveur reconstruit lui-même tout le contexte de sécurité.
 */

import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  supabaseAdmin,
  IS_DEMO_MODE,
} from '@/lib/supabase'

import { isAdminRequest } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'

import {
  hasTeachingsPremiumAccess,
  isMemberStatus,
  reasonToStatus,
} from '@/lib/teachings/teaching-access'

import {
  getTeachingDelivery,
} from '@/lib/teachings/teaching-access-server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = (params?.id || '').trim()

  if (!id || IS_DEMO_MODE) {
    return NextResponse.json(
      {
        allowed: false,
        reason: 'not_found',
      },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  try {
    const isAdmin = isAdminRequest(req)

    const session =
      isAdmin
        ? null
        : await getSessionProfile()

    const authenticated = Boolean(session)

    const isMember = isMemberStatus(
      session?.profile?.membre_statut,
    )

    /**
     * Résolution entitlement serveur.
     *
     * Même avec entitlement=true,
     * decideTeachingAccess exige encore isMember=true
     * pour un contenu Premium.
     */
    const hasPremiumEntitlement =
      authenticated
        ? await hasTeachingsPremiumAccess(
            supabaseAdmin,
            session?.uid,
          )
        : false

    const result =
      await getTeachingDelivery(
        id,
        {
          authenticated,
          isMember,
          isAdmin,
          hasPremiumEntitlement,
        },
      )

    const status =
      result.allowed
        ? 200
        : reasonToStatus(result.reason)

    return NextResponse.json(
      result,
      {
        status,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    console.error(
      `[teachings/access] route error id=${id}: ${(error as Error)?.message ?? 'unknown'}`,
    )

    return NextResponse.json(
      {
        allowed: false,
        reason: 'not_found',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}