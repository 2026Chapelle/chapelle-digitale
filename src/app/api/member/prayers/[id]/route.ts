import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { getFullPrayer } from '@/lib/prayers/library'

/**
 * Bibliothèque de Prières — DÉTAIL complet d'une prière (V2.3-B Lot 1).
 *   GET /api/member/prayers/[id] → { prayer } avec contenu complet.
 *
 * Garde : session serveur obligatoire. 401 si non authentifié, 404 si id inconnu.
 * Aucun service role exposé au client. Aucun PDF en Lot 1. Aucun SQL (contenu statique).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true, message: 'Supabase requis.' }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const prayer = getFullPrayer(params.id)
  if (!prayer) return NextResponse.json({ ok: false, message: 'Prière introuvable.' }, { status: 404 })
  return NextResponse.json({ ok: true, data: { prayer } })
}
