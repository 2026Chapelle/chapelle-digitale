/**
 * CITADELLE INTELLIGENCE HUB — SEO · 5A · Agrégateur : portée & étiquetage
 *
 * Teste les HELPERS PURS de l'agrégateur (aucun réseau) : `server-only` est
 * stubé par vitest.config, si bien que le module route est importable. On ne
 * déclenche jamais GET() (pas d'appel Google) : on cible parseSeoScope +
 * annotatePagesScope + annotateOpportunitiesScope.
 */

import { describe, it, expect } from 'vitest'
import {
  parseSeoScope,
  annotatePagesScope,
  annotateOpportunitiesScope,
} from '@/lib/intelligence/seo/scope-aggregate'
import type { GscPageRow, SeoOpportunity, SitemapInfo } from '@/lib/intelligence/seo/types'

describe('parseSeoScope — défaut citadelle', () => {
  it('valeurs valides conservées', () => {
    expect(parseSeoScope('citadelle')).toBe('citadelle')
    expect(parseSeoScope('institutional')).toBe('institutional')
    expect(parseSeoScope('global')).toBe('global')
  })
  it('null / vide / inconnu / external_or_unknown → défaut citadelle', () => {
    expect(parseSeoScope(null)).toBe('citadelle')
    expect(parseSeoScope(undefined)).toBe('citadelle')
    expect(parseSeoScope('bogus')).toBe('citadelle')
    expect(parseSeoScope('external_or_unknown')).toBe('citadelle')
  })
})

const page = (p: string): GscPageRow => ({
  page: p,
  clicks: 1,
  impressions: 10,
  ctr: 0.1,
  position: 5,
})

describe('annotatePagesScope — classe par hôte réel', () => {
  it('pages Citadelle vs institutionnelle vs chemin relatif', () => {
    const rows = annotatePagesScope([
      page('https://citadelle.chapelleduroyaume.org/formations'),
      page('https://chapelleduroyaume.org/'),
      page('/relatif'),
    ]) as Array<GscPageRow & { host?: string; scope?: string }>
    expect(rows[0].scope).toBe('citadelle')
    expect(rows[0].host).toBe('citadelle.chapelleduroyaume.org')
    expect(rows[1].scope).toBe('institutional')
    expect(rows[1].host).toBe('chapelleduroyaume.org')
    // Chemin relatif : non rattaché à un actif connu → jamais « citadelle ».
    expect(rows[2].scope).toBe('external_or_unknown')
  })
})

const sitemapIssue = (subject: string): SeoOpportunity => ({
  kind: 'SITEMAP_ISSUE',
  severity: 'high',
  subject,
  why: 'x',
  evidence: 'y',
  action: 'z',
})

describe('annotateOpportunitiesScope — le sitemap institutionnel n’est pas un problème Citadelle', () => {
  const sitemaps: SitemapInfo[] = [
    { path: 'https://citadelle.chapelleduroyaume.org/sitemap.xml', scope: 'citadelle', host: 'citadelle.chapelleduroyaume.org' },
    { path: 'https://chapelleduroyaume.org/sitemap_index.xml', scope: 'institutional', host: 'chapelleduroyaume.org', errors: 1 },
  ]

  it('SITEMAP_ISSUE hérite la portée du sitemap concerné (institutionnel)', () => {
    const [o] = annotateOpportunitiesScope(
      [sitemapIssue('https://chapelleduroyaume.org/sitemap_index.xml')],
      sitemaps,
    )
    expect(o.scope).toBe('institutional')
    expect(o.host).toBe('chapelleduroyaume.org')
  })

  it('SITEMAP_ISSUE Citadelle reste citadelle', () => {
    const [o] = annotateOpportunitiesScope(
      [sitemapIssue('https://citadelle.chapelleduroyaume.org/sitemap.xml')],
      sitemaps,
    )
    expect(o.scope).toBe('citadelle')
  })

  it('portée déjà fournie : inchangée (idempotent)', () => {
    const pre: SeoOpportunity = { ...sitemapIssue('https://chapelleduroyaume.org/sitemap_index.xml'), scope: 'global' }
    const [o] = annotateOpportunitiesScope([pre], sitemaps)
    expect(o.scope).toBe('global')
  })

  it('opportunité basée sur une requête (sujet non-URL) : portée non inventée', () => {
    const q: SeoOpportunity = {
      kind: 'HIGH_IMPRESSIONS_LOW_CTR',
      severity: 'medium',
      subject: 'chapelle du royaume',
      why: 'x',
      evidence: 'y',
      action: 'z',
    }
    const [o] = annotateOpportunitiesScope([q], sitemaps)
    expect(o.scope).toBeUndefined()
  })

  it('opportunité sur URL Citadelle (page) : portée classée citadelle', () => {
    const p: SeoOpportunity = {
      kind: 'DECLINING_PAGE',
      severity: 'high',
      subject: 'https://citadelle.chapelleduroyaume.org/podcast',
      why: 'x',
      evidence: 'y',
      action: 'z',
    }
    const [o] = annotateOpportunitiesScope([p], sitemaps)
    expect(o.scope).toBe('citadelle')
    expect(o.host).toBe('citadelle.chapelleduroyaume.org')
  })
})
