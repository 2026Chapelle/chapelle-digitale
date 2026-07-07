import { NextResponse } from 'next/server'
import { listPublicPrayerCards } from '@/lib/prayers/library'

/**
 * Bibliothèque de Prières — cartes PUBLIQUES (projection, V2.3-B Lot 1).
 *   GET /api/prayers → { cards } sans `content` ni `pdf`.
 *
 * Endpoint public (aperçu libre). Le contenu complet n'est JAMAIS renvoyé ici :
 * il transite uniquement par les routes membre protégées (/api/member/prayers).
 * Contenu statique curé — aucune base de données, aucun SQL.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true, data: { cards: listPublicPrayerCards() } })
}
