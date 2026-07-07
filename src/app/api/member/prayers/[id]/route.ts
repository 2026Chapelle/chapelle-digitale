import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { getMemberPrayerDetail, recordPrayerEvent } from '@/lib/prayers/server'

/**
 * Bibliothèque de Prières — DÉTAIL complet (V2.3-B/C).
 *   GET /api/member/prayers/[id]  ([id] = slug ou uuid)
 * Garde : session serveur. 401 si non authentifié, 404 si introuvable.
 * Enregistre l'événement `member_open` (best-effort ; no-op si table absente).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true, message: 'Supabase requis.' }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const prayer = await getMemberPrayerDetail(params.id)
  if (!prayer) return NextResponse.json({ ok: false, message: 'Prière introuvable.' }, { status: 404 })
  await recordPrayerEvent(prayer.id, 'member_open', sp.uid)
  return NextResponse.json({ ok: true, data: { prayer } })
}
