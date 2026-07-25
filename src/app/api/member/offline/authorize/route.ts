import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { resolveOfflineContent } from '@/lib/offline/server'
import { computeExpiresAt, isAllowedOfflineMime, OFFLINE_VALIDITY_DAYS } from '@/lib/offline/policy'

/**
 * Autorisation hors-ligne — SOURCE DE VÉRITÉ des droits (ré-évaluée à chaque appel).
 *
 *   POST /api/member/offline/authorize  { contentId }
 *     → { authorized, contentId, contentType, downloadAllowed, title, mimeType,
 *         sizeBytes, coverUrl, duration, expiresAt, accessVersion }
 *
 * Utilisé :
 *  - avant de télécharger (le client ne propose le bouton qu'en cas de droit) ;
 *  - au retour en ligne, pour re-vérifier l'accès et détecter une mise à jour ou
 *    une révocation (accessVersion), sans jamais exposer d'URL de fichier.
 *
 * Identité STRICTE (`getVerifiedRouteProfile`) : utilisateur vérifié serveur +
 * ligne `profiles` obligatoire.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, demo: true, message: 'Indisponible en démo.' }, { status: 401 })
  }

  const sp = await getVerifiedRouteProfile()
  if (!sp) {
    // Non authentifié → « Connexion requise » côté client.
    return NextResponse.json({ ok: false, authorized: false, reason: 'unauthenticated' }, { status: 401 })
  }

  let contentId = ''
  try {
    const body = await req.json()
    contentId = String(body?.contentId || '')
  } catch {
    return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 })
  }
  if (!contentId) {
    return NextResponse.json({ ok: false, message: 'contentId requis.' }, { status: 400 })
  }

  const content = await resolveOfflineContent(contentId)
  if (!content) {
    // Authentifié mais contenu absent / non publié / type non téléchargeable :
    // 200 explicite pour permettre au client de marquer l'item expiré/révoqué.
    return NextResponse.json({
      ok: true,
      authorized: false,
      contentId,
      reason: 'not_available',
    })
  }

  // Cohérence MIME ↔ type (defense-in-depth ; le stream re-validera aussi).
  const mimeOk = content.mime ? isAllowedOfflineMime(content.type, content.mime) : true

  return NextResponse.json({
    ok: true,
    authorized: true,
    downloadAllowed: mimeOk,
    contentId: content.id,
    contentType: content.type,
    title: content.title,
    mimeType: content.mime,
    sizeBytes: content.sizeBytes,
    coverUrl: content.coverUrl,
    duration: content.duration,
    accessVersion: content.accessVersion,
    // Expiration SUGGÉRÉE (le client la fige au moment du téléchargement réel).
    expiresAt: computeExpiresAt(new Date().toISOString(), OFFLINE_VALIDITY_DAYS),
  })
}
