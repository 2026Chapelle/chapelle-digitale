import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Journalisation analytique des interactions de don (vue / clic / redirection).
 * AUCUNE donnée bancaire — le paiement réel se déroule chez Chariow.
 * POST /api/giving/log  { product_slug, chariow_product_id?, event_type, ... }
 */
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const body = await req.json().catch(() => ({}))
    const { product_slug, chariow_product_id, event_type = 'click', amount, currency, email, reference, meta } = body || {}
    await supabaseAdmin.from('giving_transactions_log').insert({
      product_slug: product_slug ?? null,
      chariow_product_id: chariow_product_id ?? null,
      provider: 'chariow',
      event_type,
      amount: amount ?? null,
      currency: currency ?? 'EUR',
      email: email ?? null,
      reference: reference ?? null,
      meta: meta ?? {},
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
