import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { matchesAudience } from '@/lib/communication/audience'

/**
 * Annonces actives visibles par le membre (filtrées par audience + période).
 *   GET /api/member/announcements
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const nowIso = new Date().toISOString()
    const { data } = await supabaseAdmin.from('announcements')
      .select('id, titre, body, level, target, active_from, active_until')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(50)
    const prof = sp.profile || {}
    const items = (data || []).filter((a: any) => {
      if (a.active_from && a.active_from > nowIso) return false
      if (a.active_until && a.active_until < nowIso) return false
      return matchesAudience(prof as any, a.target)
    }).map((a: any) => ({ id: a.id, titre: a.titre, body: a.body, level: a.level }))
    return NextResponse.json({ ok: true, data: items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
