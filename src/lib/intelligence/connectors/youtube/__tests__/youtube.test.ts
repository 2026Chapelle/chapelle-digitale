/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Tests connecteur YouTube (100 % hors-ligne).
 *
 * Aucun accès réseau : `fetchImpl` est toujours mocké. On vérifie les états
 * honnêtes (AUTH_REQUIRED / PERMISSION_REQUIRED / ERROR / CONNECTED), la
 * normalisation, la comparaison période/période, la garde de chaîne canonique,
 * la dégradation gracieuse, et l'ABSENCE de tout secret dans les objets renvoyés.
 */

import { describe, it, expect } from 'vitest'
import { getYouTubeData, getYouTubeStatus } from '../index'
import { refreshAccessToken, YouTubeAuthError } from '../auth'
import {
  loadYouTubeConfig,
  normalizeHandle,
  hasAnyYouTubeCredential,
} from '../config'
import {
  buildTrends,
  computeMetricTrend,
  normalizeTopVideos,
  normalizeTotals,
  normalizeTrafficSources,
  resolveCanonicalChannel,
  trafficSourceLabelFr,
} from '../normalize'
import { buildSeoPeriod } from '../../../seo/period'
import type { FetchImpl } from '../../google-auth'

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const NOW_MS = Date.parse('2026-08-22T12:00:00.000Z')
const NOW_ISO = '2026-08-22T12:00:00.000Z'
const PERIOD = buildSeoPeriod('28d', NOW_MS)

const ACCESS_TOKEN = 'ya29.super-secret-access-token'
const REFRESH_TOKEN = '1//super-secret-refresh-token'
const CLIENT_SECRET = 'GOCSPX-super-secret-client-secret'

function envWithCreds(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    YOUTUBE_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
    YOUTUBE_OAUTH_CLIENT_SECRET: CLIENT_SECRET,
    YOUTUBE_OAUTH_REFRESH_TOKEN: REFRESH_TOKEN,
    ...extra,
  } as unknown as NodeJS.ProcessEnv
}

interface ResponseSpec {
  ok?: boolean
  status?: number
  json?: unknown
  throwErr?: Error
}

function makeResponse(spec: ResponseSpec): Response {
  return {
    ok: spec.ok ?? true,
    status: spec.status ?? 200,
    json: async () => {
      if (spec.json instanceof Error) throw spec.json
      return spec.json
    },
  } as unknown as Response
}

const OAUTH_OK: ResponseSpec = {
  json: { access_token: ACCESS_TOKEN, expires_in: 3600, token_type: 'Bearer' },
}

function channelJson(customUrl: string, id = 'UCcanonical123') {
  return {
    items: [
      {
        id,
        snippet: { title: 'Chapelle Royale TV', customUrl },
        statistics: {
          viewCount: '1250000',
          subscriberCount: '48000',
          videoCount: '640',
        },
      },
    ],
  }
}

function totalsJson(views: number, watch: number, avg: number, gained: number, lost: number) {
  return {
    columnHeaders: [
      { name: 'views' },
      { name: 'estimatedMinutesWatched' },
      { name: 'averageViewDuration' },
      { name: 'subscribersGained' },
      { name: 'subscribersLost' },
    ],
    rows: [[views, watch, avg, gained, lost]],
  }
}

const TOP_JSON = {
  columnHeaders: [
    { name: 'video' },
    { name: 'views' },
    { name: 'estimatedMinutesWatched' },
    { name: 'averageViewDuration' },
  ],
  rows: [
    ['vidAAA', 5000, 12000, 144],
    ['vidBBB', 3000, 6000, 120],
  ],
}

const VIDEOS_JSON = {
  items: [
    { id: 'vidAAA', snippet: { title: 'Le Royaume expliqué' } },
    { id: 'vidBBB', snippet: { title: 'Prière du matin' } },
  ],
}

const TRAFFIC_JSON = {
  columnHeaders: [{ name: 'insightTrafficSourceType' }, { name: 'views' }],
  rows: [
    ['YT_SEARCH', 6000],
    ['RELATED_VIDEO', 4000],
    ['SUBSCRIBER', 1500],
  ],
}

/**
 * Routeur de mock par URL (robuste au parallélisme). Chaque famille d'URL renvoie
 * la réponse configurée ; `startDate` distingue fenêtre courante / précédente.
 */
interface RouterSpec {
  oauth?: ResponseSpec
  channels?: ResponseSpec
  videos?: ResponseSpec
  totalsCurrent?: ResponseSpec
  totalsPrevious?: ResponseSpec
  top?: ResponseSpec
  traffic?: ResponseSpec
}

function router(spec: RouterSpec): { fetchImpl: FetchImpl; calls: string[] } {
  const calls: string[] = []
  const fetchImpl = (async (url: string) => {
    const u = String(url)
    calls.push(u)
    if (u.includes('oauth2.googleapis.com/token')) {
      const s = spec.oauth ?? OAUTH_OK
      if (s.throwErr) throw s.throwErr
      return makeResponse(s)
    }
    if (u.includes('/youtube/v3/channels')) {
      const s = spec.channels ?? { json: channelJson('@chapelleroyaletv') }
      if (s.throwErr) throw s.throwErr
      return makeResponse(s)
    }
    if (u.includes('/youtube/v3/videos')) {
      const s = spec.videos ?? { json: VIDEOS_JSON }
      if (s.throwErr) throw s.throwErr
      return makeResponse(s)
    }
    if (u.includes('youtubeanalytics')) {
      if (u.includes('insightTrafficSourceType')) {
        const s = spec.traffic ?? { json: TRAFFIC_JSON }
        if (s.throwErr) throw s.throwErr
        return makeResponse(s)
      }
      if (u.includes('dimensions=video')) {
        const s = spec.top ?? { json: TOP_JSON }
        if (s.throwErr) throw s.throwErr
        return makeResponse(s)
      }
      // Totaux : distinguer courant / précédent via startDate.
      const qs = new URLSearchParams(u.split('?')[1] ?? '')
      const isCurrent = qs.get('startDate') === PERIOD.from
      const s = isCurrent
        ? spec.totalsCurrent ?? { json: totalsJson(10000, 25000, 150, 900, 100) }
        : spec.totalsPrevious ?? { json: totalsJson(8000, 20000, 140, 700, 120) }
      if (s.throwErr) throw s.throwErr
      return makeResponse(s)
    }
    throw new Error(`unexpected url: ${u}`)
  }) as unknown as FetchImpl
  return { fetchImpl, calls }
}

/** Recherche récursive de sous-chaînes sensibles dans un objet sérialisé. */
function containsSecret(obj: unknown): boolean {
  const s = JSON.stringify(obj)
  return (
    s.includes(ACCESS_TOKEN) ||
    s.includes(REFRESH_TOKEN) ||
    s.includes(CLIENT_SECRET) ||
    s.includes('access_token') ||
    s.includes('refresh_token')
  )
}

function abortError(): Error {
  const e = new Error('aborted')
  e.name = 'AbortError'
  return e
}

/* ------------------------------------------------------------------ */
/* config — chargement honnête                                         */
/* ------------------------------------------------------------------ */

describe('config YouTube', () => {
  it('normalizeHandle strippe @ et met en minuscules', () => {
    expect(normalizeHandle('@ChapelleRoyaleTV')).toBe('chapelleroyaletv')
    expect(normalizeHandle('ChapelleRoyaleTV')).toBe('chapelleroyaletv')
    expect(normalizeHandle('  @Foo ')).toBe('foo')
    expect(normalizeHandle(undefined)).toBe('')
  })

  it('loadYouTubeConfig null si un identifiant OAuth manque', () => {
    expect(loadYouTubeConfig({} as NodeJS.ProcessEnv)).toBeNull()
    expect(
      loadYouTubeConfig({ YOUTUBE_OAUTH_CLIENT_ID: 'x' } as unknown as NodeJS.ProcessEnv),
    ).toBeNull()
  })

  it('loadYouTubeConfig ok avec les trois identifiants + channelId optionnel', () => {
    const cfg = loadYouTubeConfig(envWithCreds({ YOUTUBE_CHANNEL_ID: 'UCabc' }))
    expect(cfg?.channelId).toBe('UCabc')
    expect(cfg?.clientId).toBe('123.apps.googleusercontent.com')
  })

  it('hasAnyYouTubeCredential détecte une présence partielle', () => {
    expect(hasAnyYouTubeCredential({} as NodeJS.ProcessEnv)).toBe(false)
    expect(
      hasAnyYouTubeCredential({ YOUTUBE_OAUTH_CLIENT_ID: 'x' } as unknown as NodeJS.ProcessEnv),
    ).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/* auth — refresh token                                                */
/* ------------------------------------------------------------------ */

describe('refreshAccessToken', () => {
  const cfg = {
    clientId: 'id',
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    channelId: null,
  }

  it('succès ⇒ access token + expiration, aucun secret journalisé au retour', async () => {
    const { fetchImpl } = router({})
    const tok = await refreshAccessToken(cfg, { nowMs: NOW_MS, fetchImpl })
    expect(tok.accessToken).toBe(ACCESS_TOKEN)
    expect(tok.expiresAtMs).toBe(NOW_MS + 3600 * 1000)
  })

  it('invalid_grant ⇒ YouTubeAuthError authRequired=true', async () => {
    const { fetchImpl } = router({ oauth: { ok: false, status: 400, json: { error: 'invalid_grant' } } })
    await expect(refreshAccessToken(cfg, { nowMs: NOW_MS, fetchImpl })).rejects.toMatchObject({
      message: 'youtube_oauth_invalid_grant',
      authRequired: true,
    })
  })

  it('500 ⇒ YouTubeAuthError authRequired=false (transitoire)', async () => {
    const { fetchImpl } = router({ oauth: { ok: false, status: 500, json: {} } })
    const err = await refreshAccessToken(cfg, { nowMs: NOW_MS, fetchImpl }).catch((e) => e)
    expect(err).toBeInstanceOf(YouTubeAuthError)
    expect(err.message).toBe('youtube_oauth_http_500')
    expect(err.authRequired).toBe(false)
  })

  it('timeout réseau ⇒ youtube_timeout', async () => {
    const { fetchImpl } = router({ oauth: { throwErr: abortError() } })
    await expect(refreshAccessToken(cfg, { nowMs: NOW_MS, fetchImpl })).rejects.toMatchObject({
      message: 'youtube_timeout',
    })
  })
})

/* ------------------------------------------------------------------ */
/* normalize — purs                                                    */
/* ------------------------------------------------------------------ */

describe('resolveCanonicalChannel (garde d’ambiguïté)', () => {
  it('handle correspondant ⇒ matched, infos publiques normalisées', () => {
    const r = resolveCanonicalChannel(
      channelJson('@chapelleroyaletv').items,
      '@ChapelleRoyaleTV',
    )
    expect(r.matched).toBe(true)
    expect(r.channel?.channelId).toBe('UCcanonical123')
    expect(r.channel?.subscriberCount).toBe(48000)
    expect(r.channel?.viewCount).toBe(1250000)
  })

  it('handle divergent ⇒ refus (mauvais actif), matched=false', () => {
    const r = resolveCanonicalChannel(
      channelJson('@uneautrechaine').items,
      '@ChapelleRoyaleTV',
    )
    expect(r.matched).toBe(false)
    expect(r.channel).toBeNull()
  })

  it('multi-items sans correspondance ⇒ refus (ne devine jamais)', () => {
    const items = [
      channelJson('@autre1').items[0],
      channelJson('@autre2').items[0],
    ]
    const r = resolveCanonicalChannel(items, '@ChapelleRoyaleTV')
    expect(r.matched).toBe(false)
    expect(r.itemCount).toBe(2)
  })

  it('résolution par id : accepte l’unique item, mais refuse si handle diverge', () => {
    const ok = resolveCanonicalChannel(channelJson('@chapelleroyaletv').items, '@ChapelleRoyaleTV', true)
    expect(ok.matched).toBe(true)
    const bad = resolveCanonicalChannel(channelJson('@mauvais').items, '@ChapelleRoyaleTV', true)
    expect(bad.matched).toBe(false)
  })

  it('abonnés masqués ⇒ subscriberCount null (jamais inventé)', () => {
    const items = [
      {
        id: 'UCx',
        snippet: { title: 'x', customUrl: '@chapelleroyaletv' },
        statistics: { hiddenSubscriberCount: true, viewCount: '10', videoCount: '2' },
      },
    ]
    const r = resolveCanonicalChannel(items, '@ChapelleRoyaleTV')
    expect(r.channel?.subscriberCount).toBeNull()
    expect(r.channel?.subscribersHidden).toBe(true)
  })
})

describe('normalizeTotals / normalizeTopVideos / normalizeTrafficSources', () => {
  it('totaux lus par nom de colonne', () => {
    const t = normalizeTotals(totalsJson(100, 250, 30, 9, 2))
    expect(t).toEqual({
      views: 100,
      watchTimeMinutes: 250,
      averageViewDurationSec: 30,
      subscribersGained: 9,
      subscribersLost: 2,
    })
  })

  it('totaux sans ligne ⇒ zéros (activité nulle, jamais null)', () => {
    const t = normalizeTotals({ columnHeaders: [{ name: 'views' }], rows: [] })
    expect(t.views).toBe(0)
    expect(t.subscribersGained).toBe(0)
  })

  it('top vidéos mappe titres, retombe sur videoId si titre absent', () => {
    const titles = new Map([['vidAAA', 'Le Royaume expliqué']])
    const top = normalizeTopVideos(TOP_JSON, titles)
    expect(top[0]).toEqual({
      videoId: 'vidAAA',
      title: 'Le Royaume expliqué',
      views: 5000,
      watchTimeMinutes: 12000,
      averageViewDurationSec: 144,
    })
    expect(top[1].title).toBe('vidBBB') // titre absent ⇒ fallback id
  })

  it('sources de trafic : libellés FR + tri décroissant', () => {
    const src = normalizeTrafficSources(TRAFFIC_JSON)
    expect(src[0]).toEqual({ source: 'YT_SEARCH', label: 'Recherche YouTube', views: 6000 })
    expect(src.map((s) => s.views)).toEqual([6000, 4000, 1500])
    expect(trafficSourceLabelFr('UNKNOWN_X')).toBe('UNKNOWN_X') // fallback brut
  })
})

describe('computeMetricTrend / buildTrends', () => {
  it('hausse / baisse / stable / nouveau / inconnu', () => {
    expect(computeMetricTrend(120, 100).trend).toBe('up')
    expect(computeMetricTrend(80, 100).trend).toBe('down')
    expect(computeMetricTrend(101, 100).trend).toBe('flat')
    expect(computeMetricTrend(50, 0).trend).toBe('new')
    expect(computeMetricTrend(50, null).trend).toBe('unknown')
  })

  it('buildTrends calcule le solde net d’abonnés', () => {
    const cur = { views: 1000, watchTimeMinutes: 2000, averageViewDurationSec: 120, subscribersGained: 900, subscribersLost: 100 }
    const prev = { views: 800, watchTimeMinutes: 2000, averageViewDurationSec: 120, subscribersGained: 500, subscribersLost: 100 }
    const tr = buildTrends(cur, prev)
    expect(tr.subscribersNet.current).toBe(800) // 900-100
    expect(tr.subscribersNet.previous).toBe(400) // 500-100
    expect(tr.subscribersNet.trend).toBe('up')
    expect(tr.watchTimeMinutes.trend).toBe('flat')
  })
})

/* ------------------------------------------------------------------ */
/* getYouTubeStatus / getYouTubeData — états honnêtes                  */
/* ------------------------------------------------------------------ */

describe('getYouTube* — NON configuré (état d’atterrissage attendu)', () => {
  it('aucun credential ⇒ AUTH_REQUIRED, setupRequired, aucun réseau', async () => {
    const neverCalled: FetchImpl = (async () => {
      throw new Error('network must not be called')
    }) as unknown as FetchImpl
    const status = await getYouTubeStatus(NOW_ISO, {
      env: {} as NodeJS.ProcessEnv,
      fetchImpl: neverCalled,
    })
    expect(status.state).toBe('AUTH_REQUIRED')
    expect(status.setupRequired).toBe(true)
    expect(status.freshness).toBe('SEO_DELAYED')
    expect(status.lastSync).toBeNull()

    const data = await getYouTubeData({
      period: PERIOD,
      nowIso: NOW_ISO,
      env: {} as NodeJS.ProcessEnv,
      fetchImpl: neverCalled,
    })
    expect(data.status.state).toBe('AUTH_REQUIRED')
    expect(data.totals).toBeNull()
    expect(data.topVideos).toEqual([])
  })
})

describe('getYouTubeData — invalid_grant ⇒ AUTH_REQUIRED', () => {
  it('refresh token révoqué ⇒ AUTH_REQUIRED, jamais ERROR', async () => {
    const { fetchImpl } = router({ oauth: { ok: false, status: 400, json: { error: 'invalid_grant' } } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('AUTH_REQUIRED')
    expect(data.status.setupRequired).toBe(true)
    expect(data.totals).toBeNull()
    expect(containsSecret(data)).toBe(false)
  })
})

describe('getYouTubeData — garde de chaîne canonique', () => {
  it('handle autorisé non canonique ⇒ PERMISSION_REQUIRED (ne connecte pas le mauvais actif)', async () => {
    const { fetchImpl } = router({ channels: { json: channelJson('@uneautrechaine') } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('PERMISSION_REQUIRED')
    expect(data.status.setupRequired).toBe(true)
    expect(data.channel).toBeNull()
  })

  it('aucune chaîne trouvée ⇒ ERROR youtube_channel_not_found', async () => {
    const { fetchImpl } = router({ channels: { json: { items: [] } } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('youtube_channel_not_found')
  })
})

describe('getYouTubeData — SUCCÈS (résolution + analytics + comparaison période)', () => {
  it('CONNECTED : totaux, top vidéos, sources, tendances vs période précédente', async () => {
    const { fetchImpl, calls } = router({})
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })

    expect(data.status.state).toBe('CONNECTED')
    expect(data.status.property).toBe('@chapelleroyaletv')
    expect(data.status.freshness).toBe('SEO_DELAYED')
    expect(data.status.lastSync).toBe(NOW_ISO)

    // Totaux courants
    expect(data.totals?.views).toBe(10000)
    expect(data.totals?.subscribersGained).toBe(900)
    // Fenêtre précédente + tendance
    expect(data.previousTotals?.views).toBe(8000)
    expect(data.trends?.views.trend).toBe('up')
    expect(data.trends?.views.delta).toBeCloseTo(0.25)

    // Top contenus + titres résolus
    expect(data.topVideos).toHaveLength(2)
    expect(data.topVideos[0].title).toBe('Le Royaume expliqué')

    // Acquisition
    expect(data.trafficSources[0].label).toBe('Recherche YouTube')

    // Canal public
    expect(data.channel?.subscriberCount).toBe(48000)

    // Séquence d’appels : oauth d’abord, résolution ensuite
    expect(calls[0]).toContain('oauth2.googleapis.com/token')
    expect(calls[1]).toContain('/youtube/v3/channels')

    // Aucun secret exposé
    expect(containsSecret(data)).toBe(false)
  })

  it('résolution par YOUTUBE_CHANNEL_ID ⇒ channels?id=…', async () => {
    const { fetchImpl, calls } = router({ channels: { json: channelJson('@chapelleroyaletv', 'UCexplicit') } })
    const data = await getYouTubeData({
      period: PERIOD,
      nowIso: NOW_ISO,
      nowMs: NOW_MS,
      env: envWithCreds({ YOUTUBE_CHANNEL_ID: 'UCexplicit' }),
      fetchImpl,
    })
    expect(data.status.state).toBe('CONNECTED')
    expect(calls.some((c) => c.includes('id=UCexplicit'))).toBe(true)
  })
})

describe('getYouTubeData — fenêtre vide / partielle', () => {
  it('EMPTY : analytics sans lignes ⇒ CONNECTED avec totaux à zéro', async () => {
    const empty = { columnHeaders: [{ name: 'views' }], rows: [] }
    const { fetchImpl } = router({
      totalsCurrent: { json: empty },
      totalsPrevious: { json: empty },
      top: { json: { columnHeaders: [{ name: 'video' }], rows: [] } },
      traffic: { json: { columnHeaders: [{ name: 'insightTrafficSourceType' }], rows: [] } },
    })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('CONNECTED')
    expect(data.totals?.views).toBe(0)
    expect(data.topVideos).toEqual([])
    expect(data.trafficSources).toEqual([])
  })

  it('PARTIAL : top vidéos en échec ⇒ CONNECTED, topVideos vide (dégradation propre)', async () => {
    const { fetchImpl } = router({ top: { ok: false, status: 500, json: {} } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('CONNECTED')
    expect(data.totals?.views).toBe(10000) // cœur intact
    expect(data.topVideos).toEqual([]) // enrichissement dégradé
    expect(data.trafficSources.length).toBeGreaterThan(0)
  })

  it('PARTIAL : titres de vidéos en échec ⇒ CONNECTED, titres = videoId', async () => {
    const { fetchImpl } = router({ videos: { ok: false, status: 403, json: {} } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('CONNECTED')
    expect(data.topVideos[0].title).toBe('vidAAA')
  })
})

describe('getYouTubeData — erreurs techniques (honnêtes, sans secret)', () => {
  it('TIMEOUT sur résolution ⇒ ERROR youtube_timeout', async () => {
    const { fetchImpl } = router({ channels: { throwErr: abortError() } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('youtube_timeout')
    expect(data.totals).toBeNull()
    expect(containsSecret(data)).toBe(false)
  })

  it('MALFORMED JSON sur channels ⇒ ERROR youtube_bad_json', async () => {
    const { fetchImpl } = router({ channels: { json: new Error('bad json') } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('youtube_bad_json')
  })

  it('403 sur totaux (cœur) ⇒ ERROR youtube_analytics_http_403', async () => {
    const { fetchImpl } = router({ totalsCurrent: { ok: false, status: 403, json: {} } })
    const data = await getYouTubeData({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('youtube_analytics_http_403')
    expect(data.totals).toBeNull()
    expect(containsSecret(data)).toBe(false)
  })
})

describe('getYouTubeStatus — CONNECTED (résolution seule, sans analytics)', () => {
  it('handle canonique ⇒ CONNECTED, property publique, aucun secret', async () => {
    const { fetchImpl, calls } = router({})
    const status = await getYouTubeStatus(NOW_ISO, { env: envWithCreds(), nowMs: NOW_MS, fetchImpl })
    expect(status.state).toBe('CONNECTED')
    expect(status.property).toBe('@chapelleroyaletv')
    // Statut léger : ne doit PAS interroger l’analytics.
    expect(calls.some((c) => c.includes('youtubeanalytics'))).toBe(false)
    expect(containsSecret(status)).toBe(false)
  })
})
