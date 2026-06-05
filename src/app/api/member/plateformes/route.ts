import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { resolveMyPays } from '@/lib/community/groups-server'
import { resolvePlatformScope, isValidPlatform } from '@/lib/platforms'
import { getAllPlatformsOverview, getPlatformDetail } from '@/lib/pastoral/platform-server'

/**
 * P3 — DASHBOARD PLATEFORME (lecture seule), portée imposée serveur :
 *  - admin / super_admin            → toutes les plateformes (filtre ?pays= optionnel)
 *  - responsable / pasteur national → toutes les plateformes, données bornées à son pays
 *  - autre                          → 403
 *   GET                  → vue globale des 8 plateformes
 *   GET ?plateforme=<id> → détail d'une plateforme
 * Délègue au service centralisé (zéro doublon, aucune nouvelle table/RPC).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })

  const myPays = await resolveMyPays(sp.uid)
  const scope = resolvePlatformScope({ role: sp.role, hasNationAssignment: myPays.length > 0 })
  if (scope === 'denied') return NextResponse.json({ ok: false, message: 'Accès refusé.' }, { status: 403 })

  // Rôle national déclaré mais SANS affectation pays → aucune donnée (pas de fuite globale),
  // aligné sur le scoping groupes/intégration (groups-server: nation sans pays → []).
  if (scope === 'nation' && !myPays.length) return NextResponse.json({ ok: false, message: 'Aucun périmètre national affecté.' }, { status: 403 })

  const q = req.nextUrl.searchParams
  // national → borné au pays affecté (cohérent avec /member/dashboard/nation) ; admin → filtre optionnel.
  const scopePays = scope === 'all' ? (q.get('pays') || null) : (myPays[0] || null)

  try {
    const plateforme = q.get('plateforme')
    if (plateforme) {
      if (!isValidPlatform(plateforme)) return NextResponse.json({ ok: false, message: 'Plateforme inconnue.' }, { status: 400 })
      return NextResponse.json({ ok: true, data: await getPlatformDetail(plateforme, { pays: scopePays }), scope })
    }
    return NextResponse.json({ ok: true, data: await getAllPlatformsOverview({ pays: scopePays }), scope })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
