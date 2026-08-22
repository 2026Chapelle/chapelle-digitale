/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * GET /api/intelligence/meta — Facebook (2 pages) + Instagram (admin-only).
 *
 * Deux mondes SÉPARÉS, jamais mélangés :
 *  - platform : métriques Meta (Graph API READ-ONLY) — NOT_CONFIGURED tant que les
 *    tokens propriétaire manquent (jamais de faux réel). Les 2 pages FB gardent leur
 *    identité (id + nom + rôle).
 *  - attribution : métriques CITADELLE first-party (visites/inscriptions/écoutes/
 *    progressions) attribuées à facebook|instagram, avec ventilation FB Citadelle
 *    vs Chapelle quand l'UTM le permet.
 *
 * Sécurité : ADMIN_ONLY (isAdminRequest — le middleware ne couvre pas /api/intelligence),
 * service_role côté serveur, sortie AGRÉGÉE (aucune PII), aucun token/secret exposé.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import { getMetaData } from '@/lib/intelligence/connectors/meta'
import { buildMetaAttribution } from '@/lib/intelligence/connectors/meta/attribution'
import { readCampaigns } from '@/lib/intelligence/adapters/campaign-reader'
import type { RowsDb } from '@/lib/intelligence/adapters/acquisition-reader'

export const dynamic = 'force-dynamic'

const META_TTL_MS = 60_000

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const periodKey = parsePeriodKey(new URL(req.url).searchParams.get('period'))
  const period = buildSeoPeriod(periodKey, nowMs)
  const sinceIso = `${period.from}T00:00:00.000Z`

  // Plateforme Meta (env-driven) : sans tokens ⇒ NOT_CONFIGURED honnête. N'échoue pas.
  const platform = await getMetaData({ period, nowIso })

  // Attribution first-party : lecture DB bornée + agrégée (jamais de PII).
  const demoAttribution = buildMetaAttribution({
    visits: null,
    signupRows: [],
    podcastRows: [],
    parcoursRows: [],
    nowIso,
    demo: true,
  })

  if (IS_DEMO_MODE) {
    return NextResponse.json({ generatedAt: nowIso, period, platform, attribution: demoAttribution })
  }

  let attribution = demoAttribution
  let attributionError: string | undefined
  try {
    const hourBucket = `${nowIso.slice(0, 13)}:${periodKey}`
    const snapshot = await cached(`hub:meta:attr:${hourBucket}`, META_TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const raw = await readCampaigns(supabaseAdmin as unknown as RowsDb, {
        sinceTodayIso: sinceIso,
        nowIso: capturedIso,
      })
      return { raw, capturedIso }
    })
    attribution = buildMetaAttribution({
      visits: snapshot.raw.visits,
      signupRows: snapshot.raw.signupRows,
      podcastRows: snapshot.raw.podcastRows,
      parcoursRows: snapshot.raw.parcoursRows,
      nowIso: snapshot.capturedIso,
    })
  } catch {
    // Migration UTM non appliquée OU autre erreur : démo marquée honnête, jamais de faux réel.
    attributionError = 'read_failed'
  }

  return NextResponse.json({
    generatedAt: nowIso,
    period,
    platform,
    attribution,
    ...(attributionError ? { attributionError } : {}),
  })
}
