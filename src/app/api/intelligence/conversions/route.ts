/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * GET /api/intelligence/conversions — Tunnel + catégories + attribution (admin-only).
 *
 * Sécurité :
 *  - ADMIN_ONLY : gardé explicitement par isAdminRequest (le middleware ne couvre
 *    PAS /api/intelligence).
 *  - service_role côté serveur uniquement.
 *  - NO_RAW_PII : comptages count(head:true) + acquisition AGRÉGÉE PAR SOURCE
 *    (aucune ligne, aucun user_id/session_key/referrer renvoyé).
 * Honnêteté : aucune donnée fabriquée. Fail-safe → payload démo marqué + flag.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { readConversionCounts, buildConversions, type CountDb } from '@/lib/intelligence/conversions'
import { readAcquisition, type RowsDb } from '@/lib/intelligence/adapters/acquisition-reader'
import { buildAcquisition } from '@/lib/intelligence/metrics/acquisition'

export const dynamic = 'force-dynamic'

const CONV_TTL_MS = 60_000
const PERIOD_LABEL = "Aujourd'hui (UTC)"

function startOfTodayUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  // Mode démo (Supabase non configuré) : payload démo explicite, jamais de faux réel.
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      buildConversions({ counts: null, acquisition: null, nowIso, period: PERIOD_LABEL, demo: true }),
    )
  }

  try {
    const hourBucket = nowIso.slice(0, 13) // AAAA-MM-JJTHH → clé stable dans le TTL
    const snapshot = await cached(`hub:conversions:${hourBucket}`, CONV_TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const sinceTodayIso = startOfTodayUtcIso(captured)

      // Comptages de conversions + acquisition (attribution par source) en parallèle.
      const [counts, acqRaw] = await Promise.all([
        readConversionCounts(supabaseAdmin as unknown as CountDb, { sinceTodayIso }),
        readAcquisition(supabaseAdmin as unknown as RowsDb, { sinceTodayIso, nowIso: capturedIso }),
      ])
      return { counts, acqRaw, capturedIso }
    })

    const acquisition = buildAcquisition({
      visits: snapshot.acqRaw.visits,
      signupSources: snapshot.acqRaw.signupSources,
      podcastSources: snapshot.acqRaw.podcastSources,
      parcoursSources: snapshot.acqRaw.parcoursSources,
      nowIso: snapshot.capturedIso,
    })

    return NextResponse.json(
      buildConversions({
        counts: snapshot.counts,
        acquisition,
        nowIso: snapshot.capturedIso,
        period: PERIOD_LABEL,
      }),
    )
  } catch {
    // Fail-safe honnête : payload démo marqué + drapeau d'erreur, jamais de faux réel.
    return NextResponse.json(
      {
        ...buildConversions({ counts: null, acquisition: null, nowIso, period: PERIOD_LABEL, demo: true }),
        error: 'read_failed',
      },
      { status: 200 },
    )
  }
}
