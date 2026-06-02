import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Données d'un reçu de don par référence (pour la page imprimable /recu/[reference]).
 *   GET /api/recu/<reference> → { ok, recu: { nom, montant, devise, reference, date, methode, statut } }
 * Lecture service role ; n'expose que les champs du reçu (référence Chariow unguessable).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { reference: string } }) {
  const reference = decodeURIComponent(params.reference || '').trim()
  if (!reference) return NextResponse.json({ ok: false, message: 'Référence requise.' }, { status: 400 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, valide: false, demo: true })
  try {
    const { data } = await supabaseAdmin.from('dons')
      .select('user_nom, montant, devise, reference, statut, methode_paiement, date_creation')
      .or(`reference.eq.${reference},chariow_transaction_id.eq.${reference}`)
      .order('date_creation', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data || data.statut !== 'complete') return NextResponse.json({ ok: true, valide: false })
    return NextResponse.json({
      ok: true, valide: true,
      recu: {
        nom: data.user_nom || 'Donateur',
        montant: Number(data.montant) || 0,
        devise: data.devise || 'FCFA',
        reference: data.reference,
        date: data.date_creation,
        methode: data.methode_paiement || 'Chariow',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
