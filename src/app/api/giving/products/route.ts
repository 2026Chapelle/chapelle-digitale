import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGivingProducts, getGivingWidgetSettings } from '@/lib/giving'

/**
 * Catalogue public des produits de don (Chariow) + réglages du widget.
 *   GET /api/giving/products?page=dons
 *
 * Lecture seule, fallback statique garanti. Utilisé par les composants client
 * du site public pour afficher les widgets / liens (aucune logique de paiement).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') || undefined
  const [products, widget] = await Promise.all([
    getGivingProducts(page),
    getGivingWidgetSettings(),
  ])
  return NextResponse.json({ ok: true, products, widget })
}
