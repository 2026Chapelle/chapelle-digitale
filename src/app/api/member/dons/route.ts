import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Historique réel des dons du membre connecté.
 *   GET /api/member/dons → { dons: [...], totals }
 * En démo : 401 (UI repli mock).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    // Email de session pour rattacher AUSSI les dons faits via Chariow (par email).
    const { data: prof } = await supabaseAdmin.from('profiles').select('email').eq('id', sp.uid).maybeSingle()
    const email = (prof?.email || '').trim().toLowerCase()
    const cols = 'id, montant, devise, type, frequence, statut, source, reference, message, date_creation, recu_envoye, user_id, user_email'

    // Deux requêtes fusionnées (par user_id ET par email), dédupliquées.
    const [byId, byEmail] = await Promise.all([
      supabaseAdmin.from('dons').select(cols).eq('user_id', sp.uid).order('date_creation', { ascending: false }).limit(200),
      email ? supabaseAdmin.from('dons').select(cols).ilike('user_email', email).order('date_creation', { ascending: false }).limit(200) : Promise.resolve({ data: [] as any[] }),
    ])
    const map: Record<string, any> = {}
    for (const d of [...(byId.data || []), ...(byEmail.data || [])]) map[d.id] = d
    const list = Object.values(map).sort((a: any, b: any) => String(b.date_creation).localeCompare(String(a.date_creation)))

    // Total = tous les dons non explicitement échoués/annulés (le webhook n'insère que des paiements confirmés).
    const valides = list.filter((d: any) => !['echoue', 'annule', 'rembourse'].includes(d.statut))
    const total = valides.reduce((s: number, d: any) => s + Number(d.montant || 0), 0)

    return NextResponse.json({
      ok: true,
      data: {
        dons: list,
        totals: {
          total_donne: total,
          nombre: valides.length,
          devise: list[0]?.devise || 'FCFA',
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
