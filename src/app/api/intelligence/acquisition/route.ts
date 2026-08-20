/**
 * CITADELLE INTELLIGENCE HUB — HUB-2
 * GET /api/intelligence/acquisition — Vue par source first-party (admin-only).
 *
 * Sécurité : ADMIN_ONLY (isAdminRequest — le middleware ne couvre pas /api/intelligence),
 * service_role côté serveur, sortie AGRÉGÉE PAR SOURCE (aucune ligne/PII :
 * ni user_id, ni session_key, ni referrer, ni ville).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { readAcquisition, type RowsDb } from '@/lib/intelligence/adapters/acquisition-reader'
import { buildAcquisition } from '@/lib/intelligence/metrics/acquisition'

export const dynamic = 'force-dynamic'

const ACQ_TTL_MS = 60_000

function startOfTodayUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  if (IS_DEMO_MODE) {
    return NextResponse.json(
      buildAcquisition({ visits: null, signupSources: [], podcastSources: [], parcoursSources: [], nowIso, demo: true }),
    )
  }

  try {
    const hourBucket = nowIso.slice(0, 13) // AAAA-MM-JJTHH → clé stable dans le TTL (rotation horaire)
    const snapshot = await cached(`hub:acquisition:${hourBucket}`, ACQ_TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const raw = await readAcquisition(supabaseAdmin as unknown as RowsDb, {
        sinceTodayIso: startOfTodayUtcIso(captured),
        nowIso: capturedIso,
      })
      return { raw, capturedIso }
    })

    return NextResponse.json(
      buildAcquisition({
        visits: snapshot.raw.visits,
        signupSources: snapshot.raw.signupSources,
        podcastSources: snapshot.raw.podcastSources,
        parcoursSources: snapshot.raw.parcoursSources,
        nowIso: snapshot.capturedIso,
      }),
    )
  } catch {
    // Fail-safe honnête : démo marquée, jamais de faux réel.
    return NextResponse.json(
      {
        ...buildAcquisition({ visits: null, signupSources: [], podcastSources: [], parcoursSources: [], nowIso, demo: true }),
        error: 'read_failed',
      },
      { status: 200 },
    )
  }
}
