/**
 * PODCAST-4 — Analytics d'écoute audio. Vocabulaire partagé + agrégation PURE.
 *
 * Ce module est la SOURCE UNIQUE des définitions de métriques et des fonctions
 * d'agrégation. 100 % pur (aucune I/O, aucune dépendance réseau) → testable en
 * isolation (Vitest). L'API admin lit des lignes bornées et délègue ici ; l'API
 * d'ingestion et l'observateur client réutilisent le vocabulaire (types/contexts).
 *
 * ── DÉFINITIONS (documentées, stables) ────────────────────────────────────
 *  • Play            : un événement play_start OU play_resume (démarrage réel de
 *                      lecture ; l'observateur ne l'émet qu'après un minimum de
 *                      lecture effective → un clic échoué n'est jamais compté).
 *  • Auditeur unique : clé d'auditeur distincte = user_id si connecté, sinon
 *                      session_key (anonyme). Précision anonyme LIMITÉE (par onglet,
 *                      aucun fingerprint) → sur-compte un même visiteur multi-onglets.
 *  • Temps d'écoute  : position la PLUS AVANCÉE atteinte par (auditeur × épisode)
 *                      (max position_seconds ; complété → durée). On ne SOMME pas
 *                      les checkpoints/seeks → aucun double comptage. Sous-compte
 *                      les ré-écoutes complètes (limite documentée).
 *  • Complétion      : (auditeur × épisode) ayant un événement `completed` OU
 *                      progression max ≥ 95 % (aligné COMPLETION_RATIO PODCAST-2).
 *  • Reprise         : (auditeur × épisode) ayant au moins un `play_resume`.
 *  • Abandon         : (auditeur × épisode) démarré, NON complété, progression max
 *                      < 95 %. Une simple pause n'est PAS un abandon.
 */

// ── Vocabulaire contrôlé (partagé client/serveur) ───────────────────────────
export const AUDIO_EVENT_TYPES = ['play_start', 'play_resume', 'progress_checkpoint', 'completed'] as const
export type AudioEventType = (typeof AUDIO_EVENT_TYPES)[number]

export const AUDIO_SOURCE_CONTEXTS = [
  'catalog', 'featured', 'new_release', 'continue_listening',
  'official_playlist', 'personal_playlist', 'homepage_instant', 'homepage_premium', 'direct',
  // PODCAST-8 : lecture depuis une recommandation. Deux dimensions DISTINCTES (pas de quasi-doublon) :
  //  • 'personalized' = rail « Pour toi » (ranking par membre) ;
  //  • 'popular'      = rail « Populaire dans La Voix du Royaume » (agrégat global, non personnalisé).
  'personalized', 'popular',
] as const
export type AudioSourceContext = (typeof AUDIO_SOURCE_CONTEXTS)[number]

export const AUDIO_ACCESS_CONTEXTS = ['public', 'member', 'premium'] as const
export type AudioAccessContext = (typeof AUDIO_ACCESS_CONTEXTS)[number]

/** Seuils de checkpoint (%). Économe : ≤ 4 écritures de progression par écoute. */
export const CHECKPOINT_THRESHOLDS = [25, 50, 75, 95] as const
/** Seuil de complétion (%). Aligné sur COMPLETION_RATIO (0.95) de PODCAST-2. */
export const COMPLETION_PERCENT = 95
/** Minimum de lecture réelle (s) avant de valider un play (anti clic-fantôme). */
export const MIN_PLAY_SECONDS = 2

export function isAudioEventType(v: unknown): v is AudioEventType {
  return typeof v === 'string' && (AUDIO_EVENT_TYPES as readonly string[]).includes(v)
}
export function isAudioSourceContext(v: unknown): v is AudioSourceContext {
  return typeof v === 'string' && (AUDIO_SOURCE_CONTEXTS as readonly string[]).includes(v)
}
export function isAudioAccessContext(v: unknown): v is AudioAccessContext {
  return typeof v === 'string' && (AUDIO_ACCESS_CONTEXTS as readonly string[]).includes(v)
}

// ── Types d'entrée ──────────────────────────────────────────────────────────
export interface AudioEventRow {
  podcast_id: string
  user_id: string | null
  session_key: string | null
  event_type: AudioEventType
  position_seconds: number | null
  duration_seconds: number | null
  percent_complete: number | null
  playlist_id: string | null
  source_context: string | null
  access_context: string | null
  occurred_at: string
}

export interface EpisodeMeta {
  id: string
  title: string
  serie: string | null
  access_level: string | null
}

// ── Types de sortie ─────────────────────────────────────────────────────────
export interface AudioKpis {
  total_plays: number
  unique_listeners: number
  total_listening_seconds: number
  avg_listening_seconds: number      // par écoute (auditeur × épisode démarré)
  completion_rate: number            // 0..1
  resume_rate: number                // 0..1
  abandon_rate: number               // 0..1
  started_sessions: number           // # (auditeur × épisode) démarrés — dénominateur
}

export interface EpisodeStat {
  podcast_id: string
  title: string
  serie: string | null
  plays: number
  unique_listeners: number
  listening_seconds: number
  completion_rate: number
}

export interface SeriesStat {
  serie: string
  plays: number
  unique_listeners: number
  listening_seconds: number
  completion_rate: number
}

export interface PlaylistStat {
  playlist_id: string
  plays: number
  unique_listeners: number
  listening_seconds: number
  completion_rate: number
}

export interface AccessLevelStat {
  access_context: string
  plays: number
  unique_listeners: number
  listening_seconds: number
}

export interface TrendPoint {
  bucket: string   // 'YYYY-MM-DD' (jour) ou 'YYYY-Www' (semaine)
  plays: number
  unique_listeners: number
}

export interface AudioAnalytics {
  kpis: AudioKpis
  top_episodes: EpisodeStat[]
  top_series: SeriesStat[]
  playlists: PlaylistStat[]
  access_breakdown: AccessLevelStat[]
  trend: TrendPoint[]
}

// ── Helpers purs ─────────────────────────────────────────────────────────────
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const isPlay = (t: AudioEventType) => t === 'play_start' || t === 'play_resume'

/** Clé d'auditeur : membre (user_id) prioritaire, sinon session anonyme. null si aucun. */
export function listenerKey(row: Pick<AudioEventRow, 'user_id' | 'session_key'>): string | null {
  if (row.user_id) return `u:${row.user_id}`
  if (row.session_key) return `s:${row.session_key}`
  return null
}

/** État agrégé d'une écoute = groupe (auditeur × épisode). */
interface Group {
  listener: string
  podcast_id: string
  started: boolean
  resumed: boolean
  completedEvent: boolean
  maxPercent: number
  maxPosition: number
  duration: number | null
  plays: number
}

/** Regroupe les événements par (auditeur, épisode). Les lignes SANS auditeur
 *  (ni user_id ni session_key) ne sont PAS regroupées : on ne peut pas attribuer
 *  une écoute cohérente sans identité de session → elles n'alimentent NI le temps
 *  d'écoute NI la complétion/abandon (sinon chaque checkpoint gonflerait le total).
 *  Leurs `plays` restent comptés globalement (total_plays parcourt `rows`), mais
 *  en pratique l'ingestion transmet toujours une clé de session. */
function buildGroups(rows: AudioEventRow[]): Group[] {
  const map = new Map<string, Group>()
  for (const r of rows) {
    const lk = listenerKey(r)
    if (!lk) continue
    const key = `${lk}::${r.podcast_id}`
    let g = map.get(key)
    if (!g) {
      g = { listener: lk, podcast_id: r.podcast_id, started: false, resumed: false, completedEvent: false, maxPercent: 0, maxPosition: 0, duration: null, plays: 0 }
      map.set(key, g)
    }
    if (isPlay(r.event_type)) { g.started = true; g.plays += 1 }
    if (r.event_type === 'play_resume') g.resumed = true
    if (r.event_type === 'completed') { g.completedEvent = true; g.maxPercent = 100 }
    const pct = num(r.percent_complete)
    if (pct > g.maxPercent) g.maxPercent = pct
    const pos = num(r.position_seconds)
    if (pos > g.maxPosition) g.maxPosition = pos
    const dur = r.duration_seconds != null ? num(r.duration_seconds) : null
    if (dur != null && dur > 0 && (g.duration == null || dur > g.duration)) g.duration = dur
  }
  return Array.from(map.values())
}

/** Temps d'écoute d'un groupe : position la plus avancée ; complété → durée connue. */
function groupListeningSeconds(g: Group): number {
  if ((g.completedEvent || g.maxPercent >= COMPLETION_PERCENT) && g.duration && g.duration > 0) return g.duration
  return Math.max(0, Math.floor(g.maxPosition))
}
function groupCompleted(g: Group): boolean {
  return g.completedEvent || g.maxPercent >= COMPLETION_PERCENT
}

/** Bucket temporel (UTC) : jour 'YYYY-MM-DD' ou semaine ISO 'YYYY-Www'. */
export function timeBucket(iso: string, granularity: 'day' | 'week'): string | null {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  const d = new Date(t)
  if (granularity === 'day') return d.toISOString().slice(0, 10)
  // Semaine ISO 8601.
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function rate(numer: number, denom: number): number {
  return denom > 0 ? numer / denom : 0
}

// ── Agrégation principale ────────────────────────────────────────────────────
export function aggregateAudioAnalytics(
  rows: AudioEventRow[],
  episodes: EpisodeMeta[] = [],
  opts: { granularity?: 'day' | 'week'; topN?: number } = {},
): AudioAnalytics {
  const granularity = opts.granularity ?? 'day'
  const topN = opts.topN ?? 10
  const metaById = new Map(episodes.map((e) => [e.id, e]))
  const groups = buildGroups(rows)

  // ── KPIs globaux ──
  const uniqueListeners = new Set<string>()
  for (const r of rows) { const lk = listenerKey(r); if (lk) uniqueListeners.add(lk) }
  const totalPlays = rows.reduce((a, r) => a + (isPlay(r.event_type) ? 1 : 0), 0)

  const startedGroups = groups.filter((g) => g.started)
  const completedGroups = startedGroups.filter(groupCompleted)
  const resumedGroups = startedGroups.filter((g) => g.resumed)
  const abandonedGroups = startedGroups.filter((g) => !groupCompleted(g) && g.maxPercent < COMPLETION_PERCENT)
  const totalListening = groups.reduce((a, g) => a + groupListeningSeconds(g), 0)

  const kpis: AudioKpis = {
    total_plays: totalPlays,
    unique_listeners: uniqueListeners.size,
    total_listening_seconds: totalListening,
    avg_listening_seconds: startedGroups.length
      ? Math.round(startedGroups.reduce((a, g) => a + groupListeningSeconds(g), 0) / startedGroups.length)
      : 0,
    completion_rate: rate(completedGroups.length, startedGroups.length),
    resume_rate: rate(resumedGroups.length, startedGroups.length),
    abandon_rate: rate(abandonedGroups.length, startedGroups.length),
    started_sessions: startedGroups.length,
  }

  // ── Top épisodes ──
  const byEpisode = new Map<string, { plays: number; listeners: Set<string>; seconds: number; started: number; completed: number }>()
  for (const g of groups) {
    let e = byEpisode.get(g.podcast_id)
    if (!e) { e = { plays: 0, listeners: new Set(), seconds: 0, started: 0, completed: 0 }; byEpisode.set(g.podcast_id, e) }
    e.plays += g.plays
    e.listeners.add(g.listener)
    e.seconds += groupListeningSeconds(g)
    if (g.started) { e.started += 1; if (groupCompleted(g)) e.completed += 1 }
  }
  const top_episodes: EpisodeStat[] = Array.from(byEpisode.entries())
    .map(([podcast_id, e]) => {
      const meta = metaById.get(podcast_id)
      return {
        podcast_id,
        title: meta?.title ?? 'Épisode',
        serie: meta?.serie ?? null,
        plays: e.plays,
        unique_listeners: e.listeners.size,
        listening_seconds: e.seconds,
        completion_rate: rate(e.completed, e.started),
      }
    })
    .sort((a, b) => b.plays - a.plays || b.listening_seconds - a.listening_seconds)
    .slice(0, topN)

  // ── Top émissions (série) ──
  const bySerie = new Map<string, { plays: number; listeners: Set<string>; seconds: number; started: number; completed: number }>()
  for (const g of groups) {
    const serie = metaById.get(g.podcast_id)?.serie
    if (!serie) continue
    let s = bySerie.get(serie)
    if (!s) { s = { plays: 0, listeners: new Set(), seconds: 0, started: 0, completed: 0 }; bySerie.set(serie, s) }
    s.plays += g.plays
    s.listeners.add(g.listener)
    s.seconds += groupListeningSeconds(g)
    if (g.started) { s.started += 1; if (groupCompleted(g)) s.completed += 1 }
  }
  const top_series: SeriesStat[] = Array.from(bySerie.entries())
    .map(([serie, s]) => ({ serie, plays: s.plays, unique_listeners: s.listeners.size, listening_seconds: s.seconds, completion_rate: rate(s.completed, s.started) }))
    .sort((a, b) => b.plays - a.plays || b.listening_seconds - a.listening_seconds)
    .slice(0, topN)

  // ── Playlists (écoutes rattachées à une playlist) ──
  // Regroupe par (auditeur × épisode × playlist) pour éviter de compter une même
  // écoute sur deux playlists ; les plays viennent des événements portant playlist_id.
  const plGroups = new Map<string, { playlist_id: string; listener: string; started: boolean; resumed: boolean; completed: boolean; maxPct: number; maxPos: number; dur: number | null; plays: number }>()
  for (const r of rows) {
    if (!r.playlist_id) continue
    const lk = listenerKey(r)
    if (!lk) continue    // écoute non attribuable → ignorée (cohérent avec buildGroups)
    const key = `${r.playlist_id}::${lk}::${r.podcast_id}`
    let g = plGroups.get(key)
    if (!g) { g = { playlist_id: r.playlist_id, listener: lk, started: false, resumed: false, completed: false, maxPct: 0, maxPos: 0, dur: null, plays: 0 }; plGroups.set(key, g) }
    if (isPlay(r.event_type)) { g.started = true; g.plays += 1 }
    if (r.event_type === 'completed') { g.completed = true; g.maxPct = 100 }
    const pct = num(r.percent_complete); if (pct > g.maxPct) g.maxPct = pct
    const pos = num(r.position_seconds); if (pos > g.maxPos) g.maxPos = pos
    const dur = r.duration_seconds != null ? num(r.duration_seconds) : null
    if (dur != null && dur > 0 && (g.dur == null || dur > g.dur)) g.dur = dur
  }
  const byPlaylist = new Map<string, { plays: number; listeners: Set<string>; seconds: number; started: number; completed: number }>()
  for (const g of Array.from(plGroups.values())) {
    let p = byPlaylist.get(g.playlist_id)
    if (!p) { p = { plays: 0, listeners: new Set(), seconds: 0, started: 0, completed: 0 }; byPlaylist.set(g.playlist_id, p) }
    p.plays += g.plays
    p.listeners.add(g.listener)
    const done = g.completed || g.maxPct >= COMPLETION_PERCENT
    p.seconds += done && g.dur ? g.dur : Math.max(0, Math.floor(g.maxPos))
    if (g.started) { p.started += 1; if (done) p.completed += 1 }
  }
  const playlists: PlaylistStat[] = Array.from(byPlaylist.entries())
    .map(([playlist_id, p]) => ({ playlist_id, plays: p.plays, unique_listeners: p.listeners.size, listening_seconds: p.seconds, completion_rate: rate(p.completed, p.started) }))
    .sort((a, b) => b.plays - a.plays || b.listening_seconds - a.listening_seconds)

  // ── Répartition par niveau d'accès ──
  const byAccess = new Map<string, { plays: number; listeners: Set<string>; seconds: number }>()
  // plays & listeners depuis les événements (access_context serveur) ; seconds depuis les groupes.
  for (const r of rows) {
    const ac = r.access_context || 'inconnu'
    let a = byAccess.get(ac)
    if (!a) { a = { plays: 0, listeners: new Set(), seconds: 0 }; byAccess.set(ac, a) }
    if (isPlay(r.event_type)) a.plays += 1
    const lk = listenerKey(r); if (lk) a.listeners.add(lk)
  }
  // Attribue les secondes d'un groupe au niveau d'accès dominant de l'épisode.
  const accessByEpisode = new Map<string, string>()
  for (const r of rows) { if (r.access_context && !accessByEpisode.has(r.podcast_id)) accessByEpisode.set(r.podcast_id, r.access_context) }
  for (const g of groups) {
    const ac = accessByEpisode.get(g.podcast_id) || 'inconnu'
    const a = byAccess.get(ac); if (a) a.seconds += groupListeningSeconds(g)
  }
  const access_breakdown: AccessLevelStat[] = Array.from(byAccess.entries())
    .map(([access_context, a]) => ({ access_context, plays: a.plays, unique_listeners: a.listeners.size, listening_seconds: a.seconds }))
    .sort((a, b) => b.plays - a.plays)

  // ── Tendance temporelle ──
  const byBucket = new Map<string, { plays: number; listeners: Set<string> }>()
  for (const r of rows) {
    const b = timeBucket(r.occurred_at, granularity)
    if (!b) continue
    let t = byBucket.get(b)
    if (!t) { t = { plays: 0, listeners: new Set() }; byBucket.set(b, t) }
    if (isPlay(r.event_type)) t.plays += 1
    const lk = listenerKey(r); if (lk) t.listeners.add(lk)
  }
  const trend: TrendPoint[] = Array.from(byBucket.entries())
    .map(([bucket, t]) => ({ bucket, plays: t.plays, unique_listeners: t.listeners.size }))
    .sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0))

  return { kpis, top_episodes, top_series, playlists, access_breakdown, trend }
}
