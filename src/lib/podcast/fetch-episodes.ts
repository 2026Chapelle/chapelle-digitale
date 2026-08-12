/**
 * PODCAST-0B — Lecture résiliente des épisodes publiés.
 *
 * Les colonnes éditoriales (serie/access_level/destinations/is_featured) n'existent
 * qu'après la migration 20260812153000. Tant qu'elle n'est pas appliquée (prod
 * pré-migration, instance partielle), un `select` explicite qui les nomme
 * échouerait (PostgREST 400 « column does not exist ») et viderait la liste.
 *
 * Ce helper tente d'abord les colonnes ÉTENDUES, puis retombe proprement sur le
 * jeu de BASE si la requête étendue échoue → zéro régression PODCAST-0A, quel que
 * soit l'état du schéma. Le `runQuery` est injecté (le composant fournit la chaîne
 * Supabase réelle) : la logique de repli reste pure et testable.
 */

export const PODCAST_BASE_COLUMNS = 'id, title, description, audio_url, cover_url, duration, published_at'
export const PODCAST_EDITORIAL_COLUMNS = 'serie, access_level, destinations, is_featured'
export const PODCAST_EXTENDED_COLUMNS = `${PODCAST_BASE_COLUMNS}, ${PODCAST_EDITORIAL_COLUMNS}`

export type RawPodcastRow = Record<string, unknown>

/**
 * Forme minimale du résultat d'une requête. Compatible aussi bien avec un
 * `PostgrestResponse` Supabase (thenable, pas un vrai Promise) qu'avec un mock.
 */
export interface QueryResult {
  data: RawPodcastRow[] | null
  error: unknown
}

/** Thenable renvoyé par le query-builder Supabase ou par un mock de test. */
type QueryThenable = PromiseLike<{ data: unknown; error: unknown }>

export interface FetchPodcastsResult {
  rows: RawPodcastRow[]
  /** true si les colonnes éditoriales ont pu être lues (migration appliquée). */
  editorialAvailable: boolean
}

function toRows(data: unknown): RawPodcastRow[] {
  return Array.isArray(data) ? (data as RawPodcastRow[]) : []
}

/**
 * Exécute la lecture avec repli gracieux.
 * @param runQuery closure qui, pour une liste de colonnes, renvoie un thenable {data,error}.
 */
export async function fetchPublishedPodcasts(
  runQuery: (columns: string) => QueryThenable,
): Promise<FetchPodcastsResult> {
  const extended = await runQuery(PODCAST_EXTENDED_COLUMNS)
  if (!extended.error) {
    return { rows: toRows(extended.data), editorialAvailable: true }
  }
  // Schéma sans colonnes éditoriales → repli sur le jeu de base (jamais bloquant).
  const base = await runQuery(PODCAST_BASE_COLUMNS)
  return { rows: toRows(base.data), editorialAvailable: false }
}
