import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Inscription explicite à une formation (entrée dans le parcours de formation).
 *   POST /api/member/formations/enroll  { formation_id }
 * Crée l'inscription (inscriptions_formation) si absente. Idempotent.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { formation_id } = await req.json().catch(() => ({}))
    if (!formation_id) return NextResponse.json({ ok: false, message: 'formation_id requis.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('inscriptions_formation')
      .upsert({ user_id: sp.uid, formation_id, statut: 'actif', dernier_acces: new Date().toISOString() }, { onConflict: 'user_id,formation_id', ignoreDuplicates: true })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
