/**
 * PODCAST-4 — Tableau de bord Analytics audio (« La Voix du Royaume »).
 *
 *   GET /api/admin/podcast-analytics?range=7d&serie=...&access=member&playlist=<uuid>
 *
 * Sécurité :
 *  - Garde cookie admin (isAdminRequest) — même modèle que /api/admin/analytics.
 *    Le back-office étant à accès partagé (Admin/Super Admin), la vraie garde est
 *    ici, au niveau de la route (masquer un lien ne protège rien).
 *  - Lecture service_role de `audio_listening_events` (RLS deny sinon). AUCUNE PII :
 *    on n'expose jamais user_id/email ni d'historique nominatif — uniquement des
 *    AGRÉGATS (user_id sert seulement à dédupliquer les auditeurs uniques).
 *  - Agrégation déléguée à la lib PURE `audio-analytics` (testée en isolation).
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { cached } from '@/lib/cache'
import { aggregateAudioAnalytics, type AudioEventRow, type EpisodeMeta } from '@/lib/podcast/audio-analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RANGES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, all: 3650 }
const TTL_MS = 30_000            // cache court (agrégat mutualisé, reste quasi temps réel)
const MAX_EVENTS = 50_000        // borne d'échantillon (protège la mémoire / requête)

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const sp = req.nextUrl.searchParams
  const rangeKey = RANGES[sp.get('range') || '7d'] ? (sp.get('range') || '7d') : '7d'
  const serie = (sp.get('serie') || '').trim() || null
  const access = (sp.get('access') || '').trim() || null
  const playlist = (sp.get('playlist') || '').trim() || null

  try {
    const key = `podcast-analytics:${rangeKey}:${serie || 'all'}:${access || 'all'}:${playlist || 'all'}`
    const payload = await cached(key, TTL_MS, () => compute(rangeKey, serie, access, playlist))
    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

async function compute(rangeKey: string, serie: string | null, access: string | null, playlist: string | null) {
  const days = RANGES[rangeKey]
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const granularity: 'day' | 'week' = days > 45 ? 'week' : 'day'

  // ── Métadonnées épisodes (titre/série/access_level) ──
  const { data: epRows } = await supabaseAdmin
    .from('cms_podcasts')
    .select('id, title, serie, access_level')
    .limit(2000)
  const episodes: EpisodeMeta[] = (epRows || []).map((e: any) => ({
    id: String(e.id), title: e.title || 'Épisode', serie: e.serie ?? null, access_level: e.access_level ?? null,
  }))
  const serieIds = serie ? new Set(episodes.filter((e) => e.serie === serie).map((e) => e.id)) : null

  // ── Événements de la fenêtre (borné) ──
  let q = supabaseAdmin
    .from('audio_listening_events')
    .select('podcast_id, user_id, session_key, event_type, position_seconds, duration_seconds, percent_complete, playlist_id, source_context, access_context, occurred_at')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(MAX_EVENTS)
  if (access) q = q.eq('access_context', access)
  if (playlist) q = q.eq('playlist_id', playlist)
  const { data: evRows } = await q
  let rows: AudioEventRow[] = (evRows || []) as AudioEventRow[]
  if (serieIds) rows = rows.filter((r) => serieIds.has(r.podcast_id))

  const analytics = aggregateAudioAnalytics(rows, episodes, { granularity, topN: 12 })

  // ── Titres de playlists (pour le bloc playlists) — aucune donnée nominative ──
  let playlistTitles = new Map<string, { title: string; type: string }>()
  const plIds = analytics.playlists.map((p) => p.playlist_id)
  if (plIds.length) {
    const { data: pls } = await supabaseAdmin
      .from('audio_playlists').select('id, title, playlist_type').in('id', plIds)
    playlistTitles = new Map((pls || []).map((p: any) => [String(p.id), { title: p.title || 'Playlist', type: p.playlist_type || 'personal' }]))
  }
  const playlists = analytics.playlists.map((p) => ({
    ...p,
    title: playlistTitles.get(p.playlist_id)?.title || 'Playlist',
    playlist_type: playlistTitles.get(p.playlist_id)?.type || 'personal',
  }))

  // Séries disponibles (pour le filtre).
  const availableSeries = Array.from(new Set(episodes.map((e) => e.serie).filter(Boolean))) as string[]

  return {
    ok: true,
    range: rangeKey,
    granularity,
    filters: { serie, access, playlist },
    available_series: availableSeries.sort(),
    sampled: rows.length >= MAX_EVENTS,   // signale un échantillon tronqué (transparence)
    ...analytics,
    playlists,
  }
}
