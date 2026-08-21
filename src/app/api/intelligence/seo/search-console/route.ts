/**
 * CITADELLE INTELLIGENCE HUB — SEO
 * GET /api/intelligence/seo/search-console — Connecteur Search Console (admin-only).
 *
 * Sécurité :
 *  - ADMIN_ONLY : gardé explicitement par isAdminRequest (le middleware ne couvre
 *    PAS /api/intelligence — cf. /api/intelligence/overview pour le même patron).
 *  - Le service-account Google reste server-only ; ni token ni credential ne
 *    transitent par la réponse.
 *  - Fail-safe HONNÊTE : jamais de donnée fabriquée. Une erreur inattendue renvoie
 *    un statut ERROR (ou NOT_CONFIGURED) explicite, tout vide.
 *
 * Paramètre : `?period=7d|28d|90d` (défaut 28d).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import { getSearchConsoleSeo } from '@/lib/intelligence/connectors/google-search-console'
import type { SearchConsoleData } from '@/lib/intelligence/seo/types'

export const dynamic = 'force-dynamic'

function honestError(nowIso: string): SearchConsoleData {
  return {
    status: {
      connector: 'google_search_console',
      state: 'ERROR',
      configured: false,
      reason: 'seo_route_failed',
      checkedAt: nowIso,
    },
    totals: null,
    queries: [],
    pages: [],
    indexation: [],
    sitemaps: [],
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  try {
    const period = buildSeoPeriod(
      parsePeriodKey(new URL(req.url).searchParams.get('period')),
      Date.parse(nowIso),
    )
    const data = await getSearchConsoleSeo({ period, nowIso })
    return NextResponse.json(data)
  } catch {
    // Ne JAMAIS fabriquer de donnée : statut ERROR explicite, tout vide.
    return NextResponse.json(honestError(nowIso), { status: 200 })
  }
}
