import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * CRON — Rafraîchissement des scorecards & alertes d'antennes (idempotent, journalisé).
 *   GET|POST /api/cron/scorecard   (secret : header x-cron-secret ou ?token=)
 *
 * Appelle public.antenne_scorecard_refresh() : (ré)upsert des snapshots du JOUR
 * (clé (antenne_id, jour) → une ligne/jour), transitions d'objectifs, et alertes
 * sans_responsable / antenne_inactive / objectif_en_retard (dédup via on conflict).
 *
 * À planifier QUOTIDIENNEMENT (cadence dictée par la clé jour du snapshot ; sous-quotidien
 * = ré-upsert du même jour, supra-quotidien = trous d'historique). Même modèle que
 * /api/cron/notifications : déclenché par un scheduler EXTERNE (cron PlanetHoster / Supabase
 * Scheduled) qui appelle l'URL avec le secret. INERTE tant qu'aucun scheduler ne l'appelle.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('token') || ''
  if (!secret || given !== secret) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const startedAt = new Date().toISOString()
  let runId: string | null = null
  try {
    const { data } = await supabaseAdmin.from('cron_runs').insert({ job: 'scorecard', started_at: startedAt }).select('id').single()
    runId = data?.id ?? null
  } catch { /* table absente → on continue sans journal */ }

  let ok = true
  let message: string | undefined
  try {
    const { error } = await supabaseAdmin.rpc('antenne_scorecard_refresh')
    if (error) { ok = false; message = error.message }
  } catch (e: any) { ok = false; message = e?.message || 'Erreur' }

  if (runId) {
    try {
      await supabaseAdmin.from('cron_runs')
        .update({ finished_at: new Date().toISOString(), ok, summary: { scorecard: ok ? 1 : 0 } })
        .eq('id', runId)
    } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok, ...(message ? { message } : {}) })
}
