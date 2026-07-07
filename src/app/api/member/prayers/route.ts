import { NextResponse } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { listMemberPrayers } from '@/lib/prayers/library'

/**
 * Bibliothèque de Prières — LISTE complète pour membre connecté (V2.3-B Lot 1).
 *   GET /api/member/prayers → { prayers } avec contenu complet.
 *
 * Garde : session serveur obligatoire (getSessionProfile). 401 si non authentifié.
 * Aucun service role exposé au client. Aucun PDF en Lot 1. Aucun SQL (contenu statique).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true, message: 'Supabase requis.' }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  return NextResponse.json({ ok: true, data: { prayers: listMemberPrayers() } })
}
