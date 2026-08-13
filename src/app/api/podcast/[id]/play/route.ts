/**
 * PODCAST-SEC — Résolveur de lecture sécurisé.
 *
 *   GET /api/podcast/:id/play
 *
 * Le serveur (et lui seul) décide de l'autorisation :
 *   1. identité vérifiée côté serveur (session cookies → auth.getUser) ;
 *   2. profil réel chargé via service_role → statut membre ;
 *   3. épisode lu en base via service_role (le client ne fournit NI access_level
 *      NI l'URL — impossible de forger l'accès) ;
 *   4. décision PURE `decidePlaybackAccess` ;
 *   5. si autorisé → URL de lecture (signée si objet Storage), sinon 401/403/404.
 *
 * On ne renvoie JAMAIS l'URL média d'un contenu non autorisé. On ne LOG jamais
 * d'URL/token : uniquement podcast_id + reason.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'
import {
  decidePlaybackAccess,
  reasonToStatus,
  normalizeAccessLevel,
  isMemberStatus,
  classifyMediaSource,
  PODCAST_PLAYBACK_TTL_SECONDS,
  type PlaybackReason,
} from '@/lib/podcast/playback-access'

export const dynamic = 'force-dynamic'

function deny(reason: PlaybackReason) {
  return NextResponse.json({ allowed: false, reason }, { status: reasonToStatus(reason) })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const podcastId = (params?.id || '').trim()
  if (!podcastId) return deny('not_found')
  if (IS_DEMO_MODE) return deny('not_found')

  try {
    const isAdmin = isAdminRequest(req)

    // Identité vérifiée (null si anonyme/démo). Tolérante : espace membre.
    const session = isAdmin ? null : await getSessionProfile()
    const authenticated = Boolean(session)
    const isMember = isMemberStatus(session?.profile?.membre_statut)

    // Épisode réel (service_role → contourne le verrou colonne pour lire l'URL).
    const { data: ep, error } = await supabaseAdmin
      .from('cms_podcasts')
      .select('id, status, access_level, audio_url, youtube_url')
      .eq('id', podcastId)
      .maybeSingle()

    if (error || !ep) return deny('not_found')
    // Seuls les épisodes publiés sont lisibles (l'admin peut prévisualiser les brouillons).
    if ((ep as { status?: string }).status !== 'published' && !isAdmin) return deny('not_found')

    const accessLevel = normalizeAccessLevel((ep as { access_level?: unknown }).access_level)

    const decision = decidePlaybackAccess(accessLevel, {
      authenticated,
      isMember,
      isAdmin,
      hasPremiumEntitlement: false, // aucun modèle d'entitlement premium (décision métier requise)
    })

    if (!decision.allowed) {
      // Log minimal, sans URL ni token.
      console.info(`[podcast/play] denied id=${podcastId} level=${accessLevel} reason=${decision.reason}`)
      return deny(decision.reason)
    }

    const rawUrl =
      (typeof (ep as { audio_url?: unknown }).audio_url === 'string' && (ep as { audio_url: string }).audio_url.trim()) ||
      (typeof (ep as { youtube_url?: unknown }).youtube_url === 'string' && (ep as { youtube_url: string }).youtube_url.trim()) ||
      ''

    if (!rawUrl) return deny('no_media')

    // Hôte du projet Supabase → seules les URLs Storage de CE host sont signables.
    let expectedHost: string | null = null
    try { expectedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || null } catch { expectedHost = null }
    const source = classifyMediaSource(rawUrl, expectedHost)

    // Objet Supabase Storage → URL signée courte durée (vraie confidentialité si
    // le bucket est privé). Si la signature échoue (service indispo), on retombe
    // sur l'URL stockée sans casser la lecture.
    if (source.kind === 'storage' && source.bucket && source.path) {
      try {
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from(source.bucket)
          .createSignedUrl(source.path, PODCAST_PLAYBACK_TTL_SECONDS)
        if (!signErr && signed?.signedUrl) {
          return NextResponse.json(
            {
              allowed: true,
              reason: 'ok',
              playbackUrl: signed.signedUrl,
              source: 'storage_signed',
              expiresAt: new Date(Date.now() + PODCAST_PLAYBACK_TTL_SECONDS * 1000).toISOString(),
            },
            { status: 200, headers: { 'Cache-Control': 'no-store' } },
          )
        }
      } catch {
        /* signature indisponible → repli URL stockée */
      }
      return NextResponse.json(
        { allowed: true, reason: 'ok', playbackUrl: rawUrl, source: 'storage_public', expiresAt: null },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // Source externe / YouTube : publiquement accessible à sa source → on ne peut
    // pas la rendre réellement confidentielle. On la renvoie telle quelle.
    return NextResponse.json(
      {
        allowed: true,
        reason: 'ok',
        playbackUrl: rawUrl,
        source: source.kind === 'youtube' ? 'youtube' : 'external',
        expiresAt: null,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    console.error(`[podcast/play] error id=${podcastId}: ${(e as Error)?.message ?? 'unknown'}`)
    return NextResponse.json({ allowed: false, reason: 'not_found' }, { status: 500 })
  }
}
