/**
 * PODCAST-4 — Ingestion d'un événement d'écoute audio (écriture seule).
 *
 *   POST /api/podcast/analytics
 *   body: {
 *     session?: string,            // clé de session anonyme (dedup, jamais PII)
 *     podcastId: string,           // UUID épisode (contraint par FK)
 *     eventType: 'play_start'|'play_resume'|'progress_checkpoint'|'completed',
 *     position?: number, duration?: number, percent?: number,
 *     playlistId?: string,         // UUID playlist (optionnel)
 *     sourceContext?: string       // valeur contrôlée (catalog|featured|…)
 *   }
 *
 * SÉCURITÉ (anti-spoof) :
 *  - `user_id` est dérivé de la SESSION VÉRIFIÉE (getSessionProfile) — JAMAIS du
 *    client. Un membre ne peut donc pas écrire au nom d'un autre.
 *  - L'épisode est lu en base (service_role) : `podcastId` inexistant / non publié
 *    → 204 SANS écriture (aucun faux play). `access_context` provient de la base,
 *    pas du client.
 *  - Aucune URL média / token n'est reçu ni journalisé : seulement `podcast_id`.
 *  - Écriture via service_role uniquement (RLS deny par défaut). Réponse 204
 *    immédiate (compatible navigator.sendBeacon), jamais bloquante.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { isAdminRequest } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'
import { normalizeAccessLevel, isMemberStatus, decidePlaybackAccess } from '@/lib/podcast/playback-access'
import { hasPodcastPremiumAccess } from '@/lib/podcast/entitlement'
import { isAudioEventType, isAudioSourceContext } from '@/lib/podcast/audio-analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const str = (v: unknown, max = 256): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}
const intOrNull = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(min, Math.min(max, Math.round(n)))
}

export async function POST(req: NextRequest) {
  const ok = () => new NextResponse(null, { status: 204 })

  // Anti-flood : une écoute complète émet ≤ 6 événements ; 60/min/IP couvre plusieurs onglets.
  if (!rateLimit(`podcast-analytics:${clientIp(req)}`, { limit: 60, windowMs: 60 * 1000 }).ok) {
    return new NextResponse(null, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = JSON.parse(await req.text()) as Record<string, unknown> } catch { return ok() }
  if (IS_DEMO_MODE) return ok()

  const podcastId = str(body.podcastId) || str(body.podcast_id)
  if (!podcastId || !UUID_RE.test(podcastId)) return ok()

  const eventType = str(body.eventType) || str(body.event_type)
  if (!isAudioEventType(eventType)) return ok()

  try {
    // Le back-office ne se compte pas (cohérent avec l'observateur qui ignore /admin).
    // Évite aussi qu'un admin (bypass PODCAST-SEC) enregistre de faux plays premium anonymes.
    if (isAdminRequest(req)) return ok()
    // ── Identité vérifiée serveur (null si anonyme). On NE fait JAMAIS confiance au userId client. ──
    const session = await getSessionProfile().catch(() => null)
    const userId = session?.uid ?? null

    // ── Épisode réel : existence + statut + access_level (source de vérité serveur). ──
    const { data: ep, error } = await supabaseAdmin
      .from('cms_podcasts')
      .select('id, status, access_level')
      .eq('id', podcastId)
      .maybeSingle()
    // Épisode inexistant ou non publié → aucun événement (anti faux play / anti spoof podcast_id).
    if (error || !ep || (ep as { status?: string }).status !== 'published') return ok()

    const accessContext = normalizeAccessLevel((ep as { access_level?: unknown }).access_level)

    // ── Autorisation d'écoute (même règle serveur que PODCAST-SEC) : aucune analytics
    //    ne contourne la sécurité média. Un appelant qui n'aurait PAS pu lire l'épisode
    //    (anon sur member, non-membre sur member, non-premium sur premium) ne produit
    //    AUCUN événement → pas de faux play, breakdown par accès non pollué. ──
    const hasPremiumEntitlement =
      accessContext === 'premium' && session
        ? await hasPodcastPremiumAccess(supabaseAdmin, session.uid)
        : false
    const decision = decidePlaybackAccess(accessContext, {
      authenticated: Boolean(session),
      isMember: isMemberStatus(session?.profile?.membre_statut),
      isAdmin: false,   // l'admin est déjà sorti plus haut (ne se compte pas)
      hasPremiumEntitlement,
    })
    if (!decision.allowed) return ok()

    // ── Playlist optionnelle : retenue UNIQUEMENT si elle CONTIENT réellement l'épisode
    //    (sinon un client pourrait attribuer une écoute à une playlist officielle non utilisée). ──
    let playlistId: string | null = null
    const rawPlaylist = str(body.playlistId) || str(body.playlist_id)
    if (rawPlaylist && UUID_RE.test(rawPlaylist)) {
      const { data: item } = await supabaseAdmin
        .from('audio_playlist_items').select('id')
        .eq('playlist_id', rawPlaylist).eq('podcast_id', podcastId).maybeSingle()
      if (item && typeof (item as { id?: unknown }).id === 'string') playlistId = rawPlaylist
    }

    const sourceContextRaw = str(body.sourceContext) || str(body.source_context)
    const sourceContext = isAudioSourceContext(sourceContextRaw) ? sourceContextRaw : null

    await supabaseAdmin.from('audio_listening_events').insert({
      podcast_id: podcastId,
      user_id: userId,
      session_key: str(body.session) || str(body.session_id, 128),
      event_type: eventType,
      position_seconds: intOrNull(body.position, 0, 86_400),   // borne : 24 h max
      duration_seconds: intOrNull(body.duration, 0, 86_400),
      percent_complete: intOrNull(body.percent, 0, 100),
      playlist_id: playlistId,
      source_context: sourceContext,
      access_context: accessContext,
    })
  } catch {
    // Télémétrie : ne jamais propager au client.
  }
  return ok()
}
