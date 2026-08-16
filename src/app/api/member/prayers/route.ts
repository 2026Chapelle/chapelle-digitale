import { NextResponse } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { getMemberPrayers } from '@/lib/prayers/server'

/**
 * Bibliothèque de Prières — LISTE membre connecté (V2.3-B/C).
 *   GET /api/member/prayers → { prayers } (Supabase si dispo, sinon fallback statique).
 * Garde : session serveur (getSessionProfile). 401 si non authentifié.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true, message: 'Supabase requis.' }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const prayers = await getMemberPrayers()
  return NextResponse.json({ ok: true, data: { prayers } })
}
