import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Back-office — TRANSACTIONS réelles (tous paiements Chariow → table public.dons).
 *   GET /api/admin/transactions?from=&to=&produit=&type=&email=&membre=&statut=
 *
 * Vue unifiée pensée pour : dons, offrandes, partenariats, formations, masterclass,
 * marketplace, produits numériques (tout paiement Chariow remonte dans `dons`).
 * Garde cookie admin, lecture service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [], totaux: null })

  const sp = req.nextUrl.searchParams
  const clean = (s: string | null) => (s || '').replace(/[,()*%]/g, '').trim()

  try {
    let q = supabaseAdmin.from('dons')
      .select('id, user_nom, user_email, user_id, montant, devise, type, statut, source, programme, reference, chariow_transaction_id, recu_envoye, date_creation, meta_json')
      .order('date_creation', { ascending: false })
      .limit(500)

    if (sp.get('from')) q = q.gte('date_creation', sp.get('from'))
    if (sp.get('to')) q = q.lte('date_creation', sp.get('to'))
    if (sp.get('statut')) q = q.eq('statut', sp.get('statut'))
    const email = clean(sp.get('email')); if (email) q = q.ilike('user_email', `%${email}%`)
    const membre = clean(sp.get('membre')); if (membre) q = q.ilike('user_nom', `%${membre}%`)
    const source = clean(sp.get('type')); if (source) q = q.eq('source', source)

    const { data, error } = await q
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })

    const produitFilter = clean(sp.get('produit')).toLowerCase()
    const rows = (data || []).map((d: any) => {
      const meta = d.meta_json || {}
      const productName = meta?.product?.name || null
      const productId = meta?.product?.id || null
      const transactionId = meta?.sale?.id || d.chariow_transaction_id || null
      return {
        id: d.id, nom: d.user_nom, email: d.user_email, user_id: d.user_id,
        montant: Number(d.montant) || 0, devise: d.devise || 'FCFA',
        type: d.type || 'don', source: d.source || 'chariow',
        produit: productName, product_id: productId,
        reference: d.reference, transaction_id: transactionId,
        statut: d.statut, recu_envoye: !!d.recu_envoye, date: d.date_creation,
      }
    }).filter((r) => !produitFilter || `${r.produit || ''} ${r.product_id || ''} ${r.type}`.toLowerCase().includes(produitFilter))

    // Totaux GROUPÉS PAR DEVISE (ne jamais additionner XOF + EUR).
    const montant_par_devise: Record<string, number> = {}
    for (const r of rows) {
      if (r.statut === 'complete') montant_par_devise[r.devise] = (montant_par_devise[r.devise] || 0) + r.montant
    }
    const totaux = {
      transactions: rows.length,
      montant_par_devise,
      recus_envoyes: rows.filter((r) => r.recu_envoye).length,
    }
    return NextResponse.json({ ok: true, data: rows, totaux })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
