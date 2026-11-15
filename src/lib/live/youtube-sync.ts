/**
 * CITADELLE — LIVE & REPLAY AUTOMATIQUE V1 · Planificateur PUR (sans I/O).
 *
 * Cycle : PROGRAMMÉ → EN DIRECT → TERMINÉ (replay en attente) → REPLAY DISPONIBLE.
 * Les replays Citadelle VIVENT déjà dans `cms_lives` (statuts `ended`/`published` + URL) :
 * ce module se contente de dériver, depuis YouTube, les lignes `cms_lives` à créer ou à
 * mettre à jour. Clé de rapprochement : l'identifiant vidéo YouTube contenu dans `youtube_url`.
 *
 * Statuts `cms_lives` utilisés (colonne texte, aucune contrainte CHECK) :
 *   scheduled       → « Live programmé »
 *   live            → « En direct »
 *   replay_pending  → « Replay en attente » (NOUVELLE valeur ; invisible du public : la policy
 *                      RLS `cms_lives_read` et `PUBLIC_STATUSES` n'exposent que
 *                      scheduled/live/ended/published)
 *   ended           → « Replay disponible » (sémantique existante de /live et de l'espace membre)
 *
 * Garanties : idempotent (relance sans effet si rien n'a changé), jamais de doublon (une ligne
 * par identifiant vidéo), jamais de publication d'une vidéo privée/supprimée/non traitée,
 * jamais de modification d'une ligne `ended`/`published`/`draft` (replays et choix admin préservés),
 * champs éditoriaux (titre, description, couverture) seulement complétés s'ils sont vides.
 */
import type { YouTubeItem, YouTubeVideoDetails } from '@/lib/home/youtube-live'
import { youtubeVideoIdFrom } from '@/lib/home/contextual'

export const REPLAY_PENDING_STATUS = 'replay_pending'
export const SYNC_PLATFORM = 'YouTube'
/** Un direct terminé depuis plus longtemps n'est plus réconcilié automatiquement (quota / bruit). */
export const COMPLETED_WINDOW_MS = 14 * 24 * 60 * 60_000
/** Un live programmé manuellement sans URL est rattaché si son horaire est à moins de 60 min. */
export const SCHEDULE_MATCH_TOLERANCE_MS = 60 * 60_000

export type CmsLiveSyncRow = {
  id: string
  title?: string | null
  description?: string | null
  youtube_url?: string | null
  video_url?: string | null
  cover_url?: string | null
  scheduled_at?: string | null
  is_live?: boolean | null
  platform?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CmsLivePatch = Partial<Pick<CmsLiveSyncRow, 'title' | 'description' | 'youtube_url' | 'cover_url' | 'scheduled_at' | 'is_live' | 'platform' | 'status'>>
export type SyncLifecycle = 'scheduled' | 'live' | 'replay_pending' | 'replay_available'
export type SyncOperation =
  | { kind: 'insert'; videoId: string; lifecycle: SyncLifecycle; row: CmsLivePatch & { title: string; youtube_url: string; status: string } }
  | { kind: 'update'; videoId: string; lifecycle: SyncLifecycle; id: string; patch: CmsLivePatch }
export type SyncSkip = { videoId: string; reason: 'draft_row' | 'already_replay' | 'unavailable' | 'private' | 'processing' | 'outside_window' | 'no_title' }
export type SyncPlan = { operations: SyncOperation[]; skipped: SyncSkip[]; pendingVideoIds: string[] }

export type SyncInput = {
  active: YouTubeItem[]
  upcoming: YouTubeItem[]
  completed: YouTubeItem[]
  /** Détails `videos.list` des identifiants en attente de replay (candidats `completed` + lignes `replay_pending`). */
  videos: YouTubeVideoDetails[]
  rows: CmsLiveSyncRow[]
  now: Date
}

const videoIdOf = (item: YouTubeItem | undefined) => (typeof item?.id === 'string' ? item.id : item?.id?.videoId) || ''
const parse = (v?: string | null) => { const t = v ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : undefined }
const clean = (v?: string | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
export const watchUrlFor = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`
export const thumbnailFor = (videoId: string, item?: { snippet?: { thumbnails?: { maxres?: { url?: string }; high?: { url?: string }; medium?: { url?: string } } } }) =>
  item?.snippet?.thumbnails?.maxres?.url || item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

export type ReplayVerdict = 'available' | 'processing' | 'private' | 'unavailable'
/** Une archive est publiable uniquement si elle est traitée, publique/non listée, et n'est plus un direct. */
export function replayVerdict(video: YouTubeVideoDetails | undefined): ReplayVerdict {
  if (!video) return 'unavailable'
  const privacy = video.status?.privacyStatus
  if (privacy !== 'public' && privacy !== 'unlisted') return 'private'
  if (video.snippet?.liveBroadcastContent && video.snippet.liveBroadcastContent !== 'none') return 'processing'
  if (video.status?.uploadStatus && video.status.uploadStatus !== 'processed') return 'processing'
  if (video.status?.embeddable === false) return 'unavailable'
  return 'available'
}

const isReplayStatus = (status?: string | null) => status === 'ended' || status === 'published'

/** Index des lignes CMS par identifiant vidéo (première ligne rencontrée = la plus récente). */
function indexRows(rows: CmsLiveSyncRow[]): Map<string, CmsLiveSyncRow> {
  const map = new Map<string, CmsLiveSyncRow>()
  for (const row of rows) {
    const id = youtubeVideoIdFrom(row.youtube_url)
    if (id && !map.has(id)) map.set(id, row)
  }
  return map
}

/** Ligne `scheduled` saisie à la main (sans URL) dont l'horaire coïncide : on la rattache plutôt que de dupliquer. */
function findManualScheduledRow(rows: CmsLiveSyncRow[], scheduledStart: number | undefined, claimed: Set<string>): CmsLiveSyncRow | undefined {
  if (scheduledStart === undefined) return undefined
  return rows.find(r => !claimed.has(r.id) && r.status === 'scheduled' && !clean(r.youtube_url) && !clean(r.video_url) && (() => { const t = parse(r.scheduled_at); return t !== undefined && Math.abs(t - scheduledStart) <= SCHEDULE_MATCH_TOLERANCE_MS })())
}

function editorialFill(row: CmsLiveSyncRow | undefined, videoId: string, item: YouTubeItem | YouTubeVideoDetails | undefined): CmsLivePatch {
  const patch: CmsLivePatch = {}
  const title = clean(item?.snippet?.title), description = clean((item?.snippet as { description?: string } | undefined)?.description)
  if (!clean(row?.title) && title) patch.title = title
  if (!clean(row?.description) && description) patch.description = description
  if (!clean(row?.cover_url)) patch.cover_url = thumbnailFor(videoId, item)
  if (!clean(row?.youtube_url)) patch.youtube_url = watchUrlFor(videoId)
  if (!clean(row?.platform)) patch.platform = SYNC_PLATFORM
  return patch
}

const changed = (row: CmsLiveSyncRow | undefined, patch: CmsLivePatch): CmsLivePatch => {
  if (!row) return patch
  const out: CmsLivePatch = {}
  for (const [k, v] of Object.entries(patch) as Array<[keyof CmsLivePatch, unknown]>) {
    const current = (row as Record<string, unknown>)[k]
    if (k === 'scheduled_at' ? parse(current as string) !== parse(v as string) : (current ?? null) !== (v ?? null)) (out as Record<string, unknown>)[k] = v
  }
  return out
}

export function planYouTubeSync(input: SyncInput): SyncPlan {
  const { now } = input
  const nowMs = now.getTime()
  const operations: SyncOperation[] = []
  const skipped: SyncSkip[] = []
  const pendingVideoIds: string[] = []
  const byId = indexRows(input.rows)
  const videos = new Map(input.videos.map(v => [v.id || '', v]))
  const claimed = new Set<string>()
  const seen = new Set<string>()

  const emit = (videoId: string, lifecycle: SyncLifecycle, item: YouTubeItem | YouTubeVideoDetails | undefined, desired: CmsLivePatch) => {
    const existing = byId.get(videoId) || findManualScheduledRow(input.rows, parse(desired.scheduled_at), claimed)
    if (existing?.status === 'draft') { skipped.push({ videoId, reason: 'draft_row' }); return }
    if (existing && isReplayStatus(existing.status)) { skipped.push({ videoId, reason: 'already_replay' }); return }
    const fill = editorialFill(existing, videoId, item)
    if (existing) {
      claimed.add(existing.id)
      const patch = changed(existing, { ...fill, ...desired })
      if (Object.keys(patch).length) operations.push({ kind: 'update', videoId, lifecycle, id: existing.id, patch })
      return
    }
    const title = clean(fill.title) || clean(desired.title)
    if (!title) { skipped.push({ videoId, reason: 'no_title' }); return }
    operations.push({ kind: 'insert', videoId, lifecycle, row: { ...fill, ...desired, title, youtube_url: watchUrlFor(videoId), status: String(desired.status), platform: SYNC_PLATFORM } })
  }

  // 1) EN DIRECT (priorité absolue)
  for (const item of input.active) {
    const id = videoIdOf(item); if (!id || seen.has(id)) continue; seen.add(id)
    emit(id, 'live', item, { status: 'live', is_live: true, ...(item.snippet?.scheduledStartTime ? { scheduled_at: item.snippet.scheduledStartTime } : {}) })
  }

  // 2) PROGRAMMÉ
  for (const item of input.upcoming) {
    const id = videoIdOf(item); if (!id || seen.has(id)) continue; seen.add(id)
    const privacy = item.status?.privacyStatus
    if (privacy !== 'public' && privacy !== 'unlisted') { skipped.push({ videoId: id, reason: 'private' }); continue }
    emit(id, 'scheduled', item, { status: 'scheduled', is_live: false, ...(item.snippet?.scheduledStartTime ? { scheduled_at: item.snippet.scheduledStartTime } : {}) })
  }

  // 3) TERMINÉ → replay en attente / disponible (fenêtre récente + lignes déjà en attente)
  const completedCandidates: Array<{ id: string; item?: YouTubeItem }> = []
  for (const item of input.completed) {
    const id = videoIdOf(item); if (!id || seen.has(id)) continue
    const endedAt = parse(item.snippet?.actualEndTime) ?? parse(item.snippet?.scheduledStartTime)
    if (endedAt !== undefined && nowMs - endedAt > COMPLETED_WINDOW_MS) { skipped.push({ videoId: id, reason: 'outside_window' }); continue }
    seen.add(id); completedCandidates.push({ id, item })
  }
  for (const row of input.rows) {
    const id = youtubeVideoIdFrom(row.youtube_url)
    if (!id || seen.has(id)) continue
    if (row.status === REPLAY_PENDING_STATUS || row.status === 'live') { seen.add(id); completedCandidates.push({ id }) }
  }
  for (const { id, item } of completedCandidates) {
    const video = videos.get(id)
    const verdict = replayVerdict(video)
    const source = video || item
    const scheduled = video?.liveStreamingDetails?.scheduledStartTime || item?.snippet?.scheduledStartTime
    const base: CmsLivePatch = { is_live: false, ...(scheduled ? { scheduled_at: scheduled } : {}) }
    if (verdict === 'available') { emit(id, 'replay_available', source, { ...base, status: 'ended' }); continue }
    pendingVideoIds.push(id)
    skipped.push({ videoId: id, reason: verdict })
    emit(id, 'replay_pending', source, { ...base, status: REPLAY_PENDING_STATUS })
  }

  return { operations, skipped, pendingVideoIds }
}

/** Identifiants dont il faut interroger `videos.list` (terminés récents + lignes en attente / live). */
export function videoIdsToVerify(input: Pick<SyncInput, 'completed' | 'rows' | 'now'>): string[] {
  const ids = new Set<string>()
  const nowMs = input.now.getTime()
  for (const item of input.completed) {
    const id = videoIdOf(item)
    const endedAt = parse(item.snippet?.actualEndTime) ?? parse(item.snippet?.scheduledStartTime)
    if (id && !(endedAt !== undefined && nowMs - endedAt > COMPLETED_WINDOW_MS)) ids.add(id)
  }
  for (const row of input.rows) {
    const id = youtubeVideoIdFrom(row.youtube_url)
    if (id && (row.status === REPLAY_PENDING_STATUS || row.status === 'live')) ids.add(id)
  }
  return Array.from(ids)
}

export type SyncStateCounts = { scheduled: number; live: number; replayPending: number; replayAvailable: number }
/** Comptage des états pour l'administration (« Live programmé », « En direct », « Replay en attente », « Replay disponible »). */
export function countLifecycleStates(rows: CmsLiveSyncRow[]): SyncStateCounts {
  return rows.reduce<SyncStateCounts>((acc, r) => {
    if (r.status === 'scheduled') acc.scheduled++
    else if (r.status === 'live' || r.is_live === true) acc.live++
    else if (r.status === REPLAY_PENDING_STATUS) acc.replayPending++
    else if (isReplayStatus(r.status) && (clean(r.youtube_url) || clean(r.video_url))) acc.replayAvailable++
    return acc
  }, { scheduled: 0, live: 0, replayPending: 0, replayAvailable: 0 })
}
