import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/**
 * Historique de parcours pastoral d'un « Nouveau Venu » (V2.7-B) — LECTURE SEULE.
 *   GET /api/admin/newcomer-journey?intake_id=<uuid>  → { ok, data: { events: [...] } }
 *
 * Best-effort et TOLÉRANT au schéma : lit la table public.newcomer_journey_events (modèle
 * SQL V2.7-A). Si la table/colonnes ne sont pas disponibles, renvoie une liste vide plutôt
 * qu'une erreur — l'admin affiche alors un repli sobre. Aucune écriture, aucun SQL de mutation.
 * Garde : cookie admin (isAdminRequest). Service role (jamais exposé au client).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FK_CANDIDATES = ['newcomer_intake_id', 'intake_id'] as const

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { events: [] } })

  const intakeId = req.nextUrl.searchParams.get('intake_id') || ''
  if (!intakeId) return NextResponse.json({ ok: false, message: 'intake_id requis.' }, { status: 400 })

  // Tolérant : on tente plusieurs noms de FK et l'ordre par created_at ; tout échec → [].
  for (const fk of FK_CANDIDATES) {
    try {
      const ordered = await supabaseAdmin
        .from('newcomer_journey_events')
        .select('*')
        .eq(fk, intakeId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!ordered.error && Array.isArray(ordered.data)) {
        return NextResponse.json({ ok: true, data: { events: ordered.data } })
      }
      const plain = await supabaseAdmin
        .from('newcomer_journey_events')
        .select('*')
        .eq(fk, intakeId)
        .limit(20)
      if (!plain.error && Array.isArray(plain.data)) {
        return NextResponse.json({ ok: true, data: { events: plain.data } })
      }
    } catch { /* essaie le candidat FK suivant */ }
  }
  // Historique indisponible (table/colonnes absentes) → repli sobre côté UI.
  return NextResponse.json({ ok: true, data: { events: [] } })
}
