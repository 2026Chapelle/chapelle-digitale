/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * GET /api/intelligence/whatsapp — Attribution WhatsApp first-party (admin-only).
 *
 * WHATSAPP_ATTRIBUTION = ACTIVE : premier-party (aucune API externe). On agrège les
 * visites/inscriptions/écoutes/progressions attribuées à `whatsapp` (detectSource +
 * UTM), ventilées par campagne. Empty ≠ Indisponible : sans donnée, hasData=false
 * mais l'attribution reste ACTIVE.
 *
 * Sécurité : ADMIN_ONLY (isAdminRequest — le middleware ne couvre pas /api/intelligence),
 * service_role côté serveur, sortie AGRÉGÉE (aucune PII), aucun secret.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import {
  buildWhatsAppAttribution,
  getWhatsAppStatus,
  getWhatsAppCloudStatus,
} from '@/lib/intelligence/connectors/whatsapp'
import { readCampaigns } from '@/lib/intelligence/adapters/campaign-reader'
import type { RowsDb } from '@/lib/intelligence/adapters/acquisition-reader'

export const dynamic = 'force-dynamic'

const WA_TTL_MS = 60_000

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const periodKey = parsePeriodKey(new URL(req.url).searchParams.get('period'))
  const period = buildSeoPeriod(periodKey, nowMs)
  const sinceIso = `${period.from}T00:00:00.000Z`

  const status = await getWhatsAppStatus(nowIso)
  const cloud = getWhatsAppCloudStatus()

  const demoAttribution = buildWhatsAppAttribution({
    visits: null,
    signupRows: [],
    podcastRows: [],
    parcoursRows: [],
    nowIso,
    demo: true,
  })

  if (IS_DEMO_MODE) {
    return NextResponse.json({ generatedAt: nowIso, period, status, cloud, attribution: demoAttribution })
  }

  let attribution = demoAttribution
  let attributionError: string | undefined
  try {
    const hourBucket = `${nowIso.slice(0, 13)}:${periodKey}`
    const snapshot = await cached(`hub:whatsapp:attr:${hourBucket}`, WA_TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const raw = await readCampaigns(supabaseAdmin as unknown as RowsDb, {
        sinceTodayIso: sinceIso,
        nowIso: capturedIso,
      })
      return { raw, capturedIso }
    })
    attribution = buildWhatsAppAttribution({
      visits: snapshot.raw.visits,
      signupRows: snapshot.raw.signupRows,
      podcastRows: snapshot.raw.podcastRows,
      parcoursRows: snapshot.raw.parcoursRows,
      nowIso: snapshot.capturedIso,
    })
  } catch {
    attributionError = 'read_failed'
  }

  return NextResponse.json({
    generatedAt: nowIso,
    period,
    status,
    cloud,
    attribution,
    ...(attributionError ? { attributionError } : {}),
  })
}
