import { describe, it, expect } from 'vitest'
import { detectOpportunities } from '../opportunities'
import type {
  GscQueryRow,
  GscPageRow,
  UrlInspectionResult,
  SitemapInfo,
  TechnicalSeoMatrix,
  SeoRouteAudit,
} from '../types'

const q = (over: Partial<GscQueryRow> = {}): GscQueryRow => ({
  query: 'q',
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 50,
  ...over,
})
const p = (over: Partial<GscPageRow> = {}): GscPageRow => ({
  page: 'https://citadelle.chapelleduroyaume.org/x',
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 50,
  ...over,
})

function route(over: Partial<SeoRouteAudit> = {}): SeoRouteAudit {
  return {
    route: '/x',
    indexable: true,
    title: 'PASS',
    description: 'PASS',
    canonical: 'PASS',
    structuredData: 'PASS',
    inSitemap: true,
    robots: 'ALLOW',
    issues: [],
    severity: 'info',
    ...over,
  }
}
function matrix(routes: SeoRouteAudit[]): TechnicalSeoMatrix {
  return {
    generatedAt: '2026-08-21T00:00:00.000Z',
    routes,
    summary: { total: routes.length, indexable: routes.length, withIssues: 0, critical: 0, high: 0 },
    checks: {
      metadata: 'PASS',
      canonicals: 'PASS',
      robots: 'PASS',
      sitemap: 'PASS',
      jsonLd: 'PASS',
      privateRoutesNoindex: 'PASS',
    },
  }
}

describe('detectOpportunities — entrée vide/partielle', () => {
  it('entrée totalement vide → aucune opportunité', () => {
    expect(detectOpportunities({})).toEqual([])
  })
  it('connecteurs absents mais technique fournie → seulement opportunités techniques', () => {
    const res = detectOpportunities({ technical: matrix([route({ title: 'FAIL' })]) })
    expect(res.every((o) => o.kind === 'MISSING_METADATA' || o.kind === 'MISSING_STRUCTURED_DATA')).toBe(true)
    expect(res.some((o) => o.kind === 'MISSING_METADATA')).toBe(true)
  })
})

describe('HIGH_IMPRESSIONS_LOW_CTR', () => {
  it('détecte impressions >=100, CTR <2 %, position page 1', () => {
    const res = detectOpportunities({ queries: [q({ query: 'jesus', impressions: 500, ctr: 0.01, position: 6 })] })
    const o = res.find((x) => x.kind === 'HIGH_IMPRESSIONS_LOW_CTR')
    expect(o).toBeTruthy()
    expect(o!.subject).toBe('jesus')
    expect(o!.evidence).toContain('500')
  })
  it('CTR sain → ignoré', () => {
    const res = detectOpportunities({ queries: [q({ impressions: 500, ctr: 0.2, position: 6 })] })
    expect(res.some((x) => x.kind === 'HIGH_IMPRESSIONS_LOW_CTR')).toBe(false)
  })
  it('position hors page 1 → ignoré (CTR bas normal)', () => {
    const res = detectOpportunities({ queries: [q({ impressions: 500, ctr: 0.01, position: 30 })] })
    expect(res.some((x) => x.kind === 'HIGH_IMPRESSIONS_LOW_CTR')).toBe(false)
  })
  it('impressions insuffisantes → ignoré', () => {
    const res = detectOpportunities({ queries: [q({ impressions: 40, ctr: 0.01, position: 6 })] })
    expect(res.some((x) => x.kind === 'HIGH_IMPRESSIONS_LOW_CTR')).toBe(false)
  })
})

describe('POSITION_4_TO_15', () => {
  it('détecte une requête en striking distance', () => {
    const res = detectOpportunities({ queries: [q({ query: 'foi', position: 9, impressions: 200, clicks: 5 })] })
    expect(res.some((x) => x.kind === 'POSITION_4_TO_15' && x.subject === 'foi')).toBe(true)
  })
  it('position < 4 (déjà top) → ignoré', () => {
    const res = detectOpportunities({ queries: [q({ position: 2, impressions: 200 })] })
    expect(res.some((x) => x.kind === 'POSITION_4_TO_15')).toBe(false)
  })
  it('position > 15 → ignoré', () => {
    const res = detectOpportunities({ queries: [q({ position: 20, impressions: 200 })] })
    expect(res.some((x) => x.kind === 'POSITION_4_TO_15')).toBe(false)
  })
})

describe('DECLINING_PAGE', () => {
  it('page en baisse >=20 % avec impressions suffisantes', () => {
    const res = detectOpportunities({ pages: [p({ page: '/live', trend: 'down', delta: -0.35, impressions: 100, clicks: 10 })] })
    const o = res.find((x) => x.kind === 'DECLINING_PAGE')
    expect(o).toBeTruthy()
    expect(o!.evidence).toContain('-35 %')
  })
  it('baisse forte (>=40 %) → sévérité high', () => {
    const res = detectOpportunities({ pages: [p({ trend: 'down', delta: -0.5, impressions: 100 })] })
    expect(res.find((x) => x.kind === 'DECLINING_PAGE')!.severity).toBe('high')
  })
  it('baisse faible (<20 %) → ignoré', () => {
    const res = detectOpportunities({ pages: [p({ trend: 'down', delta: -0.1, impressions: 100 })] })
    expect(res.some((x) => x.kind === 'DECLINING_PAGE')).toBe(false)
  })
  it('trend up → ignoré', () => {
    const res = detectOpportunities({ pages: [p({ trend: 'up', delta: 0.5, impressions: 100 })] })
    expect(res.some((x) => x.kind === 'DECLINING_PAGE')).toBe(false)
  })
})

describe('RISING_QUERY', () => {
  it('requête nouvelle', () => {
    const res = detectOpportunities({ queries: [q({ query: 'reveil', trend: 'new', impressions: 80, position: 12 })] })
    const o = res.find((x) => x.kind === 'RISING_QUERY')
    expect(o).toBeTruthy()
    expect(o!.evidence.toLowerCase()).toContain('nouvelle')
  })
  it('requête en forte hausse (>=50 %)', () => {
    const res = detectOpportunities({ queries: [q({ trend: 'up', delta: 0.8, impressions: 80 })] })
    expect(res.some((x) => x.kind === 'RISING_QUERY')).toBe(true)
  })
  it('hausse modeste (<50 %) → ignoré', () => {
    const res = detectOpportunities({ queries: [q({ trend: 'up', delta: 0.1, impressions: 80 })] })
    expect(res.some((x) => x.kind === 'RISING_QUERY')).toBe(false)
  })
})

describe('UNINDEXED_IMPORTANT_PAGE', () => {
  const url = 'https://citadelle.chapelleduroyaume.org/formations'
  it('route importante avec verdict FAIL → critique (route primaire)', () => {
    const insp: UrlInspectionResult = { url, verdict: 'FAIL', coverageState: 'Crawled - currently not indexed' }
    const res = detectOpportunities({ indexation: [insp] })
    const o = res.find((x) => x.kind === 'UNINDEXED_IMPORTANT_PAGE')
    expect(o).toBeTruthy()
    expect(o!.severity).toBe('critical')
    expect(o!.subject).toBe('/formations')
  })
  it('coverageState « not indexed » même si verdict != FAIL', () => {
    const insp: UrlInspectionResult = { url, verdict: 'NEUTRAL', coverageState: 'Excluded by noindex' }
    const res = detectOpportunities({ indexation: [insp] })
    expect(res.some((x) => x.kind === 'UNINDEXED_IMPORTANT_PAGE')).toBe(true)
  })
  it('URL hors routes importantes → ignoré', () => {
    const insp: UrlInspectionResult = { url: 'https://citadelle.chapelleduroyaume.org/blah-inconnu', verdict: 'FAIL' }
    const res = detectOpportunities({ indexation: [insp] })
    expect(res.some((x) => x.kind === 'UNINDEXED_IMPORTANT_PAGE')).toBe(false)
  })
  it('page importante correctement indexée (PASS) → ignoré', () => {
    const insp: UrlInspectionResult = { url, verdict: 'PASS', coverageState: 'Submitted and indexed' }
    const res = detectOpportunities({ indexation: [insp] })
    expect(res.some((x) => x.kind === 'UNINDEXED_IMPORTANT_PAGE')).toBe(false)
  })
})

describe('CANONICAL_MISMATCH', () => {
  it('canonique Google différente de la déclarée', () => {
    const insp: UrlInspectionResult = {
      url: 'https://citadelle.chapelleduroyaume.org/articles',
      verdict: 'PASS',
      userCanonical: 'https://citadelle.chapelleduroyaume.org/articles',
      googleCanonical: 'https://citadelle.chapelleduroyaume.org/blog',
    }
    const res = detectOpportunities({ indexation: [insp] })
    expect(res.some((x) => x.kind === 'CANONICAL_MISMATCH')).toBe(true)
  })
  it('canoniques identiques (slash final ignoré) → ignoré', () => {
    const insp: UrlInspectionResult = {
      url: 'https://citadelle.chapelleduroyaume.org/articles',
      verdict: 'PASS',
      userCanonical: 'https://citadelle.chapelleduroyaume.org/articles/',
      googleCanonical: 'https://citadelle.chapelleduroyaume.org/articles',
    }
    const res = detectOpportunities({ indexation: [insp] })
    expect(res.some((x) => x.kind === 'CANONICAL_MISMATCH')).toBe(false)
  })
})

describe('SITEMAP_ISSUE', () => {
  it('sitemap en erreur → high', () => {
    const sm: SitemapInfo = { path: '/sitemap.xml', errors: 3, warnings: 1 }
    const res = detectOpportunities({ sitemaps: [sm] })
    const o = res.find((x) => x.kind === 'SITEMAP_ISSUE')
    expect(o!.severity).toBe('high')
    expect(o!.evidence).toContain('3')
  })
  it('sitemap en attente sans erreur → low', () => {
    const sm: SitemapInfo = { path: '/sitemap.xml', isPending: true }
    const res = detectOpportunities({ sitemaps: [sm] })
    expect(res.find((x) => x.kind === 'SITEMAP_ISSUE')!.severity).toBe('low')
  })
  it('sitemap sain → ignoré', () => {
    const sm: SitemapInfo = { path: '/sitemap.xml', errors: 0 }
    const res = detectOpportunities({ sitemaps: [sm] })
    expect(res.some((x) => x.kind === 'SITEMAP_ISSUE')).toBe(false)
  })
})

describe('MISSING_METADATA / MISSING_STRUCTURED_DATA', () => {
  it('title FAIL sur route indexable → MISSING_METADATA', () => {
    const res = detectOpportunities({ technical: matrix([route({ route: '/live', title: 'FAIL' })]) })
    const o = res.find((x) => x.kind === 'MISSING_METADATA')
    expect(o).toBeTruthy()
    expect(o!.evidence).toContain('title')
  })
  it('structuredData FAIL → MISSING_STRUCTURED_DATA', () => {
    const res = detectOpportunities({ technical: matrix([route({ structuredData: 'FAIL' })]) })
    expect(res.some((x) => x.kind === 'MISSING_STRUCTURED_DATA')).toBe(true)
  })
  it('route NON indexable → jamais signalée', () => {
    const res = detectOpportunities({ technical: matrix([route({ indexable: false, title: 'FAIL', structuredData: 'FAIL' })]) })
    expect(res.length).toBe(0)
  })
})

describe('tri déterministe', () => {
  it('critiques avant infos', () => {
    const res = detectOpportunities({
      queries: [q({ query: 'reveil', trend: 'new', impressions: 80, position: 12 })],
      indexation: [{ url: 'https://citadelle.chapelleduroyaume.org/formations', verdict: 'FAIL' }],
    })
    expect(res[0].severity).toBe('critical')
    expect(res[res.length - 1].kind).toBe('RISING_QUERY')
  })
})
