/**
 * CITADELLE INTELLIGENCE HUB — SEO · Search Console · Tests (100 % HORS-LIGNE)
 *
 * Aucun réseau réel : `fetchImpl` est un mock. La signature JWT est exercée avec
 * une VRAIE clé RSA générée en test (crypto natif). On vérifie l'honnêteté des
 * états (NOT_CONFIGURED / ERROR / PASS), les maths ctr/position, la comparaison
 * période/période, la normalisation, et l'ABSENCE de tout secret dans la sortie.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { getSearchConsoleSeo } from '../index'
import { buildSeoPeriod } from '../../../seo/period'
import { buildServiceAccountJwt } from '../../google-auth'
import {
  toTotals,
  computeTrend,
  toQueryRows,
  toPageRows,
  resolveSiteUrl,
  mapVerdict,
  toSitemaps,
  hostOfProperty,
  isDomainProperty,
  countActive,
  type RawSearchAnalyticsRow,
} from '../normalize'
import { clearCache } from '../../../../cache'

/* ------------------------------------------------------------------ */
/* Outillage : clé RSA de test + service-account + mock fetch          */
/* ------------------------------------------------------------------ */

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const TEST_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

const SA_JSON = JSON.stringify({
  client_email: 'seo-bot@citadelle.iam.gserviceaccount.com',
  private_key: TEST_PEM,
})
const ACCESS_TOKEN = 'ya29-FAKE-TOP-SECRET-TOKEN'

const NOW_ISO = '2026-08-21T12:00:00.000Z'
const PERIOD = buildSeoPeriod('28d', Date.parse(NOW_ISO))

type Handler = (url: string, init?: RequestInit) => { ok: boolean; status: number; json: () => Promise<unknown> }

interface MockOpts {
  tokenStatus?: number
  sitesStatus?: number
  sites?: unknown
  analyticsStatus?: number
  analyticsRows?: (dim: string, isPrev: boolean) => RawSearchAnalyticsRow[]
  inspectStatus?: number
  sitemapsStatus?: number
  sitemaps?: unknown
  throwOn?: RegExp
  badJsonOn?: RegExp
}

/** Journal des appels pour assertions (URL seulement, jamais le token). */
interface Calls {
  urls: string[]
  tokenBodies: string[]
}

function makeFetch(o: MockOpts, calls: Calls): typeof fetch {
  const res = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
  const badJson = (status: number) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('unexpected token in JSON')
    },
  })
  const handler: Handler = (url, init) => {
    calls.urls.push(url)
    if (o.throwOn && o.throwOn.test(url)) throw new Error('network down')
    if (o.badJsonOn && o.badJsonOn.test(url)) return badJson(200)

    if (url.includes('oauth2.googleapis.com/token')) {
      calls.tokenBodies.push(String(init?.body ?? ''))
      const st = o.tokenStatus ?? 200
      return res(st, st === 200 ? { access_token: ACCESS_TOKEN, expires_in: 3600 } : { error: 'unauthorized' })
    }
    if (/\/searchAnalytics\/query$/.test(url)) {
      const st = o.analyticsStatus ?? 200
      if (st !== 200) return res(st, { error: 'x' })
      const body = JSON.parse(String(init?.body ?? '{}')) as { dimensions?: string[]; startDate?: string }
      const dim = body.dimensions?.[0] ?? ''
      const isPrev = body.startDate === PERIOD.prevFrom
      return res(200, { rows: o.analyticsRows ? o.analyticsRows(dim, isPrev) : [] })
    }
    if (/\/sites$/.test(url)) {
      const st = o.sitesStatus ?? 200
      return res(st, st === 200 ? (o.sites ?? { siteEntry: [] }) : { error: 'x' })
    }
    if (/urlInspection\/index:inspect$/.test(url)) {
      const st = o.inspectStatus ?? 200
      if (st !== 200) return res(st, { error: 'x' })
      return res(200, {
        inspectionResult: {
          indexStatusResult: {
            verdict: 'PASS',
            coverageState: 'Submitted and indexed',
            robotsTxtState: 'ALLOWED',
            indexingState: 'INDEXING_ALLOWED',
            pageFetchState: 'SUCCESSFUL',
            lastCrawlTime: '2026-08-19T09:00:00Z',
            googleCanonical: 'https://citadelle.chapelleduroyaume.org/',
            userCanonical: 'https://citadelle.chapelleduroyaume.org/',
          },
          richResultsResult: { verdict: 'PASS' },
        },
      })
    }
    if (/\/sitemaps$/.test(url)) {
      const st = o.sitemapsStatus ?? 200
      return res(st, st === 200 ? (o.sitemaps ?? { sitemap: [] }) : { error: 'x' })
    }
    return res(404, { error: 'not_found' })
  }
  return handler as unknown as typeof fetch
}

function run(env: Record<string, string | undefined>, o: MockOpts, calls: Calls = { urls: [], tokenBodies: [] }) {
  return getSearchConsoleSeo({
    period: PERIOD,
    nowIso: NOW_ISO,
    env,
    fetchImpl: makeFetch(o, calls),
  })
}

const SITES_OK = {
  siteEntry: [
    { siteUrl: 'sc-domain:chapelleduroyaume.org', permissionLevel: 'siteOwner' },
    { siteUrl: 'https://autre.example/', permissionLevel: 'siteOwner' },
  ],
}

const analyticsFixture = (dim: string, isPrev: boolean): RawSearchAnalyticsRow[] => {
  if (dim === 'query') {
    return isPrev
      ? [
          { keys: ['citadelle'], clicks: 10, impressions: 200, ctr: 0.05, position: 4.2 },
          { keys: ['royaume'], clicks: 5, impressions: 100, ctr: 0.05, position: 8 },
        ]
      : [
          { keys: ['citadelle'], clicks: 40, impressions: 500, ctr: 0.08, position: 3.1 },
          { keys: ['royaume'], clicks: 5, impressions: 120, ctr: 0.0417, position: 7.5 },
          { keys: ['nouveau'], clicks: 12, impressions: 90, ctr: 0.133, position: 6 },
        ]
  }
  if (dim === 'page') {
    return isPrev
      ? [{ keys: ['https://citadelle.chapelleduroyaume.org/'], clicks: 30, impressions: 400, ctr: 0.075, position: 3 }]
      : [
          { keys: ['https://citadelle.chapelleduroyaume.org/'], clicks: 45, impressions: 600, ctr: 0.075, position: 2.8 },
          { keys: ['https://citadelle.chapelleduroyaume.org/formations'], clicks: 12, impressions: 300, ctr: 0.04, position: 9 },
        ]
  }
  return []
}

/* ------------------------------------------------------------------ */
/* Tests d'intégration du connecteur (avec mock réseau)                */
/* ------------------------------------------------------------------ */

describe('getSearchConsoleSeo — états honnêtes', () => {
  beforeEach(() => clearCache())

  it('NOT_CONFIGURED quand aucun credential', async () => {
    const data = await run({}, {})
    expect(data.status.state).toBe('NOT_CONFIGURED')
    expect(data.status.configured).toBe(false)
    expect(data.totals).toBeNull()
    expect(data.queries).toEqual([])
    expect(data.pages).toEqual([])
    expect(data.indexation).toEqual([])
    expect(data.sitemaps).toEqual([])
    expect(data.status.property).toBeUndefined()
  })

  it('repli sur GOOGLE_SERVICE_ACCOUNT_JSON si GSC_* absent', async () => {
    const data = await run(
      { GOOGLE_SERVICE_ACCOUNT_JSON: SA_JSON },
      { sites: SITES_OK, analyticsRows: analyticsFixture },
    )
    expect(data.status.state).toBe('PASS')
  })

  it('ERROR (token 401) → raison non sensible, configured=true', async () => {
    const data = await run({ GSC_SERVICE_ACCOUNT_JSON: SA_JSON }, { tokenStatus: 401 })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.configured).toBe(true)
    expect(data.status.reason).toBe('oauth_token_http_401')
    expect(data.totals).toBeNull()
  })

  it('ERROR (sites.list 403) → gsc_http_403', async () => {
    const data = await run({ GSC_SERVICE_ACCOUNT_JSON: SA_JSON }, { sitesStatus: 403 })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('gsc_http_403')
  })

  it('ERROR (searchAnalytics 500) → gsc_http_500, propriété résolue exposée', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      { sites: SITES_OK, analyticsStatus: 500 },
    )
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('gsc_http_500')
    expect(data.status.property).toBe('sc-domain:chapelleduroyaume.org')
  })

  it('ERROR quand aucune propriété accessible', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      { sites: { siteEntry: [] } },
    )
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('gsc_no_accessible_property')
  })

  it('ERROR sur throw réseau brut → gsc_request_failed (aucun secret)', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      { sites: SITES_OK, analyticsRows: analyticsFixture, throwOn: /searchAnalytics/ },
    )
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('gsc_request_failed')
  })

  it('ERROR sur JSON malformé de sites.list', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      { badJsonOn: /\/sites$/ },
    )
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('gsc_request_failed')
  })
})

describe('getSearchConsoleSeo — succès & normalisation', () => {
  beforeEach(() => clearCache())

  it('PASS complet : totaux, top requêtes/pages, indexation, sitemaps', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      {
        sites: SITES_OK,
        analyticsRows: analyticsFixture,
        sitemaps: {
          sitemap: [
            {
              path: 'https://citadelle.chapelleduroyaume.org/sitemap.xml',
              lastSubmitted: '2026-08-01T00:00:00Z',
              isPending: false,
              errors: '0',
              warnings: '2',
            },
          ],
        },
      },
    )
    expect(data.status.state).toBe('PASS')
    expect(data.status.property).toBe('sc-domain:chapelleduroyaume.org')

    // Totaux issus des pages : clicks 45+12=57, impressions 600+300=900.
    expect(data.totals?.clicks).toBe(57)
    expect(data.totals?.impressions).toBe(900)
    expect(data.totals?.ctr).toBeCloseTo(57 / 900, 6)
    expect(data.totals!.ctr).toBeGreaterThanOrEqual(0)
    expect(data.totals!.ctr).toBeLessThanOrEqual(1)

    // Top requêtes triées par clics desc.
    expect(data.queries[0].query).toBe('citadelle')
    expect(data.queries.map((q) => q.query)).toContain('nouveau')

    // Tendance : citadelle 40 vs 10 → up ; nouveau absent période préc. → new.
    const citadelle = data.queries.find((q) => q.query === 'citadelle')!
    expect(citadelle.trend).toBe('up')
    expect(citadelle.delta).toBeCloseTo((40 - 10) / 10, 6)
    const nouveau = data.queries.find((q) => q.query === 'nouveau')!
    expect(nouveau.trend).toBe('new')
    expect(nouveau.delta).toBeUndefined()

    // Indexation bornée (≤ 8 routes piliers), verdict mappé.
    expect(data.indexation.length).toBeGreaterThan(0)
    expect(data.indexation.length).toBeLessThanOrEqual(8)
    expect(data.indexation[0].verdict).toBe('PASS')
    expect(data.indexation[0].coverageState).toBe('Submitted and indexed')

    // Sitemaps normalisés (compteurs numériques).
    expect(data.sitemaps[0].warnings).toBe(2)
    expect(data.sitemaps[0].errors).toBe(0)
  })

  it('dataset vide → PASS, totaux à zéro, listes vides', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      { sites: SITES_OK, analyticsRows: () => [] },
    )
    expect(data.status.state).toBe('PASS')
    expect(data.totals).toEqual({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      activeQueries: 0,
      visiblePages: 0,
    })
    expect(data.queries).toEqual([])
    expect(data.pages).toEqual([])
  })

  it('dataset partiel : inspection & sitemaps en échec → PASS avec listes vides', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      {
        sites: SITES_OK,
        analyticsRows: analyticsFixture,
        inspectStatus: 500,
        sitemapsStatus: 500,
      },
    )
    expect(data.status.state).toBe('PASS')
    expect(data.queries.length).toBeGreaterThan(0)
    expect(data.indexation).toEqual([])
    expect(data.sitemaps).toEqual([])
  })

  it('propriété de domaine → filtre pageHostFilter posé sur searchAnalytics', async () => {
    const calls: Calls = { urls: [], tokenBodies: [] }
    let capturedBody: string | undefined
    const fetchImpl = ((url: string, init?: RequestInit) => {
      if (/\/searchAnalytics\/query$/.test(url)) capturedBody = String(init?.body ?? '')
      return makeFetch({ sites: SITES_OK, analyticsRows: analyticsFixture }, calls)(url, init)
    }) as unknown as typeof fetch
    const data = await getSearchConsoleSeo({ period: PERIOD, nowIso: NOW_ISO, env: { GSC_SERVICE_ACCOUNT_JSON: SA_JSON }, fetchImpl })
    expect(data.status.state).toBe('PASS')
    expect(capturedBody).toContain('dimensionFilterGroups')
    expect(capturedBody).toContain('citadelle.chapelleduroyaume.org')
  })

  it('respecte GSC_SITE_URL explicite', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON, GSC_SITE_URL: 'https://citadelle.chapelleduroyaume.org/' },
      {
        sites: { siteEntry: [{ siteUrl: 'https://citadelle.chapelleduroyaume.org/', permissionLevel: 'siteFullUser' }] },
        analyticsRows: analyticsFixture,
      },
    )
    expect(data.status.property).toBe('https://citadelle.chapelleduroyaume.org/')
  })
})

describe('sécurité — aucun secret dans la sortie', () => {
  beforeEach(() => clearCache())

  it('la réponse sérialisée ne contient ni clé privée ni access token', async () => {
    const data = await run(
      { GSC_SERVICE_ACCOUNT_JSON: SA_JSON },
      { sites: SITES_OK, analyticsRows: analyticsFixture, sitemaps: { sitemap: [] } },
    )
    const blob = JSON.stringify(data)
    expect(blob).not.toContain(ACCESS_TOKEN)
    expect(blob).not.toContain('PRIVATE KEY')
    expect(blob).not.toContain('seo-bot@citadelle.iam.gserviceaccount.com')
    expect(blob).not.toContain('Bearer')
  })

  it('le JWT est bien envoyé au endpoint token (assertion présente)', async () => {
    const calls: Calls = { urls: [], tokenBodies: [] }
    await run({ GSC_SERVICE_ACCOUNT_JSON: SA_JSON }, { sites: SITES_OK, analyticsRows: analyticsFixture }, calls)
    expect(calls.tokenBodies.length).toBe(1)
    expect(calls.tokenBodies[0]).toContain('assertion=')
    expect(calls.tokenBodies[0]).toContain('grant_type=')
  })
})

/* ------------------------------------------------------------------ */
/* Tests unitaires PURS (normalize + JWT)                              */
/* ------------------------------------------------------------------ */

describe('normalize — maths & comparaison', () => {
  it('toTotals : ctr recalculé 0..1 + position pondérée par impressions', () => {
    const rows: RawSearchAnalyticsRow[] = [
      { clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
      { clicks: 5, impressions: 100, ctr: 0.05, position: 4 },
    ]
    const t = toTotals(rows, 2, 2)
    expect(t.clicks).toBe(15)
    expect(t.impressions).toBe(200)
    expect(t.ctr).toBeCloseTo(15 / 200, 6)
    expect(t.position).toBeCloseTo((2 * 100 + 4 * 100) / 200, 6)
  })

  it('toTotals : impressions 0 → ctr et position à 0 (pas de division par zéro)', () => {
    const t = toTotals([{ clicks: 0, impressions: 0, ctr: 0, position: 0 }], 0, 0)
    expect(t.ctr).toBe(0)
    expect(t.position).toBe(0)
  })

  it('computeTrend : new / up / down / flat', () => {
    expect(computeTrend(10, undefined)).toEqual({ trend: 'new' })
    expect(computeTrend(10, 0)).toEqual({ trend: 'up' })
    expect(computeTrend(0, 0)).toEqual({ trend: 'flat' })
    expect(computeTrend(20, 10).trend).toBe('up')
    expect(computeTrend(5, 10).trend).toBe('down')
    expect(computeTrend(103, 100).trend).toBe('flat') // < 5 %
  })

  it('toQueryRows : tri desc, top N, ctr borné 0..1', () => {
    const cur: RawSearchAnalyticsRow[] = [
      { keys: ['a'], clicks: 1, impressions: 10, ctr: 5, position: 1 }, // ctr aberrant → clampé
      { keys: ['b'], clicks: 9, impressions: 90, ctr: 0.1, position: 2 },
    ]
    const rows = toQueryRows(cur, [], 1)
    expect(rows.length).toBe(1)
    expect(rows[0].query).toBe('b')
    const all = toQueryRows(cur, [], 10)
    expect(all.find((r) => r.query === 'a')!.ctr).toBe(1)
  })

  it('toPageRows : clés vides ignorées', () => {
    const cur: RawSearchAnalyticsRow[] = [
      { keys: [''], clicks: 5, impressions: 10, ctr: 0.5, position: 1 },
      { keys: ['/x'], clicks: 3, impressions: 10, ctr: 0.3, position: 2 },
    ]
    const rows = toPageRows(cur, [], 10)
    expect(rows.map((r) => r.page)).toEqual(['/x'])
  })

  it('countActive : ne compte que les impressions > 0', () => {
    expect(countActive([{ impressions: 0 }, { impressions: 3 }, {}])).toBe(1)
  })
})

describe('normalize — résolution de propriété', () => {
  it('isDomainProperty / hostOfProperty', () => {
    expect(isDomainProperty('sc-domain:example.org')).toBe(true)
    expect(isDomainProperty('https://x.example/')).toBe(false)
    expect(hostOfProperty('sc-domain:example.org')).toBe('example.org')
    expect(hostOfProperty('https://citadelle.chapelleduroyaume.org/')).toBe('citadelle.chapelleduroyaume.org')
  })

  it('configuré exact prioritaire (tolère slash final)', () => {
    const sites = [{ siteUrl: 'https://citadelle.chapelleduroyaume.org/', permissionLevel: 'siteOwner' }]
    expect(resolveSiteUrl(sites, 'https://citadelle.chapelleduroyaume.org', 'citadelle.chapelleduroyaume.org')).toBe(
      'https://citadelle.chapelleduroyaume.org/',
    )
  })

  it('auto-détection : URL-property exacte préférée à la propriété de domaine', () => {
    const sites = [
      { siteUrl: 'sc-domain:chapelleduroyaume.org', permissionLevel: 'siteOwner' },
      { siteUrl: 'https://citadelle.chapelleduroyaume.org/', permissionLevel: 'siteOwner' },
    ]
    expect(resolveSiteUrl(sites, null, 'citadelle.chapelleduroyaume.org')).toBe(
      'https://citadelle.chapelleduroyaume.org/',
    )
  })

  it('auto-détection : propriété de domaine couvrant le sous-domaine', () => {
    const sites = [{ siteUrl: 'sc-domain:chapelleduroyaume.org', permissionLevel: 'siteOwner' }]
    expect(resolveSiteUrl(sites, null, 'citadelle.chapelleduroyaume.org')).toBe('sc-domain:chapelleduroyaume.org')
  })

  it('ignore les propriétés sans permission de lecture', () => {
    const sites = [{ siteUrl: 'https://citadelle.chapelleduroyaume.org/', permissionLevel: 'siteUnverifiedUser' }]
    expect(resolveSiteUrl(sites, null, 'citadelle.chapelleduroyaume.org')).toBeNull()
  })
})

describe('normalize — inspection & sitemaps', () => {
  it('mapVerdict couvre les valeurs connues + inconnu → UNKNOWN', () => {
    expect(mapVerdict('PASS')).toBe('PASS')
    expect(mapVerdict('PARTIAL')).toBe('PARTIAL')
    expect(mapVerdict('FAIL')).toBe('FAIL')
    expect(mapVerdict('NEUTRAL')).toBe('NEUTRAL')
    expect(mapVerdict('VERDICT_UNSPECIFIED')).toBe('UNKNOWN')
    expect(mapVerdict(undefined)).toBe('UNKNOWN')
  })

  it('toSitemaps : path requis, compteurs string→number', () => {
    const out = toSitemaps({
      sitemap: [
        { path: '/sitemap.xml', errors: '3', warnings: 1, isPending: true },
        { lastSubmitted: '2026-01-01' } as unknown as { path?: string },
      ],
    })
    expect(out.length).toBe(1)
    expect(out[0].errors).toBe(3)
    expect(out[0].warnings).toBe(1)
    expect(out[0].isPending).toBe(true)
  })
})

describe('google-auth — JWT RS256 réellement signé', () => {
  it('buildServiceAccountJwt produit un JWT à 3 segments signé avec la clé de test', () => {
    const jwt = buildServiceAccountJwt(
      { client_email: 'x@y.iam.gserviceaccount.com', private_key: TEST_PEM },
      ['https://www.googleapis.com/auth/webmasters.readonly'],
      1_700_000_000,
    )
    const parts = jwt.split('.')
    expect(parts.length).toBe(3)
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
    expect(header.alg).toBe('RS256')
    const claim = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    expect(claim.scope).toContain('webmasters.readonly')
    expect(claim.exp - claim.iat).toBe(3600)
    expect(parts[2].length).toBeGreaterThan(0)
  })
})
