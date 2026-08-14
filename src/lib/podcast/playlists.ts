/**
 * PODCAST-3 — Playlists : types + helpers PURS (testables) + I/O thin (client authentifié).
 *
 * Deux familles : 'official' (Admin/Super Admin, via service_role) et 'personal' (membre,
 * client + RLS owner-only). Une playlist n'altère JAMAIS l'access_level d'un épisode.
 */

export type PlaylistType = 'official' | 'personal'
export type PlaylistVisibility = 'private' | 'members' | 'public'

export interface Playlist {
  id: string
  playlist_type: PlaylistType
  owner_user_id: string | null
  title: string
  description: string | null
  cover_url: string | null
  visibility: PlaylistVisibility
  sort_order?: number
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  podcast_id: string
  position: number
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Cover d'une playlist : cover administrée, sinon cover du 1er épisode (repli intelligent), sinon null. */
export function resolvePlaylistCover(coverUrl: string | null | undefined, firstItemCover?: string | null): string | null {
  return str(coverUrl) ?? str(firstItemCover) ?? null
}

/** Prochaine position pour un ajout (ordre manuel stable, pas basé sur created_at seul). */
export function nextItemPosition(items: Pick<PlaylistItem, 'position'>[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0
  return Math.max(...items.map((i) => (typeof i.position === 'number' ? i.position : 0))) + 1
}

/** Items triés par position croissante (ordre manuel). */
export function sortItems<T extends { position: number }>(items: T[]): T[] {
  return (Array.isArray(items) ? [...items] : []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

/** Ligne « Ajouter à une playlist » : la playlist + son état « déjà présent » (PODCAST-7). */
export interface AddToPlaylistRow {
  playlist: Playlist
  contains: boolean
}

/**
 * Construit les lignes de la modale « Ajouter à une playlist » : UNIQUEMENT les playlists
 * PERSONNELLES (une officielle n'est jamais éditable par le membre), avec l'état « déjà présent »
 * dérivé des ids contenant l'épisode. PUR (testable) — l'insert reste protégé par la contrainte DB,
 * mais l'UX évite un doublon inutile en connaissant l'état à l'avance.
 */
export function buildAddToPlaylistRows(playlists: Playlist[], containingIds: string[] | Set<string>): AddToPlaylistRow[] {
  const set = containingIds instanceof Set ? containingIds : new Set(containingIds ?? [])
  return (Array.isArray(playlists) ? playlists : [])
    .filter((p) => p.playlist_type === 'personal')
    .map((p) => ({ playlist: p, contains: set.has(p.id) }))
}

/** Réattribue des positions 0..n-1 à partir d'un ordre de podcast_id (réordonnancement). */
export function computeReorder(orderedPodcastIds: string[]): Array<{ podcastId: string; position: number }> {
  return (Array.isArray(orderedPodcastIds) ? orderedPodcastIds : []).map((podcastId, position) => ({ podcastId, position }))
}

/** Somme des durées (secondes) des épisodes d'une playlist, si toutes parseables ; sinon null. */
export function totalDurationSeconds(durations: Array<string | number | null | undefined>): number | null {
  let total = 0
  let anyKnown = false
  for (const d of durations) {
    const s = parseDurationToSeconds(d)
    if (s == null) continue
    anyKnown = true
    total += s
  }
  return anyKnown ? total : null
}

/** "42 min" / "1:02:03" / 3723 → secondes. null si non parseable. */
export function parseDurationToSeconds(d: string | number | null | undefined): number | null {
  if (typeof d === 'number' && Number.isFinite(d) && d > 0) return Math.floor(d)
  if (typeof d !== 'string' || !d.trim()) return null
  const t = d.trim()
  if (/^\d+\s*min/i.test(t)) return parseInt(t, 10) * 60
  if (t.includes(':')) {
    const parts = t.split(':').map((x) => Number(x))
    if (parts.some((n) => Number.isNaN(n))) return null
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

/** Label lisible d'une durée totale (ex: "1 h 12" / "34 min"). '' si inconnue. */
export function durationLabel(totalSeconds: number | null): string {
  if (totalSeconds == null || totalSeconds <= 0) return ''
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

// ── I/O thin (client Supabase authentifié — RLS applique l'isolation) ───────
interface Client { from: (t: string) => any }

/** Playlists OFFICIELLES visibles (lecture publique/membre via RLS). Triées sort_order. */
export async function fetchOfficialPlaylists(client: Client): Promise<Playlist[]> {
  try {
    const { data } = await client.from('audio_playlists').select('*')
      .eq('playlist_type', 'official').order('sort_order', { ascending: true })
    return (data as Playlist[]) ?? []
  } catch { return [] }
}

/** MES playlists (personnelles ; RLS → owner_user_id = auth.uid()). */
export async function fetchMyPlaylists(client: Client): Promise<Playlist[]> {
  try {
    const { data } = await client.from('audio_playlists').select('*')
      .eq('playlist_type', 'personal').order('updated_at', { ascending: false })
    return (data as Playlist[]) ?? []
  } catch { return [] }
}

/** Ids des playlists (visibles par RLS) contenant déjà cet épisode → état « déjà ajouté » (PODCAST-7).
 *  RLS limite aux items visibles (les playlists personnelles du membre) ; on dédoublonne. */
export async function fetchMyPlaylistIdsContainingEpisode(client: Client, podcastId: string): Promise<string[]> {
  try {
    const { data } = await client.from('audio_playlist_items').select('playlist_id').eq('podcast_id', podcastId)
    const ids = Array.isArray(data) ? (data as Array<{ playlist_id?: string }>).map((r) => r.playlist_id).filter((v): v is string => !!v) : []
    return Array.from(new Set(ids))
  } catch { return [] }
}

/** Items d'une playlist (RLS → visible seulement si la playlist l'est). Triés par position. */
export async function fetchPlaylistItems(client: Client, playlistId: string): Promise<PlaylistItem[]> {
  try {
    const { data } = await client.from('audio_playlist_items').select('*')
      .eq('playlist_id', playlistId).order('position', { ascending: true })
    return (data as PlaylistItem[]) ?? []
  } catch { return [] }
}

/** Crée une playlist personnelle (RLS impose owner_user_id = auth.uid() et type personal). */
export async function createPersonalPlaylist(
  client: Client, p: { userId: string; title: string; description?: string | null },
): Promise<Playlist | null> {
  try {
    const { data, error } = await client.from('audio_playlists').insert({
      playlist_type: 'personal', owner_user_id: p.userId, created_by: p.userId,
      title: p.title, description: p.description ?? null, visibility: 'private',
    }).select().single()
    if (error) return null
    return data as Playlist
  } catch { return null }
}

/** Ajoute un épisode en fin de playlist personnelle (idempotent via unique + onConflict ignore). */
export async function addItemToPlaylist(
  client: Client, playlistId: string, podcastId: string, position: number,
): Promise<boolean> {
  try {
    const { error } = await client.from('audio_playlist_items')
      .upsert({ playlist_id: playlistId, podcast_id: podcastId, position }, { onConflict: 'playlist_id,podcast_id', ignoreDuplicates: true })
    return !error
  } catch { return false }
}

export async function removeItemFromPlaylist(client: Client, playlistId: string, podcastId: string): Promise<boolean> {
  try {
    const { error } = await client.from('audio_playlist_items').delete()
      .eq('playlist_id', playlistId).eq('podcast_id', podcastId)
    return !error
  } catch { return false }
}

export async function deletePersonalPlaylist(client: Client, playlistId: string): Promise<boolean> {
  try {
    const { error } = await client.from('audio_playlists').delete().eq('id', playlistId)
    return !error
  } catch { return false }
}

/** Réordonne les items d'une playlist personnelle (positions 0..n-1). RLS → owner only. */
export async function reorderMyPlaylistItems(client: Client, playlistId: string, orderedPodcastIds: string[]): Promise<boolean> {
  try {
    for (const { podcastId, position } of computeReorder(orderedPodcastIds)) {
      await client.from('audio_playlist_items').update({ position })
        .eq('playlist_id', playlistId).eq('podcast_id', podcastId)
    }
    return true
  } catch { return false }
}
