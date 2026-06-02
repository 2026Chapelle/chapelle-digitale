import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Achats du membre (produits marketplace : ebooks, masterclass, billets…).
 *   GET → { achats: [{ titre, montant, devise, access_token, statut, date }] }
 * Rattachés par user_id OU email (les achats Chariow arrivent par email).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, achats: [] })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { data: prof } = await supabaseAdmin.from('profiles').select('email').eq('id', sp.uid).maybeSingle()
    const email = (prof?.email || '').trim().toLowerCase()
    const cols = 'id, titre, montant, devise, access_token, statut, created_at, product_id'
    const [byId, byEmail] = await Promise.all([
      supabaseAdmin.from('product_purchases').select(cols).eq('user_id', sp.uid).order('created_at', { ascending: false }),
      email ? supabaseAdmin.from('product_purchases').select(cols).ilike('email', email).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    ])
    const map: Record<string, any> = {}
    for (const a of [...(byId.data || []), ...(byEmail.data || [])]) map[a.id] = a
    const achats = Object.values(map).sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
    return NextResponse.json({ ok: true, achats })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
