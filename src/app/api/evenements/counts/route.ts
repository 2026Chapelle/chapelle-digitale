import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Compteur PUBLIC d'inscrits par événement (agrégat non nominatif).
 * Compté en service role (la RLS de event_registrations limite la lecture au
 * propriétaire ; ici on n'expose QUE des totaux, aucune donnée personnelle).
 *   GET → { ok, counts: { [event_id]: nb_inscrits } }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, counts: {} })
  try {
    const { data, error } = await supabaseAdmin.from('event_registrations')
      .select('event_id').eq('type', 'inscription').limit(20000)
    if (error) return NextResponse.json({ ok: false, counts: {}, message: error.message }, { status: 500 })
    const counts: Record<string, number> = {}
    for (const r of data || []) { if ((r as any).event_id) counts[(r as any).event_id] = (counts[(r as any).event_id] || 0) + 1 }
    return NextResponse.json({ ok: true, counts })
  } catch (e: any) {
    return NextResponse.json({ ok: false, counts: {}, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
