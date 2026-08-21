import { describe, it, expect } from 'vitest'
import { buildSeoOverview } from '../overview'
import type {
  SearchConsoleData,
  Ga4Data,
  GscTotals,
  Ga4OrganicSummary,
  SeoConnectorStatus,
} from '../types'

const NOW = '2026-08-21T10:00:00.000Z'

function gscStatus(state: SeoConnectorStatus['state']): SeoConnectorStatus {
  return {
    connector: 'google_search_console',
    state,
    configured: state === 'PASS',
    checkedAt: NOW,
  }
}
function ga4Status(state: SeoConnectorStatus['state']): SeoConnectorStatus {
  return {
    connector: 'google_analytics',
    state,
    configured: state === 'PASS',
    checkedAt: NOW,
  }
}

const totals: GscTotals = {
  clicks: 1200,
  impressions: 40000,
  ctr: 0.03,
  position: 8.4,
  activeQueries: 350,
  visiblePages: 120,
}

function gscReal(t: GscTotals = totals): SearchConsoleData {
  return { status: gscStatus('PASS'), totals: t, queries: [], pages: [], indexation: [], sitemaps: [] }
}
function gscOff(state: SeoConnectorStatus['state'] = 'NOT_CONFIGURED'): SearchConsoleData {
  return { status: gscStatus(state), totals: null, queries: [], pages: [], indexation: [], sitemaps: [] }
}

const organic: Ga4OrganicSummary = {
  sessions: 900,
  users: 700,
  engagedSessions: 500,
  conversions: 40,
  landingPages: [],
}
function ga4Real(o: Ga4OrganicSummary = organic): Ga4Data {
  return { status: ga4Status('PASS'), organic: o }
}
function ga4Off(state: SeoConnectorStatus['state'] = 'NOT_CONFIGURED'): Ga4Data {
  return { status: ga4Status(state), organic: null }
}

describe('buildSeoOverview', () => {
  it('émet 7 cartes (6 GSC + 1 GA4) avec des clés stables', () => {
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Real(), nowIso: NOW })
    expect(cards.map((c) => c.key)).toEqual([
      'clicks',
      'impressions',
      'ctr',
      'position',
      'visible_pages',
      'active_queries',
      'ga4_organic',
    ])
  })

  it('cartes GSC réelles quand PASS + totals : valeurs exactes, source et fraîcheur SEO_DELAYED', () => {
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW })
    const clicks = cards.find((c) => c.key === 'clicks')!
    expect(clicks.availability).toBe('real')
    expect(clicks.value).toBe(1200)
    expect(clicks.source).toBe('google_search_console')
    expect(clicks.freshness).toBe('SEO_DELAYED')
  })

  it('le CTR reste un ratio 0..1 dans la donnée (pas de conversion en %)', () => {
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW })
    const ctr = cards.find((c) => c.key === 'ctr')!
    expect(ctr.unit).toBe('ratio')
    expect(ctr.value).toBe(0.03)
    expect(ctr.value! <= 1).toBe(true)
  })

  it('GSC NOT_CONFIGURED : toutes les cartes GSC sont indisponibles, value null (jamais 0)', () => {
    const cards = buildSeoOverview({ gsc: gscOff(), ga4: ga4Off(), nowIso: NOW })
    for (const key of ['clicks', 'impressions', 'ctr', 'position', 'visible_pages', 'active_queries']) {
      const c = cards.find((x) => x.key === key)!
      expect(c.availability).toBe('unavailable')
      expect(c.value).toBeNull()
      expect(c.trend).toBe('unknown')
      expect(c.delta).toBeUndefined()
    }
  })

  it('GSC ERROR sans totals : indisponible aussi', () => {
    const cards = buildSeoOverview({ gsc: gscOff('ERROR'), ga4: ga4Off(), nowIso: NOW })
    expect(cards.find((c) => c.key === 'clicks')!.availability).toBe('unavailable')
  })

  it('GSC PASS mais totals null : indisponible (garde-fou)', () => {
    const gsc: SearchConsoleData = {
      status: gscStatus('PASS'),
      totals: null,
      queries: [],
      pages: [],
      indexation: [],
      sitemaps: [],
    }
    const cards = buildSeoOverview({ gsc, ga4: ga4Off(), nowIso: NOW })
    expect(cards.find((c) => c.key === 'clicks')!.availability).toBe('unavailable')
  })

  it('carte GA4 réelle quand PASS + organic, fraîcheur SYNCED', () => {
    const cards = buildSeoOverview({ gsc: gscOff(), ga4: ga4Real(), nowIso: NOW })
    const ga4 = cards.find((c) => c.key === 'ga4_organic')!
    expect(ga4.availability).toBe('real')
    expect(ga4.value).toBe(900)
    expect(ga4.source).toBe('google_analytics')
    expect(ga4.freshness).toBe('SYNCED')
  })

  it('GA4 NOT_CONFIGURED : carte indisponible, value null', () => {
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW })
    const ga4 = cards.find((c) => c.key === 'ga4_organic')!
    expect(ga4.availability).toBe('unavailable')
    expect(ga4.value).toBeNull()
  })

  it('tendance up quand la période précédente est plus basse', () => {
    const prev: GscTotals = { ...totals, clicks: 1000 }
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW, prevTotals: prev })
    const clicks = cards.find((c) => c.key === 'clicks')!
    expect(clicks.trend).toBe('up')
    expect(clicks.delta).toBeCloseTo(0.2, 5) // (1200-1000)/1000
  })

  it('tendance down + delta signé', () => {
    const prev: GscTotals = { ...totals, clicks: 1500 }
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW, prevTotals: prev })
    const clicks = cards.find((c) => c.key === 'clicks')!
    expect(clicks.trend).toBe('down')
    expect(clicks.delta).toBeLessThan(0)
  })

  it('tendance flat sous le seuil de 0,5 %', () => {
    const prev: GscTotals = { ...totals, clicks: 1202 }
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW, prevTotals: prev })
    expect(cards.find((c) => c.key === 'clicks')!.trend).toBe('flat')
  })

  it('prev à 0 → pas de delta (division impossible), trend unknown', () => {
    const prev: GscTotals = { ...totals, clicks: 0 }
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW, prevTotals: prev })
    const clicks = cards.find((c) => c.key === 'clicks')!
    expect(clicks.trend).toBe('unknown')
    expect(clicks.delta).toBeUndefined()
  })

  it('sans prevTotals : trend unknown, pas de delta', () => {
    const cards = buildSeoOverview({ gsc: gscReal(), ga4: ga4Off(), nowIso: NOW })
    expect(cards.find((c) => c.key === 'clicks')!.trend).toBe('unknown')
  })

  it('tendance GA4 calculée depuis prevOrganic', () => {
    const prevOrg: Ga4OrganicSummary = { ...organic, sessions: 600 }
    const cards = buildSeoOverview({ gsc: gscOff(), ga4: ga4Real(), nowIso: NOW, prevOrganic: prevOrg })
    const ga4 = cards.find((c) => c.key === 'ga4_organic')!
    expect(ga4.trend).toBe('up')
    expect(ga4.delta).toBeCloseTo(0.5, 5)
  })
})
