/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Connecteur Meta (Facebook/Instagram) SERVER-ONLY
 *
 * Meta Graph API READ-ONLY (insights de Page + de compte Instagram). Env-driven :
 * l'app Meta + le consentement Business sont une action HUMAINE du propriétaire ;
 * tant que les tokens manquent en env, l'état reste NOT_CONFIGURED (jamais de faux
 * réel). Deux pages Facebook OFFICIELLES restent TOUJOURS séparées (id + nom + rôle) ;
 * l'agrégat « Meta » n'est qu'un 2ᵉ niveau qui ne perd jamais l'identité par page.
 *
 * Signatures stables (importées par la route statut, /api/intelligence/meta, l'onglet) :
 *   getMetaFacebookStatus / getMetaInstagramStatus / getMetaData. Corps rempli (HUB-4).
 *
 * Sécurité : `import 'server-only'` ; aucun token/secret n'est journalisé ni renvoyé ;
 * `fetchImpl` injectable ⇒ tests 100 % hors-ligne.
 */

import 'server-only'
import type { ChannelStatus } from '../../channels/types'
import type { SeoPeriod } from '../../seo/types'
import {
  readMetaConfig,
  type MetaConfig,
  type MetaPageConfig,
  type MetaIgConfig,
  type MetaPageIdentity,
  type MetaIgIdentity,
} from './config'
import {
  fetchFacebookPage,
  fetchInstagram,
  graphGet,
  graphWindow,
  MetaApiError,
  type FetchImpl,
  type MetaErrorKind,
} from './client'
import {
  normalizeFacebook,
  normalizeInstagram,
  normalizeTopPosts,
  type MetaPlatformMetrics,
  type MetaTopPost,
} from './normalize'

export type { MetaPlatformMetrics, MetaTopPost }
export type { MetaPageIdentity, MetaIgIdentity }

export interface MetaQueryOptions {
  period: SeoPeriod
  nowIso: string
  /** Injection réseau pour tests hors-ligne. */
  fetchImpl?: FetchImpl
  timeoutMs?: number
}

/** Données d'UNE page Facebook : identité (jamais perdue) + statut + métriques. */
export interface MetaPageData {
  identity: MetaPageIdentity
  status: ChannelStatus
  metrics: MetaPlatformMetrics | null
  topPosts: MetaTopPost[]
}

export interface MetaIgData {
  identity: MetaIgIdentity
  status: ChannelStatus
  metrics: MetaPlatformMetrics | null
  topPosts: MetaTopPost[]
}

export interface MetaData {
  /** Statut agrégé Facebook (compat) — l'identité par page vit dans facebookPages. */
  facebookStatus: ChannelStatus
  instagramStatus: ChannelStatus
  /** Métriques agrégées (2ᵉ niveau) — somme des pages disponibles. */
  facebook: MetaPlatformMetrics | null
  instagram: MetaPlatformMetrics | null
  /** Les DEUX pages Facebook, TOUJOURS séparées (id + nom + rôle). */
  facebookPages: {
    citadelle: MetaPageData
    chapelle: MetaPageData
  }
  instagramAccount: MetaIgData
}

/* ------------------------------ Helpers de statut ------------------------------ */

const FB = 'meta_facebook' as const
const IG = 'meta_instagram' as const

function kindToState(kind: MetaErrorKind): ChannelStatus['state'] {
  if (kind === 'AUTH') return 'AUTH_REQUIRED'
  if (kind === 'PERMISSION') return 'PERMISSION_REQUIRED'
  return 'ERROR' // TIMEOUT / RATE_LIMIT / ERROR
}

function reasonFor(kind: MetaErrorKind): string {
  switch (kind) {
    case 'AUTH':
      return 'Token Meta invalide/expiré — nouvelle autorisation requise (propriétaire).'
    case 'PERMISSION':
      return 'Permissions insuffisantes (pages_read_engagement / read_insights / instagram_manage_insights).'
    case 'TIMEOUT':
      return 'Délai dépassé lors de l’appel au Graph API.'
    case 'RATE_LIMIT':
      return 'Quota Graph API atteint — réessayer plus tard.'
    default:
      return 'Erreur lors de l’appel au Graph API.'
  }
}

function status(
  channel: typeof FB | typeof IG,
  displayName: string,
  state: ChannelStatus['state'],
  nowIso: string,
  extra: Partial<ChannelStatus> = {},
): ChannelStatus {
  return {
    channel,
    displayName,
    state,
    freshness: 'SYNCED',
    lastSync: state === 'CONNECTED' ? nowIso : null,
    setupRequired: state === 'NOT_CONFIGURED' || state === 'AUTH_REQUIRED' || state === 'PERMISSION_REQUIRED',
    checkedAt: nowIso,
    ...extra,
  }
}

const NOT_CONFIGURED_REASON =
  'Connecteur Meta non configuré : app Meta + token Page/IG read-only requis (action propriétaire).'

/* ------------------------------ Probes de statut ------------------------------ */

/** Valide un token de Page (cheap) : GET id de la page (ou `me` si id inconnu). */
async function probeFacebookPage(
  cfg: MetaPageConfig,
  appSecret: string | null,
  nowIso: string,
  fetchImpl?: FetchImpl,
): Promise<ChannelStatus> {
  const name = `Facebook ${cfg.identity.pageName}`
  if (!cfg.hasToken || !cfg.token) {
    return status(FB, name, 'NOT_CONFIGURED', nowIso, {
      reason: NOT_CONFIGURED_REASON,
      property: cfg.identity.pageId ?? undefined,
    })
  }
  try {
    const path = cfg.identity.pageId ?? 'me'
    const res = await graphGet<{ id?: string }>(path, { fields: 'id' }, {
      token: cfg.token,
      appSecret,
      fetchImpl,
    })
    return status(FB, name, 'CONNECTED', nowIso, {
      reason: 'Connecté (Graph API read-only).',
      property: res?.id ?? cfg.identity.pageId ?? undefined,
    })
  } catch (e) {
    const kind = e instanceof MetaApiError ? e.kind : 'ERROR'
    return status(FB, name, kindToState(kind), nowIso, {
      reason: reasonFor(kind),
      property: cfg.identity.pageId ?? undefined,
    })
  }
}

async function probeInstagram(
  cfg: MetaIgConfig,
  appSecret: string | null,
  nowIso: string,
  fetchImpl?: FetchImpl,
): Promise<ChannelStatus> {
  const name = `Instagram @${cfg.identity.username}`
  if (!cfg.hasToken || !cfg.token || !cfg.identity.igUserId) {
    return status(IG, name, 'NOT_CONFIGURED', nowIso, {
      reason:
        'Connecteur Instagram non configuré : IG User id + token instagram_basic/instagram_manage_insights requis.',
      property: cfg.identity.igUserId ?? undefined,
    })
  }
  try {
    const res = await graphGet<{ id?: string }>(cfg.identity.igUserId, { fields: 'id' }, {
      token: cfg.token,
      appSecret,
      fetchImpl,
    })
    return status(IG, name, 'CONNECTED', nowIso, {
      reason: 'Connecté (Graph API read-only).',
      property: res?.id ?? cfg.identity.igUserId ?? undefined,
    })
  } catch (e) {
    const kind = e instanceof MetaApiError ? e.kind : 'ERROR'
    return status(IG, name, kindToState(kind), nowIso, {
      reason: reasonFor(kind),
      property: cfg.identity.igUserId ?? undefined,
    })
  }
}

/** Agrège deux statuts de page FB en un statut de canal (l'identité par page vit ailleurs). */
function aggregateFacebook(a: ChannelStatus, b: ChannelStatus, nowIso: string): ChannelStatus {
  const both = [a, b]
  const anyConnected = both.some((s) => s.state === 'CONNECTED')
  const allNotConfigured = both.every((s) => s.state === 'NOT_CONFIGURED')
  let state: ChannelStatus['state']
  if (anyConnected) state = 'CONNECTED'
  else if (allNotConfigured) state = 'NOT_CONFIGURED'
  else state = both.find((s) => s.state !== 'NOT_CONFIGURED')?.state ?? 'NOT_CONFIGURED'
  return status(FB, 'Facebook', state, nowIso, {
    reason:
      state === 'NOT_CONFIGURED'
        ? NOT_CONFIGURED_REASON
        : `CITADELLE: ${a.state} · CHAPELLE: ${b.state}`,
  })
}

/* -------------------------------- API publique -------------------------------- */

/**
 * Statut Facebook (canal nav). Sonde les DEUX pages et agrège. Sans token ⇒
 * NOT_CONFIGURED honnête. `fetchImpl` optionnel pour tests (signature compatible).
 */
export async function getMetaFacebookStatus(nowIso: string, fetchImpl?: FetchImpl): Promise<ChannelStatus> {
  const cfg = readMetaConfig()
  const [cit, cha] = await Promise.all([
    probeFacebookPage(cfg.facebook.citadelle, cfg.appSecret, nowIso, fetchImpl),
    probeFacebookPage(cfg.facebook.chapelle, cfg.appSecret, nowIso, fetchImpl),
  ])
  return aggregateFacebook(cit, cha, nowIso)
}

/** Statut Instagram (canal nav). Sans IG id/token ⇒ NOT_CONFIGURED honnête. */
export async function getMetaInstagramStatus(nowIso: string, fetchImpl?: FetchImpl): Promise<ChannelStatus> {
  const cfg = readMetaConfig()
  return probeInstagram(cfg.instagram, cfg.appSecret, nowIso, fetchImpl)
}

/** Récupère une page FB complète (statut + métriques + top posts), identité préservée. */
async function loadFacebookPage(
  cfg: MetaPageConfig,
  appSecret: string | null,
  opts: MetaQueryOptions,
): Promise<MetaPageData> {
  const name = `Facebook ${cfg.identity.pageName}`
  if (!cfg.hasToken || !cfg.token) {
    return {
      identity: cfg.identity,
      status: status(FB, name, 'NOT_CONFIGURED', opts.nowIso, {
        reason: NOT_CONFIGURED_REASON,
        property: cfg.identity.pageId ?? undefined,
      }),
      metrics: null,
      topPosts: [],
    }
  }
  if (!cfg.identity.pageId) {
    // Token présent mais id de page non figé en env : configuration incomplète (honnête).
    return {
      identity: cfg.identity,
      status: status(FB, name, 'NOT_CONFIGURED', opts.nowIso, {
        reason: 'Token présent mais META_PAGE_ID_CHAPELLE manquant (id de page à figer).',
      }),
      metrics: null,
      topPosts: [],
    }
  }
  try {
    const win = graphWindow(opts.period.from, opts.period.to)
    const raw = await fetchFacebookPage(cfg.identity.pageId, win, {
      token: cfg.token,
      appSecret,
      fetchImpl: opts.fetchImpl,
      timeoutMs: opts.timeoutMs,
    })
    return {
      identity: cfg.identity,
      status: status(FB, name, 'CONNECTED', opts.nowIso, {
        reason: 'Données réelles (Graph API read-only).',
        property: cfg.identity.pageId,
      }),
      metrics: normalizeFacebook(raw),
      topPosts: normalizeTopPosts(raw.posts, 5),
    }
  } catch (e) {
    const kind = e instanceof MetaApiError ? e.kind : 'ERROR'
    return {
      identity: cfg.identity,
      status: status(FB, name, kindToState(kind), opts.nowIso, {
        reason: reasonFor(kind),
        property: cfg.identity.pageId,
      }),
      metrics: null,
      topPosts: [],
    }
  }
}

async function loadInstagram(cfg: MetaIgConfig, appSecret: string | null, opts: MetaQueryOptions): Promise<MetaIgData> {
  const name = `Instagram @${cfg.identity.username}`
  if (!cfg.hasToken || !cfg.token || !cfg.identity.igUserId) {
    return {
      identity: cfg.identity,
      status: status(IG, name, 'NOT_CONFIGURED', opts.nowIso, {
        reason:
          'Connecteur Instagram non configuré : IG User id + token instagram_basic/instagram_manage_insights requis.',
        property: cfg.identity.igUserId ?? undefined,
      }),
      metrics: null,
      topPosts: [],
    }
  }
  try {
    const win = graphWindow(opts.period.from, opts.period.to)
    const raw = await fetchInstagram(cfg.identity.igUserId, win, {
      token: cfg.token,
      appSecret,
      fetchImpl: opts.fetchImpl,
      timeoutMs: opts.timeoutMs,
    })
    return {
      identity: cfg.identity,
      status: status(IG, name, 'CONNECTED', opts.nowIso, {
        reason: 'Données réelles (Graph API read-only).',
        property: cfg.identity.igUserId,
      }),
      metrics: normalizeInstagram(raw),
      topPosts: normalizeTopPosts(raw.posts, 5),
    }
  } catch (e) {
    const kind = e instanceof MetaApiError ? e.kind : 'ERROR'
    return {
      identity: cfg.identity,
      status: status(IG, name, kindToState(kind), opts.nowIso, {
        reason: reasonFor(kind),
        property: cfg.identity.igUserId,
      }),
      metrics: null,
      topPosts: [],
    }
  }
}

/** Somme (2ᵉ niveau) des métriques de pages disponibles — null si aucune. */
function aggregateMetrics(pages: ReadonlyArray<MetaPlatformMetrics | null>): MetaPlatformMetrics | null {
  const present = pages.filter((m): m is MetaPlatformMetrics => m !== null)
  if (present.length === 0) return null
  return present.reduce(
    (acc, m) => ({
      reach: acc.reach + m.reach,
      impressions: acc.impressions + m.impressions,
      interactions: acc.interactions + m.interactions,
      clicks: acc.clicks + m.clicks,
      followers: acc.followers + m.followers,
    }),
    { reach: 0, impressions: 0, interactions: 0, clicks: 0, followers: 0 },
  )
}

/**
 * Données Meta normalisées, PAR PAGE (identité préservée) + agrégat 2ᵉ niveau.
 * Sans config ⇒ tout NOT_CONFIGURED (jamais de faux réel).
 */
export async function getMetaData(opts: MetaQueryOptions): Promise<MetaData> {
  const cfg: MetaConfig = readMetaConfig()
  const [citadelle, chapelle, instagramAccount] = await Promise.all([
    loadFacebookPage(cfg.facebook.citadelle, cfg.appSecret, opts),
    loadFacebookPage(cfg.facebook.chapelle, cfg.appSecret, opts),
    loadInstagram(cfg.instagram, cfg.appSecret, opts),
  ])

  const facebookStatus = aggregateFacebook(citadelle.status, chapelle.status, opts.nowIso)
  const facebook = aggregateMetrics([citadelle.metrics, chapelle.metrics])

  return {
    facebookStatus,
    instagramStatus: instagramAccount.status,
    facebook,
    instagram: instagramAccount.metrics,
    facebookPages: { citadelle, chapelle },
    instagramAccount,
  }
}
