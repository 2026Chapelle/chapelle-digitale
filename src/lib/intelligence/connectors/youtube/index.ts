/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Connecteur YouTube (SERVER-ONLY)
 *
 * Implémentation RÉELLE (lecture seule) de l'intelligence YouTube :
 *  - Auth : OAuth 2.0 « refresh token » du PROPRIÉTAIRE de la chaîne (scopes
 *    read-only). YouTube Analytics n'est PAS accessible via compte de service —
 *    seul le consentement du propriétaire @ChapelleRoyaleTV l'autorise.
 *  - Data API v3 : résolution + vérification de la chaîne CANONIQUE.
 *  - Analytics API v2 : vues, temps de visionnage, durée moyenne, abonnés
 *    gagnés/perdus, top vidéos, sources de trafic ; fenêtre courante + précédente.
 *
 * HONNÊTETÉ / SÉCURITÉ ABSOLUES :
 *  - `import 'server-only'` : jamais côté client, jamais de NEXT_PUBLIC.
 *  - Aucun secret/token journalisé, renvoyé ni exposé. Seul le handle/canal
 *    PUBLIC apparaît (property).
 *  - JAMAIS de donnée inventée. Identifiants OAuth absents → AUTH_REQUIRED
 *    (état d'atterrissage attendu tant que le propriétaire n'a pas consenti =
 *    BLOCKED_EXTERNAL_OWNER_ONLY côté superviseur). Mauvais actif / handle qui ne
 *    correspond pas → PERMISSION_REQUIRED (on ne connecte jamais la mauvaise chaîne).
 *  - Fraîcheur = SEO_DELAYED (les stats YouTube ne sont jamais « temps réel »).
 *
 * Les signatures `getYouTubeStatus(nowIso)` et `getYouTubeData(opts)` sont STABLES
 * (importées par la route statut, la route /api/intelligence/youtube et l'onglet).
 */

import 'server-only'
import type { ChannelStatus, ChannelState } from '../../channels/types'
import type { SeoPeriod } from '../../seo/types'
import type { FetchImpl } from '../google-auth'
import {
  CANONICAL_YOUTUBE_HANDLE,
  canonicalHandleForApi,
  hasAnyYouTubeCredential,
  loadYouTubeConfig,
} from './config'
import { YouTubeAuthError, refreshAccessToken } from './auth'
import {
  fetchChannelByHandle,
  fetchChannelById,
  fetchVideoTitles,
  queryAnalytics,
  type YouTubeClientOptions,
} from './client'
import {
  TOP_VIDEO_METRICS,
  TOTALS_METRICS,
  buildTrends,
  extractVideoIds,
  normalizeTopVideos,
  normalizeTotals,
  normalizeTrafficSources,
  resolveCanonicalChannel,
} from './normalize'
import type {
  YouTubeChannelInfo,
  YouTubeData,
  YouTubeTotals,
} from './types'

export type { YouTubeData } from './types'

const DISPLAY_NAME = 'YouTube'
const DEFAULT_TOP_VIDEO_LIMIT = 10

/**
 * Options de requête YouTube. `period` + `nowIso` = surface stable ; les autres
 * champs sont des injections OPTIONNELLES (tests hors-ligne), jamais requises en prod.
 */
export interface YouTubeQueryOptions {
  period: SeoPeriod
  nowIso: string
  /** Transport injectable (défaut : fetch global). */
  fetchImpl?: FetchImpl
  /** Environnement injectable (défaut : process.env). */
  env?: NodeJS.ProcessEnv
  /** Instant epoch injecté pour l'auth (défaut : dérivé de nowIso). */
  nowMs?: number
  /** Nombre max de top vidéos renvoyées. */
  topVideoLimit?: number
}

/** Options du statut (mêmes injections optionnelles ; signature `(nowIso)` conservée). */
export interface YouTubeStatusOptions {
  fetchImpl?: FetchImpl
  env?: NodeJS.ProcessEnv
  nowMs?: number
}

/* ------------------------------------------------------------------ */
/* Statut : fabriques honnêtes (jamais de secret)                      */
/* ------------------------------------------------------------------ */

function baseStatus(
  state: ChannelState,
  checkedAt: string,
  extra: Partial<ChannelStatus> = {},
): ChannelStatus {
  return {
    channel: 'youtube',
    displayName: DISPLAY_NAME,
    state,
    freshness: 'SEO_DELAYED',
    lastSync: null,
    checkedAt,
    ...extra,
  }
}

function authRequiredStatus(checkedAt: string, reason: string): ChannelStatus {
  return baseStatus('AUTH_REQUIRED', checkedAt, { reason, setupRequired: true })
}

function emptyData(status: ChannelStatus): YouTubeData {
  return {
    status,
    period: null,
    channel: null,
    totals: null,
    previousTotals: null,
    trends: null,
    topVideos: [],
    trafficSources: [],
  }
}

/** Traduit une erreur interne en raison NON sensible pour un statut public. */
function nonSensitiveReason(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  if (/^youtube_(data|analytics)_http_\d+$/.test(msg)) return msg
  if (/^youtube_oauth_http_\d+$/.test(msg)) return msg
  if (
    msg === 'youtube_oauth_invalid_grant' ||
    msg === 'youtube_oauth_missing' ||
    msg === 'youtube_bad_json' ||
    msg === 'youtube_timeout' ||
    msg === 'youtube_channel_not_found' ||
    msg === 'youtube_channel_mismatch'
  ) {
    return msg
  }
  if (err instanceof Error && err.name === 'AbortError') return 'youtube_timeout'
  return 'youtube_error'
}

/* ------------------------------------------------------------------ */
/* Résolution chaîne canonique (partagée statut ↔ données)             */
/* ------------------------------------------------------------------ */

interface ResolveOk {
  ok: true
  accessToken: string
  channel: YouTubeChannelInfo
  clientOpts: YouTubeClientOptions
}
interface ResolveFail {
  ok: false
  status: ChannelStatus
}
type ResolveResult = ResolveOk | ResolveFail

/**
 * Charge la config, rafraîchit le token, résout ET vérifie la chaîne canonique.
 * Ne récupère PAS l'analytics (partagé par le statut léger et les données).
 */
async function resolveChannel(
  checkedAt: string,
  opts: YouTubeStatusOptions,
): Promise<ResolveResult> {
  const env = opts.env ?? process.env
  const config = loadYouTubeConfig(env)

  if (!config) {
    const anyCred = hasAnyYouTubeCredential(env)
    return {
      ok: false,
      status: authRequiredStatus(
        checkedAt,
        anyCred
          ? 'Identifiants OAuth YouTube incomplets (client id/secret/refresh token requis) — voir YOUTUBE_SETUP.md.'
          : 'Consentement OAuth du propriétaire @ChapelleRoyaleTV non provisionné — voir YOUTUBE_SETUP.md.',
      ),
    }
  }

  const parsedNow = Date.parse(checkedAt)
  const nowMs = opts.nowMs ?? (Number.isFinite(parsedNow) ? parsedNow : Date.now())

  // 1) Auth : refresh token → access token.
  let accessToken: string
  try {
    const tok = await refreshAccessToken(config, { nowMs, fetchImpl: opts.fetchImpl })
    accessToken = tok.accessToken
  } catch (err) {
    if (err instanceof YouTubeAuthError && err.authRequired) {
      return {
        ok: false,
        status: authRequiredStatus(
          checkedAt,
          'Refresh token OAuth invalide/révoqué — le propriétaire @ChapelleRoyaleTV doit re-consentir (voir YOUTUBE_SETUP.md).',
        ),
      }
    }
    return {
      ok: false,
      status: baseStatus('ERROR', checkedAt, { reason: nonSensitiveReason(err) }),
    }
  }

  const clientOpts: YouTubeClientOptions = { accessToken, fetchImpl: opts.fetchImpl }

  // 2) Résolution + vérification de la chaîne CANONIQUE.
  try {
    let items
    let resolvedById = false
    if (config.channelId) {
      items = await fetchChannelById(config.channelId, clientOpts)
      resolvedById = true
    } else {
      items = await fetchChannelByHandle(canonicalHandleForApi(), clientOpts)
    }

    const resolution = resolveCanonicalChannel(
      items,
      CANONICAL_YOUTUBE_HANDLE,
      resolvedById,
    )

    if (!resolution.channel) {
      // Aucune correspondance sûre : soit rien trouvé, soit ambiguïté / mauvais
      // actif. On NE connecte JAMAIS la mauvaise chaîne.
      if (resolution.itemCount === 0) {
        return {
          ok: false,
          status: baseStatus('ERROR', checkedAt, {
            reason: 'youtube_channel_not_found',
          }),
        }
      }
      return {
        ok: false,
        status: baseStatus('PERMISSION_REQUIRED', checkedAt, {
          reason:
            'La chaîne autorisée ne correspond pas à @ChapelleRoyaleTV (actif non canonique) — vérifiez le compte OAuth (voir YOUTUBE_SETUP.md).',
          setupRequired: true,
        }),
      }
    }

    return { ok: true, accessToken, channel: resolution.channel, clientOpts }
  } catch (err) {
    return {
      ok: false,
      status: baseStatus('ERROR', checkedAt, { reason: nonSensitiveReason(err) }),
    }
  }
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/**
 * Statut du connecteur YouTube (léger : auth + résolution canonique, sans analytics).
 * Signature `(nowIso)` conservée ; second paramètre optionnel pour tests hors-ligne.
 */
export async function getYouTubeStatus(
  nowIso: string,
  opts: YouTubeStatusOptions = {},
): Promise<ChannelStatus> {
  const resolved = await resolveChannel(nowIso, opts)
  if (!resolved.ok) return resolved.status
  return baseStatus('CONNECTED', nowIso, {
    lastSync: nowIso,
    property: resolved.channel.handle,
    setupRequired: false,
  })
}

/** Fenêtre Analytics d'une période (dates YYYY-MM-DD). */
function analyticsWindow(period: SeoPeriod): { from: string; to: string } {
  return { from: period.from, to: period.to }
}

/** Récupère les totaux d'une fenêtre (jamais null : zéro réel si aucune activité). */
async function fetchTotals(
  channelId: string,
  window: { from: string; to: string },
  clientOpts: YouTubeClientOptions,
): Promise<YouTubeTotals> {
  const report = await queryAnalytics(
    {
      channelId,
      startDate: window.from,
      endDate: window.to,
      metrics: TOTALS_METRICS,
    },
    clientOpts,
  )
  return normalizeTotals(report)
}

/**
 * Données YouTube normalisées (lecture seule). États honnêtes : AUTH_REQUIRED
 * (OAuth non provisionné), PERMISSION_REQUIRED (mauvais actif), ERROR (échec API,
 * raison non sensible), CONNECTED (données réelles). JAMAIS de faux réel.
 */
export async function getYouTubeData(opts: YouTubeQueryOptions): Promise<YouTubeData> {
  const checkedAt = opts.nowIso
  const resolved = await resolveChannel(checkedAt, {
    env: opts.env,
    fetchImpl: opts.fetchImpl,
    nowMs: opts.nowMs,
  })
  if (!resolved.ok) return emptyData(resolved.status)

  const { channel, clientOpts } = resolved
  const period = opts.period
  const curWindow = analyticsWindow(period)
  const prevWindow = { from: period.prevFrom, to: period.prevTo }
  const topLimit = opts.topVideoLimit ?? DEFAULT_TOP_VIDEO_LIMIT

  try {
    // CŒUR : totaux courant + précédent (tendance). Un échec ici ⇒ ERROR honnête.
    const [totals, previousTotals] = await Promise.all([
      fetchTotals(channel.channelId, curWindow, clientOpts),
      fetchTotals(channel.channelId, prevWindow, clientOpts).catch(() => null),
    ])

    // ENRICHISSEMENTS best-effort : top vidéos + sources de trafic. Un échec ici
    // dégrade proprement (tableau vide) sans faire échouer tout le connecteur.
    const topReport = await queryAnalytics(
      {
        channelId: channel.channelId,
        startDate: curWindow.from,
        endDate: curWindow.to,
        metrics: TOP_VIDEO_METRICS,
        dimensions: ['video'],
        sort: '-views',
        maxResults: topLimit,
      },
      clientOpts,
    ).catch(() => null)

    let topVideos: YouTubeData['topVideos'] = []
    if (topReport) {
      const ids = extractVideoIds(topReport)
      const titles = await fetchVideoTitles(ids, clientOpts).catch(
        () => new Map<string, string>(),
      )
      topVideos = normalizeTopVideos(topReport, titles)
    }

    const trafficReport = await queryAnalytics(
      {
        channelId: channel.channelId,
        startDate: curWindow.from,
        endDate: curWindow.to,
        metrics: ['views'],
        dimensions: ['insightTrafficSourceType'],
        sort: '-views',
        maxResults: 25,
      },
      clientOpts,
    ).catch(() => null)
    const trafficSources = trafficReport ? normalizeTrafficSources(trafficReport) : []

    const status = baseStatus('CONNECTED', checkedAt, {
      lastSync: checkedAt,
      property: channel.handle,
      setupRequired: false,
    })

    return {
      status,
      period,
      channel,
      totals,
      previousTotals,
      trends: buildTrends(totals, previousTotals),
      topVideos,
      trafficSources,
    }
  } catch (err) {
    return emptyData(
      baseStatus('ERROR', checkedAt, {
        reason: nonSensitiveReason(err),
        property: channel.handle,
      }),
    )
  }
}
