import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Mur Mondial de Prière — « J'ai prié ».
 *   POST /api/priere/pray  { id }
 * Incrémente le compteur réel d'intercesseurs mobilisés (prayers_count) pour
 * une demande publique. Anonyme, aucune donnée sensible. Service role.
 * Objectif : intercession collective réelle, jamais simulée.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 400 })
  try {
    const { id } = await req.json().catch(() => ({}))
    if (!id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    // Ne s'applique qu'aux demandes publiques (mur mondial).
    const { data: row } = await supabaseAdmin
      .from('priere_demandes').select('prayers_count, is_public').eq('id', id).single()
    if (!row || !row.is_public) return NextResponse.json({ ok: false, message: 'Demande indisponible.' }, { status: 404 })
    const next = (row.prayers_count || 0) + 1
    const { error } = await supabaseAdmin.from('priere_demandes').update({ prayers_count: next }).eq('id', id)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, prayers_count: next })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
