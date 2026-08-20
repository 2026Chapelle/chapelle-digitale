/**
 * CITADELLE INTELLIGENCE HUB — HUB-3
 * Helper PUR de génération d'URL de campagne (UTM). Aucune I/O.
 *
 * - préserve les paramètres de requête existants ;
 * - encode les valeurs (via URLSearchParams) ;
 * - n'ajoute pas de champ vide ;
 * - refuse les URLs non http(s) (anti javascript:/data:/file:).
 */

export interface CampaignUrlParams {
  url: string
  source?: string | null
  medium?: string | null
  campaign?: string | null
  content?: string | null
  term?: string | null
}

const UTM_KEYS: ReadonlyArray<[keyof CampaignUrlParams, string]> = [
  ['source', 'utm_source'],
  ['medium', 'utm_medium'],
  ['campaign', 'utm_campaign'],
  ['content', 'utm_content'],
  ['term', 'utm_term'],
]

/**
 * Construit une URL avec paramètres UTM. Lève si l'URL est invalide ou non http(s).
 */
export function buildCampaignUrl(params: CampaignUrlParams): string {
  let u: URL
  try {
    u = new URL(params.url)
  } catch {
    throw new Error('buildCampaignUrl: URL invalide')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`buildCampaignUrl: protocole non autorisé (${u.protocol})`)
  }
  for (const [key, param] of UTM_KEYS) {
    const raw = params[key]
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (v) u.searchParams.set(param, v) // set encode + n'ajoute rien si vide
  }
  return u.toString()
}
