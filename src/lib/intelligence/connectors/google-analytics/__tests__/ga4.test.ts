/**
 * CITADELLE INTELLIGENCE HUB — SEO · Tests connecteur GA4 (100 % hors-ligne).
 *
 * Aucun accès réseau : `fetchImpl` est toujours mocké. On vérifie les états
 * honnêtes (NOT_CONFIGURED / PASS / ERROR), la normalisation, la dégradation
 * gracieuse, la normalisation d'identifiant de propriété, et l'ABSENCE de tout
 * secret dans les objets renvoyés.
 */

import { describe, it, expect } from 'vitest'
import { generateKeyPairSync } from 'crypto'
import { getGa4OrganicSeo } from '../index'
import { normalizeGa4Property, loadGa4Config } from '../config'
import { buildOrganicRequest, normalizeReport } from '../normalize'
import { buildSeoPeriod } from '../../../seo/period'
import type { FetchImpl } from '../../google-auth'

/* ------------------------------------------------------------------ */
/* Helpers de mock                                                     */
/* ------------------------------------------------------------------ */

const NOW_MS = Date.parse('2026-08-21T12:00:00.000Z')
const NOW_ISO = '2026-08-21T12:00:00.000Z'
const PERIOD = buildSeoPeriod('28d', NOW_MS)

// Service-account factice (jamais un vrai secret) — clé PEM syntaxiquement
// valide pour la signature RS256 déterministe.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const FAKE_SA_JSON = JSON.stringify({
  client_email: 'ga4-reader@example-project.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
})

function envWithCreds(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    GA4_SERVICE_ACCOUNT_JSON: FAKE_SA_JSON,
    GA4_PROPERTY_ID: '123456789',
    ...extra,
  } as unknown as NodeJS.ProcessEnv
}

interface MockStep {
  ok?: boolean
  status?: number
  json?: unknown
  throwErr?: Error
}

/**
 * Fabrique un fetch mocké : la 1re réponse = échange OAuth token, puis une
 * réponse par `runReport`. `throwErr` simule un throw réseau (timeout).
 */
function mockFetch(steps: MockStep[]): { fetchImpl: FetchImpl; calls: string[] } {
  const calls: string[] = []
  let i = 0
  const fetchImpl = (async (url: string) => {
    calls.push(String(url))
    const step = steps[i++] ?? steps[steps.length - 1]
    if (step.throwErr) throw step.throwErr
    return {
      ok: step.ok ?? true,
      status: step.status ?? 200,
      json: async () => {
        if (step.json instanceof Error) throw step.json
        return step.json
      },
    } as unknown as Response
  }) as unknown as FetchImpl
  return { fetchImpl, calls }
}

const OAUTH_OK: MockStep = { ok: true, status: 200, json: { access_token: 'fake-token', expires_in: 3600 } }

function reportJson(rows: Array<{ dim: string; m: Record<string, string> }>, metricNames: string[]) {
  return {
    dimensionHeaders: [{ name: 'landingPagePlusQueryString' }],
    metricHeaders: metricNames.map((name) => ({ name })),
    rows: rows.map((r) => ({
      dimensionValues: [{ value: r.dim }],
      metricValues: metricNames.map((n) => ({ value: r.m[n] ?? '0' })),
    })),
  }
}

/** Recherche récursive de sous-chaînes sensibles dans un objet sérialisé. */
function containsSecret(obj: unknown): boolean {
  const s = JSON.stringify(obj)
  return (
    s.includes('fake-token') ||
    s.includes('PRIVATE KEY') ||
    s.includes('private_key') ||
    s.includes('BEGIN RSA')
  )
}

/* ------------------------------------------------------------------ */
/* Normalisation de l'identifiant de propriété                         */
/* ------------------------------------------------------------------ */

describe('normalizeGa4Property', () => {
  it('accepte un id numérique nu', () => {
    expect(normalizeGa4Property('123456789')).toBe('properties/123456789')
  })
  it('accepte la forme déjà préfixée', () => {
    expect(normalizeGa4Property('properties/123456789')).toBe('properties/123456789')
  })
  it('tolère les espaces superflus', () => {
    expect(normalizeGa4Property('  987654 ')).toBe('properties/987654')
  })
  it('rejette vide / non numérique (jamais d’invention)', () => {
    expect(normalizeGa4Property(undefined)).toBeNull()
    expect(normalizeGa4Property('')).toBeNull()
    expect(normalizeGa4Property('abc')).toBeNull()
    expect(normalizeGa4Property('properties/abc')).toBeNull()
  })
})

describe('loadGa4Config', () => {
  it('repli sur GOOGLE_SERVICE_ACCOUNT_JSON si GA4_SERVICE_ACCOUNT_JSON absent', () => {
    const cfg = loadGa4Config({
      GOOGLE_SERVICE_ACCOUNT_JSON: FAKE_SA_JSON,
      GA4_PROPERTY_ID: 'properties/555',
    } as unknown as NodeJS.ProcessEnv)
    expect(cfg?.property).toBe('properties/555')
  })
  it('null si pas de propriété', () => {
    expect(loadGa4Config({ GA4_SERVICE_ACCOUNT_JSON: FAKE_SA_JSON } as unknown as NodeJS.ProcessEnv)).toBeNull()
  })
  it('null si pas de credentials', () => {
    expect(loadGa4Config({ GA4_PROPERTY_ID: '123' } as unknown as NodeJS.ProcessEnv)).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* buildOrganicRequest / normalizeReport (purs)                        */
/* ------------------------------------------------------------------ */

describe('buildOrganicRequest', () => {
  it('filtre Organic Search + dimension landing page + dates de la fenêtre', () => {
    const req = buildOrganicRequest({ from: PERIOD.from, to: PERIOD.to })
    expect(req.dimensions).toEqual([{ name: 'landingPagePlusQueryString' }])
    expect(req.dateRanges).toEqual([{ startDate: PERIOD.from, endDate: PERIOD.to }])
    expect(req.metrics.map((m) => m.name)).toContain('conversions')
    const f = (
      req.dimensionFilter as {
        filter: { fieldName: string; stringFilter: { value: string } }
      }
    ).filter
    expect(f.fieldName).toBe('sessionDefaultChannelGroup')
    expect(f.stringFilter.value).toBe('Organic Search')
  })

  it('comparaison période/période : construit aussi la fenêtre précédente', () => {
    const prev = buildOrganicRequest({ from: PERIOD.prevFrom, to: PERIOD.prevTo })
    expect(prev.dateRanges).toEqual([{ startDate: PERIOD.prevFrom, endDate: PERIOD.prevTo }])
    expect(PERIOD.prevTo < PERIOD.from).toBe(true)
  })

  it('includeConversions=false retire la métrique conversions', () => {
    const req = buildOrganicRequest({ from: PERIOD.from, to: PERIOD.to }, { includeConversions: false })
    expect(req.metrics.map((m) => m.name)).not.toContain('conversions')
  })
})

describe('normalizeReport', () => {
  it('agrège les totaux, trie par sessions, normalise engagementRate 0..1', () => {
    const resp = reportJson(
      [
        { dim: '/a', m: { sessions: '10', totalUsers: '8', engagedSessions: '6', engagementRate: '0.6', conversions: '2' } },
        { dim: '/b', m: { sessions: '30', totalUsers: '25', engagedSessions: '20', engagementRate: '0.66', conversions: '5' } },
      ],
      ['sessions', 'totalUsers', 'engagedSessions', 'engagementRate', 'conversions'],
    )
    const s = normalizeReport(resp)
    expect(s.sessions).toBe(40)
    expect(s.users).toBe(33)
    expect(s.engagedSessions).toBe(26)
    expect(s.conversions).toBe(7)
    expect(s.landingPages[0].dimension).toBe('/b') // tri desc
    expect(s.landingPages[0].engagementRate).toBeCloseTo(0.66)
    for (const p of s.landingPages) {
      expect(p.engagementRate!).toBeGreaterThanOrEqual(0)
      expect(p.engagementRate!).toBeLessThanOrEqual(1)
    }
  })

  it('lignes vides ⇒ totaux à zéro, aucune page', () => {
    const s = normalizeReport(reportJson([], ['sessions', 'totalUsers']))
    expect(s).toEqual({ sessions: 0, users: 0, engagedSessions: 0, conversions: 0, landingPages: [] })
  })

  it('métrique conversions absente ⇒ conversions=0 (dégradation propre)', () => {
    const resp = reportJson(
      [{ dim: '/a', m: { sessions: '5', totalUsers: '5' } }],
      ['sessions', 'totalUsers'],
    )
    const s = normalizeReport(resp)
    expect(s.conversions).toBe(0)
    expect(s.landingPages[0].conversions).toBeUndefined()
  })

  it('mappe par NOM d’en-tête, pas par position (ordre inversé)', () => {
    const resp = reportJson(
      [{ dim: '/a', m: { sessions: '3', totalUsers: '9' } }],
      ['totalUsers', 'sessions'],
    )
    const s = normalizeReport(resp)
    expect(s.sessions).toBe(3)
    expect(s.users).toBe(9)
  })

  it('taux hors bornes clampé dans [0,1]', () => {
    const resp = reportJson(
      [{ dim: '/a', m: { sessions: '1', totalUsers: '1', engagementRate: '1.4' } }],
      ['sessions', 'totalUsers', 'engagementRate'],
    )
    expect(normalizeReport(resp).landingPages[0].engagementRate).toBe(1)
  })
})

/* ------------------------------------------------------------------ */
/* getGa4OrganicSeo — états honnêtes                                   */
/* ------------------------------------------------------------------ */

describe('getGa4OrganicSeo — NOT_CONFIGURED', () => {
  it('aucun credential ⇒ NOT_CONFIGURED, configured=false, organic null', async () => {
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, env: {} as unknown as NodeJS.ProcessEnv })
    expect(data.status.state).toBe('NOT_CONFIGURED')
    expect(data.status.configured).toBe(false)
    expect(data.organic).toBeNull()
    expect(data.status.property).toBeUndefined()
  })

  it('credentials mais pas de GA4_PROPERTY_ID ⇒ NOT_CONFIGURED, configured=true', async () => {
    const data = await getGa4OrganicSeo({
      period: PERIOD,
      nowIso: NOW_ISO,
      env: { GA4_SERVICE_ACCOUNT_JSON: FAKE_SA_JSON } as unknown as NodeJS.ProcessEnv,
    })
    expect(data.status.state).toBe('NOT_CONFIGURED')
    expect(data.status.configured).toBe(true)
    expect(data.organic).toBeNull()
  })
})

describe('getGa4OrganicSeo — PASS', () => {
  it('runReport bien formé ⇒ PASS, résumé + pages, property publique', async () => {
    const { fetchImpl, calls } = mockFetch([
      OAUTH_OK,
      {
        ok: true,
        status: 200,
        json: reportJson(
          [
            { dim: '/accueil', m: { sessions: '100', totalUsers: '80', engagedSessions: '70', engagementRate: '0.7', conversions: '9' } },
            { dim: '/formations', m: { sessions: '40', totalUsers: '35', engagedSessions: '30', engagementRate: '0.75', conversions: '3' } },
          ],
          ['sessions', 'totalUsers', 'engagedSessions', 'engagementRate', 'conversions'],
        ),
      },
    ])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('PASS')
    expect(data.status.configured).toBe(true)
    expect(data.status.property).toBe('properties/123456789')
    expect(data.organic?.sessions).toBe(140)
    expect(data.organic?.conversions).toBe(12)
    expect(data.organic?.landingPages).toHaveLength(2)
    expect(data.organic?.landingPages[0].dimension).toBe('/accueil')
    // 1er appel = OAuth, 2e = runReport sur la bonne propriété
    expect(calls[1]).toContain('properties/123456789:runReport')
    // aucun secret exposé
    expect(containsSecret(data)).toBe(false)
  })

  it('HTTP 400 sur conversions ⇒ retry sans conversions puis PASS', async () => {
    const { fetchImpl, calls } = mockFetch([
      OAUTH_OK,
      { ok: false, status: 400 }, // 1er runReport (avec conversions) rejeté
      {
        ok: true,
        status: 200,
        json: reportJson(
          [{ dim: '/a', m: { sessions: '12', totalUsers: '10', engagedSessions: '8', engagementRate: '0.66' } }],
          ['sessions', 'totalUsers', 'engagedSessions', 'engagementRate'],
        ),
      },
    ])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('PASS')
    expect(data.organic?.sessions).toBe(12)
    expect(data.organic?.conversions).toBe(0)
    expect(calls).toHaveLength(3) // oauth + 2 runReport
  })
})

describe('getGa4OrganicSeo — ERROR', () => {
  it('401 OAuth ⇒ ERROR, raison non sensible, organic null', async () => {
    const { fetchImpl } = mockFetch([{ ok: false, status: 401 }])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.configured).toBe(true)
    expect(data.status.reason).toBe('oauth_token_http_401')
    expect(data.organic).toBeNull()
    expect(containsSecret(data)).toBe(false)
  })

  it('403 sur runReport ⇒ ERROR ga4_http_403', async () => {
    const { fetchImpl } = mockFetch([OAUTH_OK, { ok: false, status: 403 }])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('ga4_http_403')
    expect(data.organic).toBeNull()
  })

  it('throw réseau (timeout) ⇒ ERROR, jamais de crash', async () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    const { fetchImpl } = mockFetch([OAUTH_OK, { throwErr: abort }])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('ga4_timeout')
    expect(data.organic).toBeNull()
  })

  it('JSON malformé sur runReport ⇒ ERROR ga4_bad_json', async () => {
    const { fetchImpl } = mockFetch([OAUTH_OK, { ok: true, status: 200, json: new Error('bad json') }])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('ERROR')
    expect(data.status.reason).toBe('ga4_bad_json')
  })

  it('rangée vide (0 organic) ⇒ PASS avec résumé à zéro, pas ERROR', async () => {
    const { fetchImpl } = mockFetch([OAUTH_OK, { ok: true, status: 200, json: reportJson([], ['sessions', 'totalUsers']) }])
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, nowMs: NOW_MS, env: envWithCreds(), fetchImpl })
    expect(data.status.state).toBe('PASS')
    expect(data.organic?.sessions).toBe(0)
    expect(data.organic?.landingPages).toEqual([])
  })
})

describe('libellé de source / fraîcheur', () => {
  it('le connecteur émet toujours connector=google_analytics', async () => {
    const data = await getGa4OrganicSeo({ period: PERIOD, nowIso: NOW_ISO, env: {} as unknown as NodeJS.ProcessEnv })
    expect(data.status.connector).toBe('google_analytics')
  })
})
