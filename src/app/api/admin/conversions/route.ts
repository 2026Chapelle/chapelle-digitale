import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getConversionsAnalytics } from '@/lib/pastoral/statut-history-server'

/**
 * P4 — Conversions de statut (exploitation de membre_statut_history).
 *   GET ?pays=&granularity=month|week → analyse temporelle + rétention.
 * Garde cookie admin. Délègue au service centralisé (zéro doublon, aucune RPC).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: null })
  const q = req.nextUrl.searchParams
  try {
    const granularity = q.get('granularity') === 'week' ? 'week' : 'month'
    return NextResponse.json({ ok: true, data: await getConversionsAnalytics({ pays: q.get('pays'), granularity }) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
