import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getPrayerStats } from '@/lib/prayers/server'

/**
 * Admin — statistiques « Prières & Guides » (V2.3-C).
 *   GET /api/admin/prayer-guides/stats → agrégats (vues/lectures/téléchargements, tops, catégories).
 * Garde : cookie admin (isAdminRequest). sqlReady=false si tables non appliquées (état vide propre).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  const stats = await getPrayerStats()
  return NextResponse.json({ ok: true, data: stats })
}
