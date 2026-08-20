/**
 * CITADELLE INTELLIGENCE HUB — HUB-3
 * GET /api/intelligence/campaigns — Acquisition PAR CAMPAGNE (admin-only).
 *
 * Sécurité : ADMIN_ONLY (isAdminRequest — middleware ne couvre pas /api/intelligence),
 * service_role, sortie AGRÉGÉE par (source, campagne) : aucune PII (ni user_id,
 * ni session_key, ni referrer, ni URL brute).
 *
 * Compatibilité : lit les colonnes utm_* (HUB-3). Si la migration n'est pas encore
 * appliquée, le SELECT échoue → fail-safe démo marquée (jamais de faux réel), et
 * l'endpoint /acquisition (HUB-2) reste intact.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { readCampaigns } from '@/lib/intelligence/adapters/campaign-reader'
import type { RowsDb } from '@/lib/intelligence/adapters/acquisition-reader'
import { buildCampaigns } from '@/lib/intelligence/metrics/campaigns'

export const dynamic = 'force-dynamic'

const CAMPAIGN_TTL_MS = 60_000

function startOfTodayUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

const demoResult = (nowIso: string) =>
  buildCampaigns({ visits: null, signupRows: [], podcastRows: [], parcoursRows: [], nowIso, demo: true })

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  if (IS_DEMO_MODE) return NextResponse.json(demoResult(nowIso))

  try {
    const hourBucket = nowIso.slice(0, 13)
    const snapshot = await cached(`hub:campaigns:${hourBucket}`, CAMPAIGN_TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const raw = await readCampaigns(supabaseAdmin as unknown as RowsDb, {
        sinceTodayIso: startOfTodayUtcIso(captured),
        nowIso: capturedIso,
      })
      return { raw, capturedIso }
    })

    return NextResponse.json(
      buildCampaigns({
        visits: snapshot.raw.visits,
        signupRows: snapshot.raw.signupRows,
        podcastRows: snapshot.raw.podcastRows,
        parcoursRows: snapshot.raw.parcoursRows,
        nowIso: snapshot.capturedIso,
      }),
    )
  } catch {
    // Migration non appliquée (colonne inconnue) OU autre erreur : démo marquée honnête.
    return NextResponse.json({ ...demoResult(nowIso), error: 'read_failed' }, { status: 200 })
  }
}
