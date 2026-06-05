import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { directory } from '@/lib/community/groups-server'

/**
 * Annuaire PUBLIC des groupes (lecture seule, anonyme).
 *   GET ?plateforme_id&type&pays&ville → groupes actifs (champs publics).
 * Réutilise le service centralisé `directory` (aucune liste de membres exposée).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const q = req.nextUrl.searchParams
  try {
    const data = await directory({
      plateforme_id: q.get('plateforme_id'), type: q.get('type'),
      pays: q.get('pays'), ville: q.get('ville'),
    })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
