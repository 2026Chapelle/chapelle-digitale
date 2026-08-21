import { describe, it, expect } from 'vitest'
import {
  auditTechnicalSeo,
  deriveRouteAudit,
  deriveMatrix,
  derivePrivateNoindex,
  maxSeverity,
  rollupStatus,
} from '../audit'
import type { RouteFact, PrivateRouteFact } from '../route-facts'
import { ROUTE_FACTS, PRIVATE_ROUTE_FACTS } from '../route-facts'
import { IMPORTANT_ROUTES } from '../../important-routes'

const NOW = '2026-08-21T00:00:00.000Z'

/** Fabrique un fait « parfait » que chaque test dégrade au besoin. */
function fact(overrides: Partial<RouteFact> = {}): RouteFact {
  return {
    path: '/x',
    hasTitle: true,
    hasDescription: true,
    hasCanonical: true,
    inSitemap: true,
    hasPageJsonLd: false,
    structuredDataExpected: false,
    robots: 'ALLOW',
    ...overrides,
  }
}

describe('helpers de rollup', () => {
  it('maxSeverity prend la gravité la plus élevée', () => {
    expect(maxSeverity([])).toBe('info')
    expect(maxSeverity(['low', 'critical', 'medium'])).toBe('critical')
    expect(maxSeverity(['low', 'medium'])).toBe('medium')
  })

  it('rollupStatus : FAIL > WARN > PASS > NA', () => {
    expect(rollupStatus([])).toBe('NA')
    expect(rollupStatus(['NA', 'PASS'])).toBe('PASS')
    expect(rollupStatus(['PASS', 'WARN'])).toBe('WARN')
    expect(rollupStatus(['WARN', 'FAIL', 'PASS'])).toBe('FAIL')
  })
})

describe('deriveRouteAudit', () => {
  it('route saine → aucun problème, sévérité info, indexable', () => {
    const r = deriveRouteAudit({ path: '/x', shouldIndex: true }, fact())
    expect(r.title).toBe('PASS')
    expect(r.description).toBe('PASS')
    expect(r.canonical).toBe('PASS')
    expect(r.issues).toHaveLength(0)
    expect(r.severity).toBe('info')
    expect(r.indexable).toBe(true)
  })

  it('metadata manquant → title/description FAIL, sévérité high, action layout', () => {
    const r = deriveRouteAudit(
      { path: '/servir', shouldIndex: true },
      fact({ hasTitle: false, hasDescription: false }),
    )
    expect(r.title).toBe('FAIL')
    expect(r.description).toBe('FAIL')
    expect(r.severity).toBe('high')
    expect(r.action).toMatch(/layout metadata/i)
  })

  it('canonique absente → WARN (héritage racine) + medium', () => {
    const r = deriveRouteAudit({ path: '/articles', shouldIndex: true }, fact({ hasCanonical: false }))
    expect(r.canonical).toBe('WARN')
    expect(r.severity).toBe('medium')
    expect(r.issues.join(' ')).toMatch(/canonique/i)
  })

  it('route indexable absente du sitemap → issue medium', () => {
    const r = deriveRouteAudit({ path: '/x', shouldIndex: true }, fact({ inSitemap: false }))
    expect(r.inSitemap).toBe(false)
    expect(r.issues.join(' ')).toMatch(/sitemap/i)
    expect(r.severity).toBe('medium')
  })

  it('route censée être indexée mais bloquée → critical + non indexable', () => {
    const r = deriveRouteAudit({ path: '/x', shouldIndex: true }, fact({ robots: 'NOINDEX' }))
    expect(r.indexable).toBe(false)
    expect(r.severity).toBe('critical')
  })

  it('données structurées attendues mais absentes → structuredData WARN (low)', () => {
    const r = deriveRouteAudit(
      { path: '/evenements', shouldIndex: true },
      fact({ structuredDataExpected: true, hasPageJsonLd: false }),
    )
    expect(r.structuredData).toBe('WARN')
    expect(r.severity).toBe('low')
  })

  it('JSON-LD présent → structuredData PASS', () => {
    const r = deriveRouteAudit({ path: '/x', shouldIndex: true }, fact({ hasPageJsonLd: true }))
    expect(r.structuredData).toBe('PASS')
  })

  it('fait absent pour une route importante → NA + medium', () => {
    const r = deriveRouteAudit({ path: '/mystere', shouldIndex: true }, undefined)
    expect(r.title).toBe('NA')
    expect(r.severity).toBe('medium')
    expect(r.issues[0]).toMatch(/aucun fait/i)
  })
})

describe('derivePrivateNoindex', () => {
  it('vide → NA', () => {
    expect(derivePrivateNoindex([])).toBe('NA')
  })
  it('toutes bloquées au crawl → PASS', () => {
    const p: PrivateRouteFact[] = [{ path: '/admin', disallowedInRobots: true, hasNoindexMeta: false }]
    expect(derivePrivateNoindex(p)).toBe('PASS')
  })
  it('une route privée exposée (ni disallow ni noindex) → FAIL', () => {
    const p: PrivateRouteFact[] = [
      { path: '/admin', disallowedInRobots: true, hasNoindexMeta: false },
      { path: '/secret', disallowedInRobots: false, hasNoindexMeta: false },
    ]
    expect(derivePrivateNoindex(p)).toBe('FAIL')
  })
})

describe('deriveMatrix', () => {
  it('entrée vide → matrice neutre, checks NA', () => {
    const m = deriveMatrix([], [], [], NOW)
    expect(m.summary.total).toBe(0)
    expect(m.checks.metadata).toBe('NA')
    expect(m.checks.privateRoutesNoindex).toBe('NA')
    expect(m.generatedAt).toBe(NOW)
  })

  it('rollup de sévérité : compte critical/high correctement', () => {
    const routes = [
      { path: '/a', shouldIndex: true },
      { path: '/b', shouldIndex: true },
      { path: '/c', shouldIndex: true },
    ]
    const facts = [
      fact({ path: '/a' }),
      fact({ path: '/b', hasTitle: false }), // high
      fact({ path: '/c', robots: 'NOINDEX' }), // critical
    ]
    const m = deriveMatrix(routes, facts, [], NOW)
    expect(m.summary.total).toBe(3)
    expect(m.summary.high).toBe(1)
    expect(m.summary.critical).toBe(1)
    expect(m.summary.indexable).toBe(2)
    expect(m.checks.metadata).toBe('FAIL')
    expect(m.checks.robots).toBe('FAIL')
  })

  it('canonical mismatch remonte en checks.canonicals=WARN', () => {
    const routes = [{ path: '/a', shouldIndex: true }]
    const m = deriveMatrix(routes, [fact({ path: '/a', hasCanonical: false })], [], NOW)
    expect(m.checks.canonicals).toBe('WARN')
  })

  it('couverture sitemap : route indexable manquante → checks.sitemap=FAIL', () => {
    const routes = [{ path: '/a', shouldIndex: true }]
    const m = deriveMatrix(routes, [fact({ path: '/a', inSitemap: false })], [], NOW)
    expect(m.checks.sitemap).toBe('FAIL')
  })
})

describe('auditTechnicalSeo (matrice réelle)', () => {
  const m = auditTechnicalSeo({ nowIso: NOW, baseUrl: 'https://citadelle.chapelleduroyaume.org' })

  it('couvre toutes les routes importantes', () => {
    expect(m.summary.total).toBe(IMPORTANT_ROUTES.length)
    expect(m.routes).toHaveLength(ROUTE_FACTS.length)
  })

  it('aucune route importante sans metadata (post-correctif)', () => {
    expect(m.checks.metadata).toBe('PASS')
    expect(m.summary.high).toBe(0)
    expect(m.summary.critical).toBe(0)
  })

  it('canoniques toutes déclarées (post-correctif) → PASS', () => {
    expect(m.checks.canonicals).toBe('PASS')
  })

  it('toutes les routes importantes sont dans le sitemap → PASS', () => {
    expect(m.checks.sitemap).toBe('PASS')
  })

  it('routes privées bloquées → privateRoutesNoindex PASS', () => {
    expect(m.checks.privateRoutesNoindex).toBe('PASS')
    expect(PRIVATE_ROUTE_FACTS.length).toBeGreaterThan(0)
  })

  it('jsonLd = WARN (gap Event honnête sur /evenements, non inventé)', () => {
    expect(m.checks.jsonLd).toBe('WARN')
    const ev = m.routes.find((r) => r.route === '/evenements')
    expect(ev?.structuredData).toBe('WARN')
  })

  it('toutes les routes importantes sont indexables', () => {
    expect(m.summary.indexable).toBe(IMPORTANT_ROUTES.length)
  })
})
