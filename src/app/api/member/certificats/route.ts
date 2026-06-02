import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Certificats du membre connecté (parcours de transformation accompli).
 *   GET /api/member/certificats → { certificats: [...] }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { data } = await supabaseAdmin.from('certificats')
      .select('id, titre, type, reference, delivre_le')
      .eq('user_id', sp.uid)
      .order('delivre_le', { ascending: false })
    return NextResponse.json({ ok: true, certificats: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
