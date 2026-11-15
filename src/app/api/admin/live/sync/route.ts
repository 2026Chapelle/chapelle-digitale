import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getYouTubeSyncStatus, syncYouTubeLives } from '@/lib/live/youtube-sync-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** État de la synchronisation (ADMIN) : dernier passage, comptage des états. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return json({ ok: false, message: 'Non autorisé.' }, 401)
  try {
    return json({ ok: true, ...(await getYouTubeSyncStatus()) })
  } catch {
    return json({ ok: false, message: 'Statut indisponible.' }, 500)
  }
}

/** Relance manuelle sécurisée (ADMIN). Idempotente : aucun doublon, aucune suppression. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return json({ ok: false, message: 'Non autorisé.' }, 401)
  const summary = await syncYouTubeLives({ trigger: 'admin' })
  return json(summary, summary.ok ? 200 : 503)
}
