import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * CRON — Maintenance des analytics d'écoute audio PODCAST-5A (idempotent, journalisé).
 *   GET|POST /api/cron/podcast-analytics-maintenance   (secret : header x-cron-secret ou ?token=)
 *
 * Appelle public.purge_audio_listening_events() : supprime les événements bruts
 * plus vieux que la rétention (défaut 18 mois). La fonction est SECURITY DEFINER
 * service_role only, avec garde-fou anti-suppression < 90 jours → le dashboard
 * (fenêtres 7/30/90 j) reste toujours exact. Aucune PII : on ne journalise qu'un
 * compte de lignes supprimées.
 *
 * Cadence recommandée : QUOTIDIENNE (ou hebdomadaire — la purge est idempotente,
 * un passage plus rare ne fait que différer la suppression). Même modèle que
 * /api/cron/scorecard : déclenché par un scheduler EXTERNE (cron PlanetHoster /
 * Supabase Scheduled) qui appelle l'URL avec le secret. INERTE tant qu'aucun
 * scheduler ne l'appelle — AUCUN scheduler externe n'est activé par ce lot.
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
    const { data } = await supabaseAdmin.from('cron_runs').insert({ job: 'podcast-analytics-maintenance', started_at: startedAt }).select('id').single()
    runId = data?.id ?? null
  } catch { /* table absente → on continue sans journal */ }

  let ok = true
  let message: string | undefined
  let deleted = 0
  try {
    // p_retention non fourni → défaut 18 mois (public.audio_analytics_default_retention()).
    const { data, error } = await supabaseAdmin.rpc('purge_audio_listening_events')
    if (error) { ok = false; message = error.message }
    else deleted = Number(data) || 0
  } catch (e: any) { ok = false; message = e?.message || 'Erreur' }

  if (runId) {
    try {
      await supabaseAdmin.from('cron_runs')
        .update({ finished_at: new Date().toISOString(), ok, summary: { deleted, retention: '18 months' } })
        .eq('id', runId)
    } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok, deleted, retention: '18 months', ...(message ? { message } : {}) })
}
