/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Meta · CLIENT Graph API SERVER-ONLY (READ-ONLY)
 *
 * Client HTTP minimal du Graph API, SANS nouvelle dépendance (fetch natif Node).
 *  - `fetchImpl` injectable ⇒ tests 100 % hors-ligne (aucun réseau).
 *  - jamais de token/secret journalisé ni renvoyé ; le token est passé en query
 *    Graph (obligatoire) mais n'apparaît dans AUCUN message d'erreur exposé.
 *  - classification honnête des erreurs Graph (code 190 → AUTH, permissions → PERM).
 *  - timeout borné (AbortSignal) ⇒ un appel lent devient une erreur, pas un blocage.
 */

import 'server-only'
import { GRAPH_API_BASE } from './config'
import { buildAppSecretProof } from './auth'
import type {
  GraphInsightsResponse,
  GraphPostsResponse,
  GraphProfileResponse,
  MetaRawPlatform,
} from './normalize'

export type FetchImpl = typeof fetch

/** Nature normalisée d'une erreur Graph (sans secret). */
export type MetaErrorKind = 'AUTH' | 'PERMISSION' | 'RATE_LIMIT' | 'TIMEOUT' | 'ERROR'

export class MetaApiError extends Error {
  readonly kind: MetaErrorKind
  constructor(kind: MetaErrorKind, message: string) {
    super(message)
    this.name = 'MetaApiError'
    this.kind = kind
  }
}

const DEFAULT_TIMEOUT_MS = 10_000

/** Codes Graph → nature. Réf. Meta error codes (subset pertinent, READ-ONLY). */
function classifyGraphError(code: unknown, subcode: unknown): MetaErrorKind {
  const c = typeof code === 'number' ? code : Number(code)
  const sc = typeof subcode === 'number' ? subcode : Number(subcode)
  if (c === 190) return 'AUTH' // token invalide/expiré/révoqué
  if ([10, 200, 203, 294, 299, 803].includes(c)) return 'PERMISSION' // permission manquante
  if (sc === 458 || sc === 463 || sc === 467) return 'AUTH' // session expirée/invalidée
  if ([4, 17, 32, 613].includes(c)) return 'RATE_LIMIT' // quotas
  return 'ERROR'
}

interface GraphErrorBody {
  error?: { message?: unknown; code?: unknown; error_subcode?: unknown; type?: unknown }
}

/** Message d'erreur SÛR (jamais de token). Le message Graph ne contient pas le token. */
function safeMessage(kind: MetaErrorKind, body: GraphErrorBody | null, httpStatus: number): string {
  const raw = typeof body?.error?.message === 'string' ? body.error.message : ''
  // Garde-fou : on tronque et on ne laisse jamais passer une éventuelle query token.
  const cleaned = raw.replace(/access_token=[^&\s]+/gi, 'access_token=***').slice(0, 200)
  return cleaned || `Graph HTTP ${httpStatus} (${kind})`
}

/**
 * GET Graph générique. Ajoute access_token (+ appsecret_proof si dispo). Lève
 * MetaApiError classifiée. `fields`/`params` sont des identifiants publics.
 */
export async function graphGet<T>(
  path: string,
  params: Record<string, string>,
  opts: { token: string; appSecret: string | null; fetchImpl?: FetchImpl; timeoutMs?: number },
): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const url = new URL(`${GRAPH_API_BASE}/${path.replace(/^\/+/, '')}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', opts.token)
  const proof = buildAppSecretProof(opts.token, opts.appSecret)
  if (proof) url.searchParams.set('appsecret_proof', proof)

  let res: Response
  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
        : undefined
    res = await fetchImpl(url.toString(), { method: 'GET', signal })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new MetaApiError('TIMEOUT', 'Délai dépassé lors de l’appel au Graph API.')
    }
    throw new MetaApiError('ERROR', 'Échec réseau lors de l’appel au Graph API.')
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok || (body && typeof body === 'object' && 'error' in body)) {
    const eb = (body ?? {}) as GraphErrorBody
    const kind = classifyGraphError(eb.error?.code, eb.error?.error_subcode)
    throw new MetaApiError(kind, safeMessage(kind, eb, res.status))
  }
  return body as T
}

/* --------------------------- Appels de haut niveau --------------------------- */

/** Métriques d'insight demandées par période (since/until en secondes epoch). */
export interface MetaWindow {
  sinceUnix: number
  untilUnix: number
}

function toUnix(dateIso: string): number {
  return Math.floor(Date.parse(dateIso + (dateIso.length <= 10 ? 'T00:00:00.000Z' : '')) / 1000)
}

/** Construit une fenêtre Graph (since/until epoch) à partir de bornes ISO/date. */
export function graphWindow(fromIsoOrDate: string, toIsoOrDate: string): MetaWindow {
  return { sinceUnix: toUnix(fromIsoOrDate), untilUnix: toUnix(toIsoOrDate) }
}

const FB_INSIGHT_METRICS = [
  'page_impressions',
  'page_impressions_unique',
  'page_post_engagements',
  'page_consumptions',
].join(',')

const IG_INSIGHT_METRICS = ['reach', 'impressions', 'accounts_engaged', 'profile_views'].join(',')

/** Récupère les 3 réponses brutes d'une page FACEBOOK (insights + profil + posts). */
export async function fetchFacebookPage(
  pageId: string,
  win: MetaWindow,
  opts: { token: string; appSecret: string | null; fetchImpl?: FetchImpl; timeoutMs?: number },
): Promise<MetaRawPlatform> {
  const common = { token: opts.token, appSecret: opts.appSecret, fetchImpl: opts.fetchImpl, timeoutMs: opts.timeoutMs }
  const [insights, profile, posts] = await Promise.all([
    graphGet<GraphInsightsResponse>(`${pageId}/insights`, {
      metric: FB_INSIGHT_METRICS,
      period: 'day',
      since: String(win.sinceUnix),
      until: String(win.untilUnix),
    }, common),
    graphGet<GraphProfileResponse>(`${pageId}`, { fields: 'followers_count,fan_count' }, common),
    graphGet<GraphPostsResponse>(`${pageId}/posts`, {
      fields: 'id,message,insights.metric(post_impressions,post_engaged_users)',
      limit: '10',
    }, common),
  ])
  return { insights, profile, posts }
}

/** Récupère les 3 réponses brutes d'un compte INSTAGRAM (insights + profil + media). */
export async function fetchInstagram(
  igUserId: string,
  win: MetaWindow,
  opts: { token: string; appSecret: string | null; fetchImpl?: FetchImpl; timeoutMs?: number },
): Promise<MetaRawPlatform> {
  const common = { token: opts.token, appSecret: opts.appSecret, fetchImpl: opts.fetchImpl, timeoutMs: opts.timeoutMs }
  const [insights, profile, posts] = await Promise.all([
    graphGet<GraphInsightsResponse>(`${igUserId}/insights`, {
      metric: IG_INSIGHT_METRICS,
      period: 'day',
      metric_type: 'total_value',
      since: String(win.sinceUnix),
      until: String(win.untilUnix),
    }, common),
    graphGet<GraphProfileResponse>(`${igUserId}`, { fields: 'followers_count,media_count,username' }, common),
    graphGet<GraphPostsResponse>(`${igUserId}/media`, {
      fields: 'id,caption,insights.metric(reach,total_interactions)',
      limit: '10',
    }, common),
  ])
  return { insights, profile, posts }
}
