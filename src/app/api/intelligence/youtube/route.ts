/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · GET /api/intelligence/youtube (admin-only)
 *
 * Sert un `YouTubeData` HONNÊTE pour l'onglet YouTube du cockpit :
 *  - Vue d'ensemble, Top contenus, Audience, Acquisition, Tendances.
 *
 * Sécurité :
 *  - ADMIN_ONLY : gardé par `isAdminRequest` (le middleware ne couvre PAS
 *    /api/intelligence). 401 sinon.
 *  - Aucun secret exposé (le connecteur est server-only). Un connecteur non
 *    autorisé reste AUTH_REQUIRED / PERMISSION_REQUIRED — JAMAIS de donnée
 *    inventée. Une erreur renvoie un payload honnête et vide (fail-safe).
 *  - Fraîcheur = SEO_DELAYED (stats YouTube jamais « temps réel »).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { cached } from '@/lib/cache'
import { getYouTubeData } from '@/lib/intelligence/connectors/youtube'
import type { YouTubeData } from '@/lib/intelligence/connectors/youtube'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'

export const dynamic = 'force-dynamic'

const YOUTUBE_TTL_MS = 60_000 // 1 min : les stats YouTube sont déjà différées.

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const key = parsePeriodKey(req.nextUrl.searchParams.get('period'))
  const period = buildSeoPeriod(key, Date.now())

  try {
    const dayBucket = nowIso.slice(0, 13) // AAAA-MM-JJTHH → clé stable dans le TTL
    const payload = await cached<YouTubeData>(
      `hub:youtube:${key}:${dayBucket}`,
      YOUTUBE_TTL_MS,
      async () => getYouTubeData({ period, nowIso }),
    )
    return NextResponse.json(payload)
  } catch {
    // Fail-safe honnête : payload vide + statut ERROR, jamais de faux réel.
    const empty: YouTubeData = {
      status: {
        channel: 'youtube',
        displayName: 'YouTube',
        state: 'ERROR',
        freshness: 'SEO_DELAYED',
        lastSync: null,
        reason: 'Lecture YouTube indisponible.',
        checkedAt: nowIso,
      },
      period,
      channel: null,
      totals: null,
      previousTotals: null,
      trends: null,
      topVideos: [],
      trafficSources: [],
    }
    return NextResponse.json({ ...empty, error: 'read_failed' }, { status: 200 })
  }
}
