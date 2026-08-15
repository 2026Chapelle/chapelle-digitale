import { NextResponse } from 'next/server'
import { getPublicPrayerCards } from '@/lib/prayers/server'

/**
 * Bibliothèque de Prières — cartes PUBLIQUES (projection, V2.3-B/C).
 *   GET /api/prayers → { cards } sans `content` ni `guideSteps`/`takeaway`/`pdf`.
 *
 * Endpoint public. Lit Supabase (prayer_guides) si dispo, sinon fallback statique.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const cards = await getPublicPrayerCards()
  return NextResponse.json({ ok: true, data: { cards } })
}
