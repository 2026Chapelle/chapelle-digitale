/**
 * CITADELLE INTELLIGENCE HUB — HUB-1
 * GET /api/intelligence/overview — Vue générale first-party (admin-only).
 *
 * Sécurité :
 *  - ADMIN_ONLY : gardé explicitement par isAdminRequest (le middleware ne couvre
 *    PAS /api/intelligence, seulement /admin, /member, /auth).
 *  - service_role côté serveur uniquement (jamais exposé au client).
 *  - NO_RAW_PII : lectures en count(head:true) seulement, aucune ligne/PII renvoyée.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { readOverviewCounts, type CountDb } from '@/lib/intelligence/adapters/supabase-reader'
import { buildOverview } from '@/lib/intelligence/metrics/overview'

export const dynamic = 'force-dynamic'

const OVERVIEW_TTL_MS = 30_000
const ONLINE_WINDOW_MS = 90_000 // 3 × heartbeat 30s

function startOfTodayIso(now: Date): string {
  // "Aujourd'hui" = jour UTC (00:00Z) ≈ Abidjan/GMT (fuseau du public principal).
  // On fixe explicitement UTC pour NE PAS dépendre du fuseau du serveur de déploiement.
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString()
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  // Mode démo (Supabase non configuré) : cartes DEMO explicites, jamais de faux réel.
  if (IS_DEMO_MODE) {
    return NextResponse.json(buildOverview({ counts: null, nowIso, demo: true }))
  }

  try {
    // Snapshot (counts + instant) mémorisé ensemble : la fraîcheur affichée
    // correspond exactement aux données lues (pas d'horodatage plus récent que la donnée).
    const dayBucket = nowIso.slice(0, 13) // AAAA-MM-JJTHH → clé stable dans le TTL
    const snapshot = await cached(`hub:overview:${dayBucket}`, OVERVIEW_TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const counts = await readOverviewCounts(supabaseAdmin as unknown as CountDb, {
        nowIso: capturedIso,
        sinceTodayIso: startOfTodayIso(captured),
        onlineSinceIso: new Date(captured.getTime() - ONLINE_WINDOW_MS).toISOString(),
      })
      return { counts, capturedIso }
    })

    return NextResponse.json(buildOverview({ counts: snapshot.counts, nowIso: snapshot.capturedIso }))
  } catch {
    // Fail-safe honnête : jamais de valeur fabriquée. On renvoie des cartes DEMO
    // marquées, avec un drapeau d'erreur, plutôt qu'un faux réel.
    return NextResponse.json(
      { ...buildOverview({ counts: null, nowIso, demo: true }), error: 'read_failed' },
      { status: 200 },
    )
  }
}
