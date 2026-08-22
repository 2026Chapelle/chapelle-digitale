/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Meta · NORMALISATION (PURE)
 *
 * Convertit les réponses brutes du Graph API (insights/profil/posts) en métriques
 * normalisées `MetaPlatformMetrics`. AUCUNE I/O, aucun secret, testable hors-ligne.
 * Défensif : toute forme inattendue tombe sur 0 (jamais NaN, jamais valeur inventée).
 */

/** Métriques normalisées d'une plateforme (Facebook page OU Instagram). */
export interface MetaPlatformMetrics {
  reach: number
  impressions: number
  interactions: number
  clicks: number
  followers: number
}

/** Un post/reel synthétique (public, non sensible). */
export interface MetaTopPost {
  id: string
  title: string
  impressions: number
  interactions: number
}

/* ---------------------- Formes brutes Graph (partielles) ---------------------- */

/** Une valeur d'insight Graph : total_value {value} OU values[].value. */
export interface GraphInsightEntry {
  name?: string
  values?: Array<{ value?: unknown }>
  total_value?: { value?: unknown }
}
export interface GraphInsightsResponse {
  data?: ReadonlyArray<GraphInsightEntry>
}
export interface GraphProfileResponse {
  followers_count?: unknown
  fan_count?: unknown
  media_count?: unknown
  username?: unknown
}
export interface GraphPostEntry {
  id?: unknown
  message?: unknown
  caption?: unknown
  insights?: GraphInsightsResponse
}
export interface GraphPostsResponse {
  data?: ReadonlyArray<GraphPostEntry>
}

/** Regroupe les 3 réponses brutes d'une plateforme. */
export interface MetaRawPlatform {
  insights: GraphInsightsResponse | null
  profile: GraphProfileResponse | null
  posts: GraphPostsResponse | null
}

/* ------------------------------- Helpers purs -------------------------------- */

function toNum(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : 0
}

/** Somme d'un insight (total_value prioritaire, sinon somme des values[]). */
function sumInsight(entry: GraphInsightEntry | undefined): number {
  if (!entry) return 0
  if (entry.total_value && 'value' in entry.total_value) return toNum(entry.total_value.value)
  if (Array.isArray(entry.values)) return entry.values.reduce((acc, v) => acc + toNum(v?.value), 0)
  return 0
}

/** Récupère un insight par nom (accepte plusieurs alias). */
function pickInsight(resp: GraphInsightsResponse | null, names: ReadonlyArray<string>): number {
  const data = resp?.data
  if (!Array.isArray(data)) return 0
  for (const name of names) {
    const entry = data.find((e) => e.name === name)
    if (entry) return sumInsight(entry)
  }
  return 0
}

/* --------------------------- Normalisations publiques ------------------------ */

/**
 * Normalise une page FACEBOOK. Alias de métriques tolérants aux versions Graph :
 *  reach = page_impressions_unique ; impressions/views = page_impressions ;
 *  interactions = page_post_engagements ; clicks = page_consumptions / clics ;
 *  followers = followers_count (repli fan_count).
 */
export function normalizeFacebook(raw: MetaRawPlatform): MetaPlatformMetrics {
  return {
    reach: pickInsight(raw.insights, ['page_impressions_unique']),
    impressions: pickInsight(raw.insights, ['page_impressions']),
    interactions: pickInsight(raw.insights, ['page_post_engagements', 'page_actions_post_reactions_total']),
    clicks: pickInsight(raw.insights, ['page_consumptions', 'page_cta_clicks_logged_in_total']),
    followers: toNum(raw.profile?.followers_count) || toNum(raw.profile?.fan_count),
  }
}

/**
 * Normalise un compte INSTAGRAM.
 *  reach = reach ; impressions/views = impressions (ou views) ;
 *  interactions = accounts_engaged / total_interactions ; clicks = profile_views ;
 *  followers = followers_count.
 */
export function normalizeInstagram(raw: MetaRawPlatform): MetaPlatformMetrics {
  return {
    reach: pickInsight(raw.insights, ['reach']),
    impressions: pickInsight(raw.insights, ['impressions', 'views']),
    interactions: pickInsight(raw.insights, ['accounts_engaged', 'total_interactions']),
    clicks: pickInsight(raw.insights, ['profile_views']),
    followers: toNum(raw.profile?.followers_count),
  }
}

/** Normalise les meilleurs posts/reels (public). Tri impressions desc, borne `limit`. */
export function normalizeTopPosts(posts: GraphPostsResponse | null, limit = 5): MetaTopPost[] {
  const data = posts?.data
  if (!Array.isArray(data)) return []
  const rows: MetaTopPost[] = data.map((p, i) => {
    const rawTitle = typeof p.message === 'string' ? p.message : typeof p.caption === 'string' ? p.caption : ''
    const title = rawTitle.trim().slice(0, 120) || '(sans texte)'
    return {
      id: typeof p.id === 'string' ? p.id : `post_${i}`,
      title,
      impressions: pickInsight(p.insights ?? null, ['post_impressions', 'impressions', 'reach']),
      interactions: pickInsight(p.insights ?? null, ['post_engaged_users', 'total_interactions', 'post_engagements']),
    }
  })
  rows.sort((a, b) => b.impressions - a.impressions || b.interactions - a.interactions || a.id.localeCompare(b.id))
  return rows.slice(0, Math.max(0, limit))
}
