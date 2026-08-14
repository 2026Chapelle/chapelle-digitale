/**
 * PODCAST-8 — Popularité globale des épisodes (signal de recommandation).
 *
 *   GET /api/podcast/popularity        → { ok, episodes: { [podcast_id]: {plays, unique_listeners, completion_rate} } }
 *
 * PRIVACY : agrégat NON NOMINATIF uniquement. On lit `audio_listening_events` en service_role
 * (RLS deny sinon), et l'on n'expose JAMAIS user_id/email/historique — user_id ne sert qu'à
 * dédupliquer les auditeurs uniques (comme le dashboard admin PODCAST-4). Aucun fingerprinting.
 *
 * Perf : fenêtre bornée + cap d'échantillon + cache court mutualisé (un seul agrégat pour tous).
 * Additif : réutilise la lib PURE testée `aggregateAudioAnalytics`. Aucune migration, aucun tracking.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { aggregateAudioAnalytics, type AudioEventRow, type EpisodeMeta } from '@/lib/podcast/audio-analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 90
const MAX_EVENTS = 50_000
const TTL_MS = 300_000 // 5 min — la popularité varie lentement ; agrégat mutualisé

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, episodes: {} })
  // Anti-abus léger (agrégat public, mais évite le scraping en boucle).
  if (!rateLimit(`podcast-popularity:${clientIp(req)}`, { limit: 60, windowMs: 60_000 }).ok) {
    return NextResponse.json({ ok: false, message: 'Trop de requêtes.' }, { status: 429 })
  }
  try {
    const payload = await cached('podcast-popularity:v1', TTL_MS, compute)
    return NextResponse.json(payload)
  } catch (e: any) {
    // Fail-safe : jamais bloquant pour la page (la reco retombe sur récence/featured).
    return NextResponse.json({ ok: false, episodes: {}, message: e?.message || 'Erreur' }, { status: 200 })
  }
}

async function compute() {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  const { data: epRows } = await supabaseAdmin
    .from('cms_podcasts')
    .select('id, title, serie, access_level')
    .limit(2000)
  const episodes: EpisodeMeta[] = (epRows || []).map((e: any) => ({
    id: String(e.id), title: e.title || 'Épisode', serie: e.serie ?? null, access_level: e.access_level ?? null,
  }))

  const { data: evRows } = await supabaseAdmin
    .from('audio_listening_events')
    .select('podcast_id, user_id, session_key, event_type, position_seconds, duration_seconds, percent_complete, playlist_id, source_context, access_context, occurred_at')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(MAX_EVENTS)
  const rows: AudioEventRow[] = (evRows || []) as AudioEventRow[]

  const analytics = aggregateAudioAnalytics(rows, episodes, { granularity: 'week', topN: 500 })

  // Map compacte podcast_id → agrégats de popularité (aucune donnée nominative).
  const out: Record<string, { plays: number; unique_listeners: number; completion_rate: number }> = {}
  for (const s of analytics.top_episodes) {
    out[s.podcast_id] = { plays: s.plays, unique_listeners: s.unique_listeners, completion_rate: s.completion_rate }
  }
  return { ok: true, episodes: out }
}
