import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SeoPeriod } from '../../../seo/types'
import { getMetaData } from '../index'
import {
  normalizeFacebook,
  normalizeInstagram,
  normalizeTopPosts,
  type MetaRawPlatform,
} from '../normalize'
import { buildMetaAttribution, classifyFbPage } from '../attribution'
import { buildAppSecretProof } from '../auth'
import { CANONICAL_FB_CITADELLE, readMetaConfig } from '../config'
import type { RawCampaignVisit } from '../../../metrics/campaigns'
import type { SessionSourceRow } from '../../../attribution/resolve'

const PERIOD: SeoPeriod = {
  key: '28d',
  from: '2026-07-25',
  to: '2026-08-21',
  prevFrom: '2026-06-27',
  prevTo: '2026-07-24',
}
const NOW = '2026-08-22T10:00:00.000Z'

/* ---- Contrôle d'environnement (aucun secret réel) ---- */
const META_KEYS = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_PAGE_TOKEN_CITADELLE',
  'META_PAGE_TOKEN_CHAPELLE',
  'META_PAGE_ID_CHAPELLE',
  'META_IG_USER_ID',
  'META_IG_TOKEN',
] as const
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const k of META_KEYS) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
})
afterEach(() => {
  for (const k of META_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

/* ---- Mock fetch Graph (hors-ligne) ---- */
type Body = Record<string, unknown>
function jsonRes(body: Body, ok = true, statusCode = 200): Response {
  return { ok, status: statusCode, json: async () => body } as unknown as Response
}
const FB_INSIGHTS: Body = {
  data: [
    { name: 'page_impressions', values: [{ value: 1000 }] },
    { name: 'page_impressions_unique', values: [{ value: 700 }] },
    { name: 'page_post_engagements', values: [{ value: 120 }] },
    { name: 'page_consumptions', values: [{ value: 45 }] },
  ],
}
const FB_PROFILE: Body = { followers_count: 5000, fan_count: 4800 }
const FB_POSTS: Body = {
  data: [
    { id: 'p1', message: 'Culte de dimanche', insights: { data: [{ name: 'post_impressions', values: [{ value: 300 }] }, { name: 'post_engaged_users', values: [{ value: 40 }] }] } },
  ],
}
const IG_INSIGHTS: Body = {
  data: [
    { name: 'reach', total_value: { value: 900 } },
    { name: 'impressions', total_value: { value: 1500 } },
    { name: 'accounts_engaged', total_value: { value: 210 } },
    { name: 'profile_views', total_value: { value: 60 } },
  ],
}
const IG_PROFILE: Body = { followers_count: 3200, media_count: 88, username: 'chapelleduroyaume.media' }
const IG_MEDIA: Body = { data: [{ id: 'm1', caption: 'Reel', insights: { data: [{ name: 'reach', values: [{ value: 200 }] }, { name: 'total_interactions', values: [{ value: 25 }] }] } }] }

/** fetch mock qui route par URL ; `onCall` permet d'injecter erreurs/timeout. */
function makeFetch(onUrl?: (url: string) => Response | Promise<Response> | null) {
  const calls: string[] = []
  const impl = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push(url)
    if (onUrl) {
      const custom = await onUrl(url)
      if (custom) return custom
    }
    if (url.includes('/insights')) {
      // IG user id vs FB page id: IG id is '17999' below
      return jsonRes(url.includes('17999') ? IG_INSIGHTS : FB_INSIGHTS)
    }
    if (url.includes('/posts')) return jsonRes(FB_POSTS)
    if (url.includes('/media')) return jsonRes(IG_MEDIA)
    if (url.includes('17999')) return jsonRes(IG_PROFILE)
    return jsonRes(FB_PROFILE)
  }) as unknown as typeof fetch
  return { impl, calls }
}

function configureAll() {
  process.env.META_APP_ID = 'APP_ID_PUBLIC'
  process.env.META_APP_SECRET = 'APP_SECRET_XYZ'
  process.env.META_PAGE_TOKEN_CITADELLE = 'TOKEN_CITADELLE_SECRET'
  process.env.META_PAGE_TOKEN_CHAPELLE = 'TOKEN_CHAPELLE_SECRET'
  process.env.META_PAGE_ID_CHAPELLE = '111222333'
  process.env.META_IG_USER_ID = '17999'
  process.env.META_IG_TOKEN = 'TOKEN_IG_SECRET'
}

describe('meta · normalisation pure', () => {
  it('normalizeFacebook mappe reach/impressions/interactions/clics/abonnés', () => {
    const raw: MetaRawPlatform = { insights: FB_INSIGHTS, profile: FB_PROFILE, posts: FB_POSTS }
    expect(normalizeFacebook(raw)).toEqual({ reach: 700, impressions: 1000, interactions: 120, clicks: 45, followers: 5000 })
  })
  it('normalizeInstagram lit total_value', () => {
    const raw: MetaRawPlatform = { insights: IG_INSIGHTS, profile: IG_PROFILE, posts: IG_MEDIA }
    expect(normalizeInstagram(raw)).toEqual({ reach: 900, impressions: 1500, interactions: 210, clicks: 60, followers: 3200 })
  })
  it('formes inattendues → 0 (jamais NaN)', () => {
    expect(normalizeFacebook({ insights: null, profile: null, posts: null })).toEqual({ reach: 0, impressions: 0, interactions: 0, clicks: 0, followers: 0 })
  })
  it('normalizeTopPosts trie par impressions', () => {
    const posts = { data: [
      { id: 'a', message: 'A', insights: { data: [{ name: 'post_impressions', values: [{ value: 10 }] }] } },
      { id: 'b', message: 'B', insights: { data: [{ name: 'post_impressions', values: [{ value: 99 }] }] } },
    ] }
    const top = normalizeTopPosts(posts, 5)
    expect(top[0].id).toBe('b')
  })
})

describe('meta · auth (appsecret_proof)', () => {
  it('null sans app secret ; hex avec', () => {
    expect(buildAppSecretProof('tok', null)).toBeNull()
    const proof = buildAppSecretProof('tok', 'secret')
    expect(proof).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('meta · getMetaData', () => {
  it('NOT_CONFIGURED sans env (les DEUX pages gardent leur identité)', async () => {
    const data = await getMetaData({ period: PERIOD, nowIso: NOW })
    expect(data.facebookStatus.state).toBe('NOT_CONFIGURED')
    expect(data.instagramStatus.state).toBe('NOT_CONFIGURED')
    expect(data.facebook).toBeNull()
    expect(data.instagram).toBeNull()
    // identité par page préservée même non configuré
    expect(data.facebookPages.citadelle.identity.pageId).toBe(CANONICAL_FB_CITADELLE.pageId)
    expect(data.facebookPages.citadelle.identity.pageRole).toBe('digital_acquisition')
    expect(data.facebookPages.chapelle.identity.pageRole).toBe('institutional')
    expect(data.facebookPages.citadelle.identity.pageId).not.toBe(data.facebookPages.chapelle.identity.pageId)
  })

  it('succès : 2 pages FB séparées + IG, métriques réelles, identités distinctes', async () => {
    configureAll()
    const { impl } = makeFetch()
    const data = await getMetaData({ period: PERIOD, nowIso: NOW, fetchImpl: impl })
    expect(data.facebookPages.citadelle.status.state).toBe('CONNECTED')
    expect(data.facebookPages.chapelle.status.state).toBe('CONNECTED')
    expect(data.facebookPages.citadelle.identity.pageId).toBe('61592932298568')
    expect(data.facebookPages.chapelle.identity.pageId).toBe('111222333')
    expect(data.facebookPages.citadelle.metrics?.followers).toBe(5000)
    expect(data.instagramStatus.state).toBe('CONNECTED')
    expect(data.instagram?.reach).toBe(900)
    // agrégat 2ᵉ niveau = somme des 2 pages
    expect(data.facebook?.followers).toBe(10000)
  })

  it('AUCUN secret dans la sortie (token/app secret absents du JSON)', async () => {
    configureAll()
    const { impl } = makeFetch()
    const data = await getMetaData({ period: PERIOD, nowIso: NOW, fetchImpl: impl })
    const dump = JSON.stringify(data)
    for (const secret of ['TOKEN_CITADELLE_SECRET', 'TOKEN_CHAPELLE_SECRET', 'TOKEN_IG_SECRET', 'APP_SECRET_XYZ']) {
      expect(dump.includes(secret)).toBe(false)
    }
  })

  it('erreur de permission (code 10) → PERMISSION_REQUIRED', async () => {
    configureAll()
    const { impl } = makeFetch(() => jsonRes({ error: { code: 10, message: 'permission' } }))
    const data = await getMetaData({ period: PERIOD, nowIso: NOW, fetchImpl: impl })
    expect(data.facebookPages.citadelle.status.state).toBe('PERMISSION_REQUIRED')
    expect(data.facebookPages.citadelle.metrics).toBeNull()
  })

  it('token invalide (code 190) → AUTH_REQUIRED', async () => {
    configureAll()
    const { impl } = makeFetch(() => jsonRes({ error: { code: 190, message: 'expired' } }))
    const data = await getMetaData({ period: PERIOD, nowIso: NOW, fetchImpl: impl })
    expect(data.instagramStatus.state).toBe('AUTH_REQUIRED')
  })

  it('timeout → ERROR', async () => {
    configureAll()
    const timeoutImpl = (async () => {
      const e = new Error('timeout')
      e.name = 'TimeoutError'
      throw e
    }) as unknown as typeof fetch
    const data = await getMetaData({ period: PERIOD, nowIso: NOW, fetchImpl: timeoutImpl })
    expect(data.facebookPages.citadelle.status.state).toBe('ERROR')
  })

  it('partiel : Citadelle configuré, Chapelle sans token → mix honnête', async () => {
    process.env.META_PAGE_TOKEN_CITADELLE = 'TOKEN_CITADELLE_SECRET'
    // pas de token Chapelle, pas d'IG
    const { impl } = makeFetch()
    const data = await getMetaData({ period: PERIOD, nowIso: NOW, fetchImpl: impl })
    expect(data.facebookPages.citadelle.status.state).toBe('CONNECTED')
    expect(data.facebookPages.chapelle.status.state).toBe('NOT_CONFIGURED')
    expect(data.instagramStatus.state).toBe('NOT_CONFIGURED')
    // agrégat FB = CONNECTED (au moins une page connectée)
    expect(data.facebookStatus.state).toBe('CONNECTED')
  })

  it('readMetaConfig n’expose la présence d’un secret que par booléens', () => {
    configureAll()
    const cfg = readMetaConfig()
    expect(cfg.hasAppSecret).toBe(true)
    expect(cfg.facebook.citadelle.hasToken).toBe(true)
  })
})

/* ---- Attribution Meta → Citadelle (PURE) ---- */
const visit = (over: Partial<RawCampaignVisit>): RawCampaignVisit => ({
  source: 'facebook', referrer: '', utm_campaign: null, utm_medium: 'social', utm_content: null, ...over,
})
const sess = (over: Partial<SessionSourceRow>): SessionSourceRow => ({
  session_key: 'k', user_id: null, source: 'facebook', referrer: '', first_seen: '2026-08-20T08:00:00.000Z',
  utm_campaign: null, utm_medium: 'social', utm_content: null, ...over,
})

describe('meta · attribution first-party', () => {
  it('démo si visits null', () => {
    const r = buildMetaAttribution({ visits: null, signupRows: [], podcastRows: [], parcoursRows: [], nowIso: NOW })
    expect(r.demoMode).toBe(true)
    expect(r.hasData).toBe(false)
  })

  it('sépare facebook et instagram, ignore les autres sources', () => {
    const r = buildMetaAttribution({
      visits: [visit({ source: 'facebook' }), visit({ source: 'instagram' }), visit({ source: 'whatsapp' })],
      signupRows: [sess({ source: 'facebook' })],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.facebook.visits).toBe(1)
    expect(r.instagram.visits).toBe(1)
    expect(r.facebook.signups).toBe(1)
    expect(r.hasData).toBe(true)
  })

  it('répartit FB Citadelle vs Chapelle via UTM, sinon indéterminée', () => {
    const r = buildMetaAttribution({
      visits: [
        visit({ utm_campaign: 'culte_citadelle' }),
        visit({ utm_content: 'chapelle_banner' }),
        visit({ utm_campaign: 'promo' }),
      ],
      signupRows: [],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.facebookPageSplit.citadelle.visits).toBe(1)
    expect(r.facebookPageSplit.chapelle.visits).toBe(1)
    expect(r.facebookPageSplit.indeterminee.visits).toBe(1)
  })

  it('classifyFbPage : priorité citadelle', () => {
    expect(classifyFbPage('citadelle_chapelle', null)).toBe('citadelle')
    expect(classifyFbPage(null, null)).toBe('indeterminee')
  })
})
