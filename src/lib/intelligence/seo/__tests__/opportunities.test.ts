/**
 * CITADELLE INTELLIGENCE HUB — SEO · Tests du détecteur d'opportunités (5A)
 *
 * Vérifie le MODÈLE DE PREUVE : chaque opportunité porte SOURCE + sujet +
 * PREUVE chiffrée + ACTION ; HÔTE/PORTÉE présents quand le sujet dérive d'une
 * URL ; un problème institutionnel est classé `institutional`, jamais
 * `citadelle`. Vérifie aussi les PROHIBITIONS (aucune opportunité issue d'une
 * donnée manquante / d'un 0 sans dénominateur / d'un partage de racine).
 */

import { describe, it, expect } from 'vitest'
import {
  detectOpportunities,
  SOURCE_GSC,
  SOURCE_TECHNICAL,
  type OpportunityInput,
} from '../opportunities'
import type {
  GscQueryRow,
  GscPageRow,
  SitemapInfo,
  TechnicalSeoMatrix,
  UrlInspectionResult,
} from '../types'

/* ------------------------------------------------------------------ */
/* Fabriques d'entrée minimales                                        */
/* ------------------------------------------------------------------ */

const q = (o: Partial<GscQueryRow> & { query: string }): GscQueryRow => ({
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
  ...o,
})

const page = (o: Partial<GscPageRow> & { page: string }): GscPageRow => ({
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
  ...o,
})

const techMatrix = (routes: TechnicalSeoMatrix['routes']): TechnicalSeoMatrix => ({
  generatedAt: '2026-08-22T00:00:00.000Z',
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
})

/* ------------------------------------------------------------------ */
/* PROHIBITIONS : la donnée absente ne fabrique jamais d'opportunité   */
/* ------------------------------------------------------------------ */

describe('detectOpportunities — prohibitions (aucune opportunité hors-sol)', () => {
  it('entrée totalement vide → aucune opportunité', () => {
    expect(detectOpportunities({})).toEqual([])
  })

  it('connecteurs présents mais sans lignes → aucune opportunité', () => {
    const input: OpportunityInput = {
      queries: [],
      pages: [],
      indexation: [],
      sitemaps: [],
      technical: null,
    }
    expect(detectOpportunities(input)).toEqual([])
  })

  it('requête « nouvelle » à 0 impression → PAS d’opportunité (absence ≠ preuve)', () => {
    const input: OpportunityInput = {
      queries: [q({ query: 'requete fantome', trend: 'new', impressions: 0 })],
    }
    const rising = detectOpportunities(input).filter((o) => o.kind === 'RISING_QUERY')
    expect(rising).toHaveLength(0)
  })

  it('requête « montante » réelle (impressions > 0) → opportunité générée', () => {
    const input: OpportunityInput = {
      queries: [q({ query: 'requete montante', trend: 'new', impressions: 42, position: 11 })],
    }
    const rising = detectOpportunities(input).filter((o) => o.kind === 'RISING_QUERY')
    expect(rising).toHaveLength(1)
    expect(rising[0].source).toBe(SOURCE_GSC)
  })

  it('CTR = 0 AVEC dénominateur (impressions ≥ 100) → preuve réelle, pas une absence', () => {
    // ctr:0 sur 250 impressions = signal réel (page vue, jamais cliquée),
    // à distinguer d'un « 0 sans contexte » (interdit).
    const input: OpportunityInput = {
      queries: [q({ query: 'chapelle royaume', impressions: 250, ctr: 0, position: 6, clicks: 0 })],
    }
    const hit = detectOpportunities(input).filter((o) => o.kind === 'HIGH_IMPRESSIONS_LOW_CTR')
    expect(hit).toHaveLength(1)
    expect(hit[0].evidence).toContain('250')
    expect(hit[0].source).toBe(SOURCE_GSC)
  })
})

/* ------------------------------------------------------------------ */
/* MODÈLE DE PREUVE : contrat SOURCE/WHAT/EVIDENCE/ACTION              */
/* ------------------------------------------------------------------ */

describe('detectOpportunities — contrat de preuve', () => {
  const richInput: OpportunityInput = {
    queries: [
      q({ query: 'faible ctr', impressions: 800, ctr: 0.005, position: 4 }),
      q({ query: 'a portee', impressions: 60, position: 9, clicks: 2 }),
      q({ query: 'montee', trend: 'up', delta: 1.2, impressions: 120, position: 7 }),
    ],
    pages: [
      page({
        page: 'https://citadelle.chapelleduroyaume.org/formations',
        clicks: 3,
        impressions: 300,
        position: 12,
        trend: 'down',
        delta: -0.5,
      }),
    ],
    indexation: [
      {
        url: 'https://citadelle.chapelleduroyaume.org/podcast',
        verdict: 'FAIL',
        coverageState: 'Crawled - currently not indexed',
      } as UrlInspectionResult,
      {
        url: 'https://citadelle.chapelleduroyaume.org/live',
        verdict: 'PASS',
        userCanonical: 'https://citadelle.chapelleduroyaume.org/live',
        googleCanonical: 'https://citadelle.chapelleduroyaume.org/autre',
      } as UrlInspectionResult,
    ],
    technical: techMatrix([
      {
        route: '/articles',
        indexable: true,
        title: 'FAIL',
        description: 'FAIL',
        canonical: 'PASS',
        structuredData: 'FAIL',
        inSitemap: true,
        robots: 'ALLOW',
        issues: [],
        severity: 'high',
      },
    ]),
  }

  it('CHAQUE opportunité porte source + subject + evidence + action non vides', () => {
    const out = detectOpportunities(richInput)
    expect(out.length).toBeGreaterThan(0)
    for (const o of out) {
      expect(typeof o.source).toBe('string')
      expect((o.source ?? '').length).toBeGreaterThan(0)
      expect(o.subject.trim().length).toBeGreaterThan(0)
      expect(o.evidence.trim().length).toBeGreaterThan(0)
      expect(o.action.trim().length).toBeGreaterThan(0)
      expect(o.why.trim().length).toBeGreaterThan(0)
    }
  })

  it('HÔTE + PORTÉE présents dès que le sujet est une URL absolue', () => {
    const out = detectOpportunities(richInput)
    // Sujets « URL absolue » (pages GSC) : host/scope obligatoires.
    const urlOpps = out.filter((o) => /^https?:\/\//i.test(o.subject))
    expect(urlOpps.length).toBeGreaterThan(0)
    for (const o of urlOpps) {
      expect(o.host).toBeTruthy()
      expect(o.scope).toBeTruthy()
    }
  })

  it('opportunités dérivées d’une URL (indexation/technique) portent aussi host+scope', () => {
    // UNINDEXED / CANONICAL / MISSING_* affichent un chemin comme sujet mais
    // conservent l'hôte réel classé (preuve rattachée à un actif identifié).
    const out = detectOpportunities(richInput).filter((o) =>
      ['UNINDEXED_IMPORTANT_PAGE', 'CANONICAL_MISMATCH', 'MISSING_METADATA', 'MISSING_STRUCTURED_DATA'].includes(
        o.kind,
      ),
    )
    expect(out.length).toBeGreaterThan(0)
    for (const o of out) {
      expect(o.host).toBe('citadelle.chapelleduroyaume.org')
      expect(o.scope).toBe('citadelle')
    }
  })

  it('sujet « requête » (non-URL) → host/scope ABSENTS (pas d’attribution inventée)', () => {
    const out = detectOpportunities(richInput).filter((o) =>
      ['HIGH_IMPRESSIONS_LOW_CTR', 'POSITION_4_TO_15', 'RISING_QUERY'].includes(o.kind),
    )
    expect(out.length).toBeGreaterThan(0)
    for (const o of out) {
      expect(o.host).toBeUndefined()
      expect(o.scope).toBeUndefined()
    }
  })

  it('page Citadelle en déclin → scope citadelle + host réel + source GSC', () => {
    const decl = detectOpportunities(richInput).find((o) => o.kind === 'DECLINING_PAGE')
    expect(decl).toBeDefined()
    expect(decl!.source).toBe(SOURCE_GSC)
    expect(decl!.host).toBe('citadelle.chapelleduroyaume.org')
    expect(decl!.scope).toBe('citadelle')
  })

  it('opportunités d’audit technique → source technical_audit', () => {
    const tech = detectOpportunities(richInput).filter(
      (o) => o.kind === 'MISSING_METADATA' || o.kind === 'MISSING_STRUCTURED_DATA',
    )
    expect(tech.length).toBeGreaterThan(0)
    for (const o of tech) expect(o.source).toBe(SOURCE_TECHNICAL)
  })
})

/* ------------------------------------------------------------------ */
/* PORTÉE : institutionnel ≠ Citadelle (sitemap_index.xml)             */
/* ------------------------------------------------------------------ */

describe('detectOpportunities — portée du sitemap institutionnel', () => {
  it('sitemap institutionnel en erreur → scope institutional, JAMAIS citadelle', () => {
    const sitemaps: SitemapInfo[] = [
      { path: 'https://chapelleduroyaume.org/sitemap_index.xml', errors: 3, warnings: 1 },
    ]
    const out = detectOpportunities({ sitemaps })
    const s = out.find((o) => o.kind === 'SITEMAP_ISSUE')
    expect(s).toBeDefined()
    expect(s!.scope).toBe('institutional')
    expect(s!.scope).not.toBe('citadelle')
    expect(s!.host).toBe('chapelleduroyaume.org')
    // La preuve est rattachée à l'hôte institutionnel, pas à Citadelle.
    expect(s!.evidence).toContain('chapelleduroyaume.org')
    expect(s!.source).toBe(SOURCE_GSC)
  })

  it('sitemap Citadelle en erreur → scope citadelle', () => {
    const sitemaps: SitemapInfo[] = [
      { path: 'https://citadelle.chapelleduroyaume.org/sitemap.xml', errors: 2 },
    ]
    const s = detectOpportunities({ sitemaps }).find((o) => o.kind === 'SITEMAP_ISSUE')
    expect(s).toBeDefined()
    expect(s!.scope).toBe('citadelle')
    expect(s!.host).toBe('citadelle.chapelleduroyaume.org')
  })

  it('partage de racine de domaine seul → n’implique JAMAIS citadelle', () => {
    // Un hôte institutionnel partage la racine `chapelleduroyaume.org` mais ne
    // doit pas être classé citadelle par ce simple fait.
    const sitemaps: SitemapInfo[] = [
      { path: 'https://www.chapelleduroyaume.org/sitemap.xml', errors: 1 },
    ]
    const s = detectOpportunities({ sitemaps }).find((o) => o.kind === 'SITEMAP_ISSUE')
    expect(s!.scope).toBe('institutional')
  })

  it('champs host/scope déjà normalisés (5A) → respectés tels quels', () => {
    const sitemaps: SitemapInfo[] = [
      {
        path: 'https://chapelleduroyaume.org/sitemap_index.xml',
        errors: 1,
        host: 'chapelleduroyaume.org',
        scope: 'institutional',
      },
    ]
    const s = detectOpportunities({ sitemaps }).find((o) => o.kind === 'SITEMAP_ISSUE')
    expect(s!.scope).toBe('institutional')
  })
})

/* ------------------------------------------------------------------ */
/* Déterminisme                                                        */
/* ------------------------------------------------------------------ */

describe('detectOpportunities — déterminisme', () => {
  it('même entrée → même sortie (fonction pure)', () => {
    const input: OpportunityInput = {
      queries: [q({ query: 'a', impressions: 500, ctr: 0.001, position: 5 })],
      sitemaps: [{ path: 'https://citadelle.chapelleduroyaume.org/sitemap.xml', errors: 1 }],
    }
    expect(JSON.stringify(detectOpportunities(input))).toBe(
      JSON.stringify(detectOpportunities(input)),
    )
  })
})
