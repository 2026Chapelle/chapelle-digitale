/**
 * CITADELLE LIVING BOOKS — LB-SEC : résolveur d'accès document sécurisé.
 *
 *   GET /api/documents/:id/access
 *
 * Le serveur (et lui seul) décide de l'autorisation, exactement comme
 * /api/podcast/[id]/play :
 *   1. identité vérifiée côté serveur (session cookies → auth.getUser) ;
 *   2. document lu en base via service_role (le client ne fournit NI access_level
 *      NI l'URL — impossible de forger l'accès) ;
 *   3. décision PURE `decideDocumentAccess` ;
 *   4. si autorisé → URL de lecture (signée si objet Storage privé), sinon 401/403/404.
 *
 * On ne renvoie JAMAIS l'URL d'un document non autorisé, et on ne LOG jamais
 * d'URL/token : uniquement document_id + reason.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'
import { isMemberStatus, hasBooksPremiumAccess, reasonToStatus } from '@/lib/documents/document-delivery'
import { getDocumentDelivery } from '@/lib/documents/document-delivery-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = (params?.id || '').trim()
  if (!id || IS_DEMO_MODE) {
    return NextResponse.json({ allowed: false, reason: 'not_found' }, { status: 404 })
  }

  try {
    const isAdmin = isAdminRequest(req)
    const session = isAdmin ? null : await getSessionProfile()
    const authenticated = Boolean(session)
    const isMember = isMemberStatus(session?.profile?.membre_statut)
    // Droit Premium RÉEL, fail-closed. Résolu uniquement si authentifié.
    const hasPremiumEntitlement = authenticated
      ? await hasBooksPremiumAccess(supabaseAdmin, session?.uid)
      : false

    const result = await getDocumentDelivery(id, { authenticated, isMember, isAdmin, hasPremiumEntitlement })
    const status = result.allowed ? 200 : reasonToStatus(result.reason)
    return NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(`[documents/access] error id=${id}: ${(e as Error)?.message ?? 'unknown'}`)
    return NextResponse.json({ allowed: false, reason: 'not_found' }, { status: 500 })
  }
}
