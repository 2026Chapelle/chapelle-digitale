import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Formations du membre connecté + progression réelle.
 *   GET /api/member/formations → { inscriptions: [...] }
 * En démo : 401 (UI repli mock).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { data: insc } = await supabaseAdmin
      .from('inscriptions_formation')
      .select('id, formation_id, progression, statut, dernier_acces, date_inscription, certificat_url')
      .eq('user_id', sp.uid)
      .order('dernier_acces', { ascending: false, nullsFirst: false })

    const ids = (insc || []).map((i: any) => i.formation_id)
    let formations: any[] = []
    if (ids.length) {
      const { data } = await supabaseAdmin
        .from('formations')
        .select('id, titre, slug, image_couverture, niveau, type, duree_heures, instructeur_nom, certifiant')
        .in('id', ids)
      formations = data || []
    }
    const fmap = new Map(formations.map((f) => [f.id, f]))
    const inscriptions = (insc || []).map((i: any) => ({ ...i, formation: fmap.get(i.formation_id) || null }))

    return NextResponse.json({ ok: true, data: { inscriptions } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
