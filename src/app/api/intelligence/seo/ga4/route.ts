/**
 * CITADELLE INTELLIGENCE HUB — SEO · GET /api/intelligence/seo/ga4 (admin-only)
 *
 * Expose la performance organique GA4 (lecture seule). État TOUJOURS honnête :
 * NOT_CONFIGURED (credentials/GA4_PROPERTY_ID absents), PASS (données réelles) ou
 * ERROR (échec API, raison non sensible). Jamais de donnée inventée.
 *
 * Sécurité :
 *  - ADMIN_ONLY : gardé explicitement par isAdminRequest (le middleware ne couvre
 *    PAS /api/intelligence). 401 sinon.
 *  - SERVER-ONLY : les credentials GA4 restent côté serveur ; ni le token ni le
 *    service-account ne transitent dans la réponse (uniquement le statut public).
 *  - Source `google_analytics`, DISTINCTE de l'analytics first-party Citadelle ;
 *    fraîcheur SYNCED (jamais « temps réel »).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import { getGa4OrganicSeo } from '@/lib/intelligence/connectors/google-analytics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const periodKey = parsePeriodKey(req.nextUrl.searchParams.get('period'))
  const period = buildSeoPeriod(periodKey, now.getTime())

  try {
    const data = await getGa4OrganicSeo({ period, nowIso })
    return NextResponse.json(data)
  } catch {
    // Fail-safe honnête : jamais de valeur fabriquée. Statut ERROR sans secret.
    return NextResponse.json(
      {
        status: {
          connector: 'google_analytics',
          state: 'ERROR',
          configured: true,
          reason: 'ga4_error',
          checkedAt: nowIso,
        },
        organic: null,
      },
      { status: 200 },
    )
  }
}
