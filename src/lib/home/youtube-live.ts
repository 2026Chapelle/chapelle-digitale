import 'server-only'
import type { LiveState } from './contextual'
import { refreshAccessToken, YouTubeAuthError } from '@/lib/intelligence/connectors/youtube/auth'
import { loadYouTubeConfig } from '@/lib/intelligence/connectors/youtube/config'

/**
 * Détection du direct YouTube de la chaîne (OAuth propriétaire, lecture seule).
 *
 * Source : `liveBroadcasts.list` (Data API v3). Dans cette ressource, les horaires
 * (`scheduledStartTime`, `actualStartTime`, `actualEndTime`) vivent dans `snippet`.
 * `liveStreamingDetails` n'existe QUE sur `videos.list` : le demander en `part` ici
 * provoque une erreur 400. On accepte néanmoins les deux formes en entrée.
 *
 * Contrat : jamais de secret journalisé ; les erreurs sont réduites à des codes
 * non sensibles (`youtube_*`) exposés via `detectYouTubeLiveDetailed()`.
 */
export type YouTubeItem = {
  id?: string | { videoId?: string }
  snippet?: {
    title?: string
    publishedAt?: string
    channelId?: string
    scheduledStartTime?: string
    actualStartTime?: string
    actualEndTime?: string
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } }
  }
  status?: { lifeCycleStatus?: string; privacyStatus?: string }
  /** Forme `videos.list` (compatibilité) — absente des réponses `liveBroadcasts.list`. */
  liveStreamingDetails?: { actualStartTime?: string; scheduledStartTime?: string; actualEndTime?: string }
}
export type YouTubeLiveDetection = {
  /** LIVE / UPCOMING, ou null si hors ligne, non configuré ou en erreur. */
  state: LiveState | null
  /** Code non sensible (`youtube_oauth_invalid_grant`, `youtube_live_403`, …) ou null. */
  error: string | null
  fromCache: boolean
}
type DetectorOptions = { now?: Date; fetchImpl?: typeof fetch }
type Kind = 'LIVE' | 'UPCOMING' | 'ENDED'

/** Au-delà de ce retard, un direct programmé jamais démarré n'est plus « Prochain direct ». */
export const UPCOMING_GRACE_MS = 6 * 60 * 60_000
/** Après une erreur YouTube, on attend avant de réessayer (évite de marteler OAuth). */
export const ERROR_RETRY_SECONDS = 60
const BROADCASTS_URL = 'https://www.googleapis.com/youtube/v3/liveBroadcasts'
/** Délai maximal d'un appel YouTube Data API (sans lui, Node attend jusqu'à 300 s par défaut). */
export const YOUTUBE_REQUEST_TIMEOUT_MS = 15_000

const channelId = () => process.env.YOUTUBE_CHANNEL_ID?.trim() || ''
let cached: { state: LiveState; error: string | null; expiresAt: number } | null = null
let accessToken: { value: string; expiresAtMs: number } | null = null
let lastWarned: string | null = null
let lastCheckedAt: number | null = null
/** Cache court des vérifications `videos.list` (par identifiant vidéo). */
const verified = new Map<string, { verdict: VideoLiveVerdict; expiresAt: number }>()
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
export const VERIFY_TTL_SECONDS = 60
export type VideoLiveVerdict = 'LIVE' | 'UPCOMING' | 'ENDED' | 'NOT_LIVE' | 'UNKNOWN'
export type YouTubeLiveDiagnostics = {
  oauthConfigured: boolean
  channelIdConfigured: boolean
  lastError: string | null
  lastCheckedAt: string | null
  cachedStatus: LiveState['status'] | null
  cacheExpiresAt: string | null
}

export function revalidationSeconds(state: LiveState, now = new Date()): number {
  if (state.status === 'LIVE') return 30
  if (state.status === 'OFFLINE') return 60
  if (!state.scheduledAt) return 180
  const remaining = Date.parse(state.scheduledAt) - now.getTime()
  if (remaining <= 15 * 60_000) return 30
  if (remaining <= 60 * 60_000) return 180
  return 900
}

const videoId = (item: YouTubeItem | undefined) => (typeof item?.id === 'string' ? item.id : item?.id?.videoId)
const parse = (v?: string) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : undefined }
/** Horaires normalisés : `snippet` (liveBroadcasts) d'abord, `liveStreamingDetails` (videos) ensuite. */
const timing = (item: YouTubeItem) => {
  const s = item.snippet, d = item.liveStreamingDetails
  return {
    scheduledStart: s?.scheduledStartTime || d?.scheduledStartTime,
    actualStart: s?.actualStartTime || d?.actualStartTime,
    actualEnd: s?.actualEndTime || d?.actualEndTime,
  }
}

const toState = (item: YouTubeItem, status: 'LIVE' | 'UPCOMING'): LiveState | null => {
  const id = videoId(item), snippet = item.snippet, title = snippet?.title?.trim()
  if (!id || !title || !snippet) return null
  const t = timing(item), thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url
  if (status === 'LIVE') return { status, title, youtubeVideoId: id, watchUrl: '/live', thumbnail, startedAt: t.actualStart }
  const scheduledAt = parse(t.scheduledStart) !== undefined ? t.scheduledStart : undefined
  return { status, title, youtubeVideoId: id, watchUrl: '/live', thumbnail, ...(scheduledAt ? { scheduledAt } : {}) }
}

export function classifyBroadcast(item: YouTubeItem, now = new Date()): Kind | null {
  const life = item.status?.lifeCycleStatus, privacy = item.status?.privacyStatus, t = timing(item)
  if (life === 'complete' || life === 'revoked' || t.actualEnd) return 'ENDED'
  if (life === 'live' || life === 'liveStarting' || (t.actualStart && !t.actualEnd)) return 'LIVE'
  const upcomingLife = ['ready', 'created', 'testStarting', 'testing'].includes(life || '')
  if ((privacy === 'public' || privacy === 'unlisted') && !t.actualStart && upcomingLife) {
    const scheduled = parse(t.scheduledStart)
    // Programmé mais jamais démarré depuis trop longtemps : ne plus l'afficher.
    if (scheduled !== undefined && scheduled < now.getTime() - UPCOMING_GRACE_MS) return 'ENDED'
    return 'UPCOMING'
  }
  return null
}

export function classifyOwnedBroadcasts(items: YouTubeItem[], now = new Date()): LiveState | null {
  const eligible = items.map(item => ({ item, kind: classifyBroadcast(item, now) }))
  const live = eligible.find(x => x.kind === 'LIVE')
  if (live) return toState(live.item, 'LIVE')
  const upcoming = eligible.filter(x => x.kind === 'UPCOMING').sort((a, b) => {
    const at = parse(timing(a.item).scheduledStart), bt = parse(timing(b.item).scheduledStart)
    // Programmés (le plus proche d'abord), puis non programmés (le plus récent d'abord).
    if (at !== undefined && bt !== undefined) return at - bt
    if (at !== undefined) return -1
    if (bt !== undefined) return 1
    return (parse(b.item.snippet?.publishedAt) || 0) - (parse(a.item.snippet?.publishedAt) || 0)
  })[0]
  return upcoming ? toState(upcoming.item, 'UPCOMING') : null
}

/**
 * Vérifie que les diffusions appartiennent bien à la chaîne attendue (`YOUTUBE_CHANNEL_ID`).
 * Si toutes les diffusions portent un autre `channelId`, le compte OAuth connecté n'est
 * pas celui de la chaîne : on lève `youtube_channel_mismatch` plutôt que d'afficher
 * (ou de taire) le mauvais actif.
 */
export function filterOwnedChannel(items: YouTubeItem[], expectedChannelId = channelId()): YouTubeItem[] {
  if (!expectedChannelId) return items
  const tagged = items.filter(i => i.snippet?.channelId)
  if (tagged.length && tagged.every(i => i.snippet?.channelId !== expectedChannelId)) throw new Error('youtube_channel_mismatch')
  return items.filter(i => !i.snippet?.channelId || i.snippet.channelId === expectedChannelId)
}

async function bearerToken(nowMs: number, fetchImpl: typeof fetch): Promise<string> {
  const config = loadYouTubeConfig()
  if (!config) throw new Error('youtube_oauth_not_configured')
  if (accessToken && accessToken.expiresAtMs > nowMs + 30_000) return accessToken.value
  const token = await refreshAccessToken(config, { nowMs, fetchImpl })
  accessToken = { value: token.accessToken, expiresAtMs: token.expiresAtMs }
  return token.accessToken
}

export type BroadcastStatusFilter = 'active' | 'upcoming' | 'completed'
async function listBroadcasts(broadcastStatus: BroadcastStatusFilter, nowMs: number, fetchImpl: typeof fetch): Promise<YouTubeItem[]> {
  const token = await bearerToken(nowMs, fetchImpl), url = new URL(BROADCASTS_URL)
  // `broadcastStatus` cible les diffusions du compte authentifié sans dépendre de la
  // pagination de `mine=true` (50 diffusions max, anciennes incluses). `broadcastType=all`
  // couvre les diffusions persistantes (« Diffuser maintenant ») et les événements programmés.
  url.search = new URLSearchParams({ part: 'id,snippet,status', broadcastStatus, broadcastType: 'all', maxResults: '50' }).toString()
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(YOUTUBE_REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`youtube_live_${response.status}`)
  return ((await response.json()) as { items?: YouTubeItem[] }).items || []
}

async function resolveOwnedState(now: Date, fetchImpl: typeof fetch): Promise<LiveState> {
  const nowMs = now.getTime()
  const active = filterOwnedChannel(await listBroadcasts('active', nowMs, fetchImpl))
  const live = classifyOwnedBroadcasts(active, now)
  if (live?.status === 'LIVE') return live
  const upcoming = filterOwnedChannel(await listBroadcasts('upcoming', nowMs, fetchImpl))
  return classifyOwnedBroadcasts([...active, ...upcoming], now) || { status: 'OFFLINE' }
}

const errorCode = (err: unknown): string => {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) return 'youtube_timeout'
  const message = err instanceof Error ? err.message : ''
  return /^youtube_[a-z0-9_]+$/.test(message) ? message : 'youtube_live_error'
}

/** Détection détaillée : état + code d'erreur non sensible (pour diagnostics et route canonique). */
export async function detectYouTubeLiveDetailed(options: DetectorOptions = {}): Promise<YouTubeLiveDetection> {
  const now = options.now || new Date(), nowMs = now.getTime(), fetchImpl = options.fetchImpl || fetch
  if (cached && cached.expiresAt > nowMs) {
    return { state: cached.state.status === 'OFFLINE' ? null : cached.state, error: cached.error, fromCache: true }
  }
  try {
    const state = await resolveOwnedState(now, fetchImpl)
    cached = { state, error: null, expiresAt: nowMs + revalidationSeconds(state, now) * 1000 }
    lastCheckedAt = nowMs
    lastWarned = null
    return { state: state.status === 'OFFLINE' ? null : state, error: null, fromCache: false }
  } catch (err) {
    const code = errorCode(err)
    if (err instanceof YouTubeAuthError || code.startsWith('youtube_live_4')) accessToken = null
    cached = { state: { status: 'OFFLINE' }, error: code, expiresAt: nowMs + ERROR_RETRY_SECONDS * 1000 }
    lastCheckedAt = nowMs
    if (lastWarned !== code) { lastWarned = code; console.warn(`[youtube-live] detection failed: ${code}`) }
    return { state: null, error: code, fromCache: false }
  }
}

/** Compatibilité : LIVE/UPCOMING ou null (hors ligne, non configuré, erreur). */
export async function detectYouTubeLive(options: DetectorOptions = {}): Promise<LiveState | null> {
  return (await detectYouTubeLiveDetailed(options)).state
}

/**
 * Vérifie l'état réel d'UNE vidéo (`videos.list`, part snippet + liveStreamingDetails) :
 * sert à invalider une ligne CMS « live » dont le direct YouTube est terminé, quelle que
 * soit la chaîne. Ne lève jamais : toute erreur → 'UNKNOWN' (la borne temporelle s'applique).
 */
export async function verifyYouTubeVideoLive(videoIdValue: string, options: DetectorOptions = {}): Promise<VideoLiveVerdict> {
  const now = options.now || new Date(), nowMs = now.getTime(), fetchImpl = options.fetchImpl || fetch
  if (!/^[\w-]{11}$/.test(videoIdValue)) return 'UNKNOWN'
  const hit = verified.get(videoIdValue)
  if (hit && hit.expiresAt > nowMs) return hit.verdict
  let verdict: VideoLiveVerdict = 'UNKNOWN'
  try {
    const token = await bearerToken(nowMs, fetchImpl), url = new URL(VIDEOS_URL)
    url.search = new URLSearchParams({ part: 'snippet,liveStreamingDetails', id: videoIdValue }).toString()
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(YOUTUBE_REQUEST_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`youtube_videos_${response.status}`)
    const item = (((await response.json()) as { items?: Array<{ snippet?: { liveBroadcastContent?: string }; liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string } }> }).items || [])[0]
    if (!item) verdict = 'NOT_LIVE'
    else if (item.liveStreamingDetails?.actualEndTime) verdict = 'ENDED'
    else if (item.snippet?.liveBroadcastContent === 'live') verdict = 'LIVE'
    else if (item.snippet?.liveBroadcastContent === 'upcoming') verdict = 'UPCOMING'
    else verdict = 'NOT_LIVE'
  } catch (err) {
    const code = errorCode(err)
    if (lastWarned !== code) { lastWarned = code; console.warn(`[youtube-live] video verification failed: ${code}`) }
    verdict = 'UNKNOWN'
  }
  verified.set(videoIdValue, { verdict, expiresAt: nowMs + VERIFY_TTL_SECONDS * 1000 })
  return verdict
}

/** Détails vidéo (ressource `videos`) utilisés par la synchronisation des replays. */
export type YouTubeVideoDetails = {
  id?: string
  snippet?: { title?: string; description?: string; publishedAt?: string; channelId?: string; liveBroadcastContent?: string; thumbnails?: { maxres?: { url?: string }; high?: { url?: string }; medium?: { url?: string } } }
  status?: { uploadStatus?: string; privacyStatus?: string; embeddable?: boolean }
  contentDetails?: { duration?: string }
  liveStreamingDetails?: { scheduledStartTime?: string; actualStartTime?: string; actualEndTime?: string }
}

/** Diffusions du compte autorisé (filtrées sur la chaîne attendue). Lève des codes `youtube_*`. */
export async function fetchOwnedBroadcasts(status: BroadcastStatusFilter, options: DetectorOptions = {}): Promise<YouTubeItem[]> {
  const now = options.now || new Date(), fetchImpl = options.fetchImpl || fetch
  return filterOwnedChannel(await listBroadcasts(status, now.getTime(), fetchImpl))
}

/** `videos.list` par lots de 50 identifiants (1 unité de quota par lot). Lève des codes `youtube_*`. */
export async function fetchVideoDetails(ids: string[], options: DetectorOptions = {}): Promise<YouTubeVideoDetails[]> {
  const now = options.now || new Date(), nowMs = now.getTime(), fetchImpl = options.fetchImpl || fetch
  const unique = Array.from(new Set(ids.filter(id => /^[\w-]{11}$/.test(id))))
  const out: YouTubeVideoDetails[] = []
  for (let i = 0; i < unique.length; i += 50) {
    const token = await bearerToken(nowMs, fetchImpl), url = new URL(VIDEOS_URL)
    url.search = new URLSearchParams({ part: 'snippet,status,contentDetails,liveStreamingDetails', id: unique.slice(i, i + 50).join(','), maxResults: '50' }).toString()
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(YOUTUBE_REQUEST_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`youtube_videos_${response.status}`)
    out.push(...(((await response.json()) as { items?: YouTubeVideoDetails[] }).items || []))
  }
  return out
}

/** Code d'erreur non sensible (`youtube_*`) ou `youtube_live_error`. */
export const youtubeErrorCode = (err: unknown): string => errorCode(err)

/** Diagnostic NON sensible (aucune valeur de secret) pour la route admin. */
export function getYouTubeLiveDiagnostics(): YouTubeLiveDiagnostics {
  return {
    oauthConfigured: loadYouTubeConfig() !== null,
    channelIdConfigured: Boolean(channelId()),
    lastError: cached?.error ?? null,
    lastCheckedAt: lastCheckedAt ? new Date(lastCheckedAt).toISOString() : null,
    cachedStatus: cached?.state.status ?? null,
    cacheExpiresAt: cached ? new Date(cached.expiresAt).toISOString() : null,
  }
}

export function __resetYouTubeLiveCache() { cached = null; accessToken = null; lastWarned = null; lastCheckedAt = null; verified.clear() }
