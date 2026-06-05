import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Marque un certificat du membre comme CONSULTÉ (certificats.consulte_le).
 *   POST { reference } — appelé quand le membre ouvre son certificat.
 * Sert au déclencheur « certificat non consulté » (cron). Non sensible, idempotent.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    const { reference } = await req.json().catch(() => ({}))
    if (!reference) return NextResponse.json({ ok: false, message: 'reference requise.' }, { status: 400 })
    await supabaseAdmin.from('certificats')
      .update({ consulte_le: new Date().toISOString() })
      .eq('user_id', sp.uid).eq('reference', String(reference)).is('consulte_le', null)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
