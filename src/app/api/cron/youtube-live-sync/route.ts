import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { syncYouTubeLives } from '@/lib/live/youtube-sync-server'

/**
 * CRON — Synchronisation YouTube Live → Replay (idempotent, journalisé dans cron_runs).
 *   GET|POST /api/cron/youtube-live-sync   (secret : header x-cron-secret ou ?token=)
 *
 * Même modèle que /api/cron/notifications : déclenché par un scheduler EXTERNE (cron cPanel
 * N0C) toutes les 5 minutes. INERTE tant qu'aucun scheduler ne l'appelle. Aucun secret renvoyé.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('token') || ''
  if (!secret || given !== secret) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })

  const summary = await syncYouTubeLives({ trigger: 'cron' })
  return NextResponse.json(summary, { status: summary.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
