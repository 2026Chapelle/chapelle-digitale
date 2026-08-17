/**
 * PODCAST — Avant-goût GRATUIT « L'Instant Citadelle » (ACCUEIL uniquement).
 *
 *   GET /api/podcast/home-instant/play?id=<uuid>
 *
 * Chemin DÉDIÉ, distinct du gate générique /api/podcast/[id]/play (inchangé). Il
 * délivre la lecture GRATUITE (visiteur inclus, sans login) d'UN SEUL épisode : celui
 * réellement DÉSIGNÉ dans le slot éditorial `home_instant` de l'accueil.
 *
 * SÉCURITÉ (la preuve est la désignation serveur, jamais le Referer / l'URL de page) :
 *   1. on lit côté serveur la sélection officielle (bloc d'accueil `podcast`.instant_ids
 *      + destinations `home_instant`) et les épisodes publiés (service_role) ;
 *   2. on résout l'instant courant avec la MÊME règle que l'accueil ;
 *   3. on autorise UNIQUEMENT si l'ID demandé EST cet instant, qu'il est explicitement
 *      désigné (instant_ids / destination / public) et NON premium (lib pure testée) ;
 *   4. sinon → refus (403/404). Un changement de sélection invalide l'ancien ID.
 * L'épisode conserve son `access_level` : via /podcast, il garde son gate normal.
 *
 * On ne renvoie jamais l'URL d'un épisode non autorisé, et les objets Storage sont
 * signés à courte durée (aucune URL permanente exposée).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { parsePodcastSlotConfig } from '@/lib/podcast/home-slots'
import { normalizeAccessLevel, normalizeDestinations } from '@/lib/podcast/editorial'
import { authorizeHomeInstantPlayback, type HomeInstantReason } from '@/lib/podcast/home-instant'
import { classifyMediaSource, PODCAST_PLAYBACK_TTL_SECONDS } from '@/lib/podcast/playback-access'

export const dynamic = 'force-dynamic'
// La désignation home_instant peut changer à tout moment (admin). On NE met JAMAIS en
// cache les lectures (épisodes + bloc) : un slot périmé ne doit jamais autoriser un
// ancien épisode ni refuser le nouveau. Force toutes les fetch de ce segment en no-store.
export const fetchCache = 'force-no-store'

function deny(reason: HomeInstantReason | 'no_media', status: number) {
  return NextResponse.json({ allowed: false, reason }, { status, headers: { 'Cache-Control': 'no-store' } })
}
function ok(playbackUrl: string, source: string, expiresAt: string | null) {
  return NextResponse.json(
    { allowed: true, reason: 'ok', playbackUrl, source, expiresAt },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return deny('no_instant', 404)
  const requestedId = (req.nextUrl.searchParams.get('id') || '').trim()
  if (!requestedId) return deny('not_designated', 403)

  try {
    // Épisodes publiés (service_role : lit l'URL média + l'access_level réel que le
    // client n'a jamais) ET config du bloc d'accueil (DONNÉE PUBLIQUE : lue via le
    // client anon, exactement comme la page d'accueil — robuste indépendamment d'un
    // GRANT service_role sur cms_homepage_blocks). En PARALLÈLE (pas de waterfall).
    const [episodesRes, blockRes] = await Promise.all([
      supabaseAdmin
        .from('cms_podcasts')
        .select('id, status, access_level, destinations, has_audio, audio_url, youtube_url, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(200),
      supabase.from('cms_homepage_blocks').select('data').eq('block_key', 'podcast').maybeSingle(),
    ])

    const rows = episodesRes.data
    if (episodesRes.error || !Array.isArray(rows)) return deny('no_instant', 404)

    // Forme minimale pour la résolution éditoriale (mêmes règles que l'accueil).
    const episodes = rows.map((r) => ({
      id: String((r as { id: unknown }).id),
      accessLevel: normalizeAccessLevel((r as { access_level?: unknown }).access_level),
      destinations: normalizeDestinations((r as { destinations?: unknown }).destinations),
      hasAudio: (r as { has_audio?: unknown }).has_audio !== false,
    }))
    const config = parsePodcastSlotConfig((blockRes.data as { data?: unknown } | null)?.data)

    const auth = authorizeHomeInstantPlayback(episodes, config, requestedId)
    if (!auth.allowed) {
      console.info(`[podcast/home-instant] denied id=${requestedId} reason=${auth.reason}`)
      return deny(auth.reason, auth.reason === 'no_instant' ? 404 : 403)
    }

    // Média de l'épisode autorisé (et lui seul).
    const row = rows.find((r) => String((r as { id: unknown }).id) === auth.episodeId) as
      | { audio_url?: unknown; youtube_url?: unknown }
      | undefined
    if (!row) return deny('no_instant', 404)

    const rawUrl =
      (typeof row.audio_url === 'string' && row.audio_url.trim()) ||
      (typeof row.youtube_url === 'string' && row.youtube_url.trim()) ||
      ''
    if (!rawUrl) return deny('no_media', 404)

    let expectedHost: string | null = null
    try { expectedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || null } catch { expectedHost = null }
    const source = classifyMediaSource(rawUrl, expectedHost)

    // Objet Storage → URL signée courte durée (aucune URL permanente exposée).
    if (source.kind === 'storage' && source.bucket && source.path) {
      try {
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from(source.bucket)
          .createSignedUrl(source.path, PODCAST_PLAYBACK_TTL_SECONDS)
        if (!signErr && signed?.signedUrl) {
          return ok(signed.signedUrl, 'storage_signed', new Date(Date.now() + PODCAST_PLAYBACK_TTL_SECONDS * 1000).toISOString())
        }
      } catch {
        /* signature indisponible → repli URL stockée */
      }
      return ok(rawUrl, 'storage_public', null)
    }

    // YouTube / externe : publiquement accessible à sa source, renvoyé tel quel.
    return ok(rawUrl, source.kind === 'youtube' ? 'youtube' : 'external', null)
  } catch (e) {
    console.error(`[podcast/home-instant] error id=${requestedId}: ${(e as Error)?.message ?? 'unknown'}`)
    return NextResponse.json({ allowed: false, reason: 'no_instant' }, { status: 500 })
  }
}
