import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getGivingProducts } from '@/lib/giving'

/**
 * DONS & OFFRANDES — Chariow (remplace l'ancienne intégration Stripe).
 *
 * IMPORTANT : ce projet n'utilise PAS Stripe. Aucun checkout, aucune donnée
 * bancaire. Le paiement réel se fait chez Chariow via widget ou lien direct.
 *
 *   GET  /api/dons              → catalogue public des produits (+ ?page=)
 *   POST /api/dons  { slug }    → renvoie le lien Chariow + journalise un clic
 *
 * Le webhook Stripe (PUT) a été supprimé : il n'a plus d'objet.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || undefined
  const products = await getGivingProducts(page)
  return NextResponse.json({ success: true, data: products })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { slug, email, montant, source, programme } = body || {}

    const products = await getGivingProducts()
    const product = products.find((p) => p.slug === slug) || products[0]
    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit introuvable' }, { status: 404 })
    }

    // Journalise l'intention (analytique only, pas de données bancaires).
    // `source`/`programme` permettent de tracer une offrande faite depuis un live.
    if (!IS_DEMO_MODE) {
      try {
        await supabaseAdmin.from('giving_transactions_log').insert({
          product_slug: product.slug,
          chariow_product_id: product.product_id,
          provider: 'chariow',
          event_type: 'redirect',
          amount: montant ?? null,
          email: email ?? null,
          status: 'redirige',
          source: source ?? null,
          programme: programme ?? null,
        })
      } catch { /* non bloquant */ }
    }

    // Renvoie le lien Chariow : le front redirige l'utilisateur vers Chariow.
    return NextResponse.json({
      success: true,
      data: {
        provider: 'chariow',
        product_id: product.product_id,
        redirect_url: product.direct_url,
        title: product.public_title,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur lors du traitement' }, { status: 500 })
  }
}
