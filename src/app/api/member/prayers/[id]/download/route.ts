import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { getMemberPrayerPdf, recordPrayerEvent } from '@/lib/prayers/server'

/**
 * Téléchargement du PDF d'une prière (V2.3-C).
 *   GET /api/member/prayers/[id]/download → { url } autorisée, ou 404 « bientôt disponible ».
 * Garde : session serveur. Enregistre l'événement `download` (best-effort).
 * Aucun PDF n'est généré : on renvoie l'URL déjà stockée (pdf_url) si elle existe.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true, message: 'Supabase requis.' }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const pdf = await getMemberPrayerPdf(params.id)
  if (!pdf) return NextResponse.json({ ok: false, message: 'PDF bientôt disponible.' }, { status: 404 })
  await recordPrayerEvent(pdf.id, 'download', sp.uid)
  return NextResponse.json({ ok: true, data: { url: pdf.url } })
}
