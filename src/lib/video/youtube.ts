/**
 * VIDÉO — utilitaires PURS YouTube + classification de source (chantier Live/Vidéo).
 *
 * Factorise (sans les importer) les comportements existants de
 * `src/lib/formations/video-validation.ts` (extraction d'ID YouTube) et
 * `src/lib/podcast/playback-access.ts` (`classifyMediaSource`), pour un socle
 * vidéo réutilisable par les chantiers Live/Vidéo et Podcast.
 * Module pur (aucune dépendance réseau/UI) → testable, sans effets de bord.
 */

/** Nature d'une source vidéo résolue. */
export type VideoSourceKind = 'youtube' | 'storage' | 'external' | 'none'

/**
 * Extraction robuste de l'ID YouTube (11 caractères) depuis les formats courants
 * (watch?v= / youtu.be / embed / live / shorts) ou un ID brut. null sinon.
 */
export function extractYouTubeId(input?: string | null): string | null {
  if (!input) return null
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = input.match(re)
    if (m) return m[1]
  }
  const raw = input.trim()
  return /^[\w-]{11}$/.test(raw) ? raw : null
}

/** Hôtes YouTube reconnus (insensible à `www.`). */
function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '')
  return h === 'youtube.com' || h === 'm.youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com'
}

/** L'entrée pointe-t-elle vers un hôte YouTube reconnu ? Tolère l'absence de protocole. */
export function isYouTubeUrl(input?: string | null): boolean {
  if (!input) return false
  const raw = input.trim()
  if (!raw) return false
  let host: string | null = null
  try {
    host = new URL(raw).hostname
  } catch {
    try {
      host = new URL(`https://${raw}`).hostname
    } catch {
      host = null
    }
  }
  return host ? isYouTubeHost(host) : false
}

/** Extrait l'ID de playlist YouTube (`list=PLxxxx…`, ≥10 caractères) si présent. */
export function extractYouTubePlaylistId(input?: string | null): string | null {
  if (!input) return null
  const m = input.match(/[?&]list=([\w-]{10,})/)
  return m ? m[1] : null
}

/**
 * URL d'intégration (iframe) d'une vidéo YouTube.
 * Par défaut : `rel=0` (vidéos suggérées limitées à la même chaîne) et
 * `modestbranding=1`. `autoplay=1` uniquement si demandé.
 */
export function youtubeEmbedUrl(
  id: string,
  opts?: { autoplay?: boolean; rel?: boolean; modest?: boolean; nocookie?: boolean }
): string {
  const host = opts?.nocookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com'
  const params = new URLSearchParams()
  params.set('rel', opts?.rel ? '1' : '0')
  params.set('modestbranding', opts?.modest === false ? '0' : '1')
  if (opts?.autoplay) params.set('autoplay', '1')
  return `${host}/embed/${id}?${params.toString()}`
}

/** URL d'intégration (iframe) d'une playlist YouTube complète. */
export function youtubePlaylistEmbedUrl(
  listId: string,
  opts?: { autoplay?: boolean; rel?: boolean; nocookie?: boolean }
): string {
  const host = opts?.nocookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com'
  const params = new URLSearchParams()
  params.set('list', listId)
  params.set('rel', opts?.rel ? '1' : '0')
  if (opts?.autoplay) params.set('autoplay', '1')
  return `${host}/embed/videoseries?${params.toString()}`
}

const THUMBNAIL_FILES: Record<'default' | 'mq' | 'hq' | 'sd' | 'maxres', string> = {
  default: 'default.jpg',
  mq: 'mqdefault.jpg',
  hq: 'hqdefault.jpg',
  sd: 'sddefault.jpg',
  maxres: 'maxresdefault.jpg',
}

/** Miniature publique YouTube pour un ID donné (par défaut `hqdefault`). */
export function youtubeThumbnail(id: string, quality: 'default' | 'mq' | 'hq' | 'sd' | 'maxres' = 'hq'): string {
  return `https://i.ytimg.com/vi/${id}/${THUMBNAIL_FILES[quality] ?? THUMBNAIL_FILES.hq}`
}

/**
 * Classe une URL vidéo. Détecte les objets Supabase Storage (bucket public,
 * signé ou authentifié) via le motif `/storage/v1/object/(public|sign|authenticated)/{bucket}/{path}`.
 * Sinon YouTube / externe. Chaîne vide/absente → 'none'.
 * Durcissement : si `expectedStorageHost` est fourni, une URL d'apparence
 * Storage sur un hôte étranger n'est pas reconnue → classée 'external'.
 */
export function classifyVideoSource(url?: string | null, expectedStorageHost?: string | null): VideoSourceKind {
  if (!url || !url.trim()) return 'none'
  const raw = url.trim()
  let parsed: URL | null = null
  try {
    parsed = new URL(raw)
  } catch {
    parsed = null
  }
  if (!parsed) return 'external'

  if (isYouTubeHost(parsed.hostname)) return 'youtube'

  const m = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/)
  if (m) {
    const hostOk = !expectedStorageHost || parsed.hostname.toLowerCase() === expectedStorageHost.toLowerCase()
    if (hostOk) {
      const bucket = decodeURIComponent(m[1])
      const path = decodeURIComponent(m[2].split('?')[0])
      if (bucket && path) return 'storage'
    }
  }

  return 'external'
}

/** Source vidéo résolue, prête à l'affichage (lecteur YouTube ou fichier direct). */
export interface ResolvedVideoSource {
  kind: VideoSourceKind
  youtubeId: string | null
  embedUrl: string | null
  fileUrl: string | null
  thumbnailUrl: string | null
}

/**
 * Résout la source vidéo effective à partir des champs `youtube_url` /
 * `video_url` : privilégie YouTube (extrait de l'un ou l'autre champ — cas
 * fréquent où une URL YouTube est collée dans `video_url`), sinon classe
 * `video_url` (storage/externe), sinon 'none'.
 */
export function resolveVideoSource(
  input: { youtube_url?: string | null; video_url?: string | null },
  opts?: { expectedStorageHost?: string | null }
): ResolvedVideoSource {
  const youtubeId = extractYouTubeId(input.youtube_url) || extractYouTubeId(input.video_url)
  if (youtubeId) {
    return {
      kind: 'youtube',
      youtubeId,
      embedUrl: youtubeEmbedUrl(youtubeId),
      fileUrl: null,
      thumbnailUrl: youtubeThumbnail(youtubeId),
    }
  }

  const kind = classifyVideoSource(input.video_url, opts?.expectedStorageHost)
  if (kind === 'storage' || kind === 'external') {
    return { kind, youtubeId: null, embedUrl: null, fileUrl: input.video_url ?? null, thumbnailUrl: null }
  }

  return { kind: 'none', youtubeId: null, embedUrl: null, fileUrl: null, thumbnailUrl: null }
}
