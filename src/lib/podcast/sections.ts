/**
 * PODCAST-1 « LA VOIX DU ROYAUME » — dérivation PURE des sections de /podcast.
 *
 * Aucune I/O : transforme la liste d'épisodes déjà chargée (modèle éditorial 0-B :
 * serie / access_level / destinations / is_featured) en sections prêtes à afficher.
 * Testable unitairement. Ne fabrique JAMAIS de fausse donnée (pas de progression
 * simulée, pas de playlist inventée) — les sections non supportées sont gérées côté UI
 * par masquage.
 */
import type { PodcastAccessLevel } from './editorial'

/** Épisode minimal consommé par les sections (dérivé de cms_podcasts + editorial). */
export interface VoixEpisode {
  id: string
  title: string
  description?: string
  cover?: string | null
  duration?: string
  audioUrl?: string | null
  publishedAt?: string | null
  serie?: string | null
  accessLevel?: PodcastAccessLevel
  destinations?: string[]
  isFeatured?: boolean
}

/** Hero éditorial administrable (bloc cms_homepage_blocks `podcast_hero`). */
export interface PodcastHeroConfig {
  eyebrow: string | null
  title: string | null
  description: string | null
  image: string | null
  ctaLabel: string | null
  ctaHref: string | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Parse le bloc hero. Renvoie null si RIEN d'exploitable (→ fallback UI).
 * Mapping colonnes existantes : subtitle→eyebrow, title, body→description,
 * image_url→image, cta_label/cta_href→CTA.
 */
export function parsePodcastHero(row: Record<string, unknown> | null | undefined): PodcastHeroConfig | null {
  if (!row) return null
  const cfg: PodcastHeroConfig = {
    eyebrow: str(row.subtitle),
    title: str(row.title),
    description: str(row.body),
    image: str(row.image_url),
    ctaLabel: str(row.cta_label),
    ctaHref: str(row.cta_href),
  }
  // Exploitable seulement s'il y a au moins un titre ou une image.
  if (!cfg.title && !cfg.image) return null
  return cfg
}

const hasFeaturedDestination = (e: VoixEpisode): boolean =>
  Array.isArray(e.destinations) && e.destinations.includes('featured')

/** « À la une » : épisodes is_featured (repli : destination `featured`). Ordre d'entrée respecté. */
export function selectFeatured(episodes: VoixEpisode[], limit = 12): VoixEpisode[] {
  const list = Array.isArray(episodes) ? episodes.filter((e) => e && e.id) : []
  const featured = list.filter((e) => e.isFeatured === true || hasFeaturedDestination(e))
  return featured.slice(0, Math.max(0, limit))
}

/**
 * « Nouveautés » : épisodes les plus récents (l'appelant fournit la liste déjà triée
 * published_at DESC), en EXCLUANT ceux déjà mis en avant (dé-duplication) et sans audio absent.
 */
export function selectNewReleases(
  episodes: VoixEpisode[],
  opts: { excludeIds?: Iterable<string>; limit?: number } = {},
): VoixEpisode[] {
  const exclude = new Set(opts.excludeIds ? Array.from(opts.excludeIds) : [])
  const limit = opts.limit ?? 12
  const list = Array.isArray(episodes) ? episodes.filter((e) => e && e.id) : []
  const fresh = list.filter((e) => !exclude.has(e.id))
  // Repli : si tout est featured (petit catalogue), on retombe sur la liste complète.
  const base = fresh.length > 0 ? fresh : list
  return base.slice(0, Math.max(0, limit))
}

/** Une émission (série) agrégée pour la section ÉMISSIONS. */
export interface Emission {
  serie: string
  /** Cover de repli : première cover disponible de la série (dernier épisode publié en tête si trié). */
  cover: string | null
  count: number
}

/**
 * « Émissions » : regroupe par `serie` (dynamique, jamais codé en dur). Cover de repli =
 * première cover non vide rencontrée dans l'ordre fourni (l'appelant trie par date décroissante,
 * donc = cover de l'épisode le plus récent de la série). Ordre : nb d'épisodes décroissant,
 * puis apparition. Ignore les épisodes sans série.
 */
export function buildEmissions(episodes: VoixEpisode[]): Emission[] {
  const list = Array.isArray(episodes) ? episodes.filter((e) => e && e.id) : []
  const bySerie = new Map<string, { cover: string | null; count: number; order: number }>()
  let order = 0
  for (const e of list) {
    const s = typeof e.serie === 'string' ? e.serie.trim() : ''
    if (!s) continue
    const cur = bySerie.get(s)
    if (!cur) {
      bySerie.set(s, { cover: str(e.cover) , count: 1, order: order++ })
    } else {
      cur.count += 1
      if (!cur.cover) cur.cover = str(e.cover)
    }
  }
  return Array.from(bySerie.entries())
    .map(([serie, v]) => ({ serie, cover: v.cover, count: v.count, order: v.order }))
    .sort((a, b) => (b.count - a.count) || (a.order - b.order))
    .map(({ serie, cover, count }) => ({ serie, cover, count }))
}

/** Vrai si un épisode est jouable librement (public ou instant) — pour l'accueil, pas /podcast. */
export function isPremium(e: VoixEpisode): boolean {
  return e.accessLevel === 'premium'
}

/** Liste des émissions distinctes (pour les filtres du catalogue), triées comme buildEmissions. */
export function listSeriesFrom(episodes: VoixEpisode[]): string[] {
  return buildEmissions(episodes).map((e) => e.serie)
}
