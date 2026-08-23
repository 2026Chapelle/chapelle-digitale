/**
 * CITADELLE INTELLIGENCE HUB — SEO · 5A · Vérité d'HÔTE/PORTÉE (normalize)
 *
 * 100 % hors-ligne, pur. Vérifie que la couche de normalisation Search Console
 * TAGGE chaque sitemap / page / inspection par son HÔTE RÉEL et sa PORTÉE, sans
 * jamais inférer « citadelle » depuis la propriété de domaine.
 */

import { describe, it, expect } from 'vitest'
import { toSitemaps, toPageRows, toInspection, type RawSearchAnalyticsRow } from '../normalize'
import { classifyHost, classifyUrl } from '../../../seo/scope'

const CITADELLE_SITEMAP = 'https://citadelle.chapelleduroyaume.org/sitemap.xml'
const INSTITUTIONAL_SITEMAP = 'https://chapelleduroyaume.org/sitemap_index.xml'

describe('classification pure (rappel du contrat gelé)', () => {
  it('hôte Citadelle → citadelle', () => {
    expect(classifyHost('citadelle.chapelleduroyaume.org')).toBe('citadelle')
  })
  it('hôte institutionnel (+ www) → institutional', () => {
    expect(classifyHost('chapelleduroyaume.org')).toBe('institutional')
    expect(classifyHost('www.chapelleduroyaume.org')).toBe('institutional')
  })
  it('hôte inconnu / null → external_or_unknown', () => {
    expect(classifyHost('exemple-inconnu.com')).toBe('external_or_unknown')
    expect(classifyHost(null)).toBe('external_or_unknown')
  })
  it("une donnée du domaine institutionnel n'implique PAS la portée citadelle", () => {
    // La propriété GSC est sc-domain:chapelleduroyaume.org ; une URL sur l'hôte
    // institutionnel reste institutional, jamais rangée sous « citadelle ».
    expect(classifyUrl(INSTITUTIONAL_SITEMAP)).toBe('institutional')
    expect(classifyUrl(INSTITUTIONAL_SITEMAP)).not.toBe('citadelle')
  })
})

describe('toSitemaps — tag hôte/portée', () => {
  it('sitemap institutionnel → host=chapelleduroyaume.org, scope=institutional', () => {
    const [s] = toSitemaps({ sitemap: [{ path: INSTITUTIONAL_SITEMAP, errors: '1' }] })
    expect(s.host).toBe('chapelleduroyaume.org')
    expect(s.scope).toBe('institutional')
    expect(s.errors).toBe(1)
  })

  it('sitemap Citadelle → host=citadelle.chapelleduroyaume.org, scope=citadelle', () => {
    const [s] = toSitemaps({ sitemap: [{ path: CITADELLE_SITEMAP }] })
    expect(s.host).toBe('citadelle.chapelleduroyaume.org')
    expect(s.scope).toBe('citadelle')
  })

  it('chemin relatif (hôte non rattaché) → scope external_or_unknown', () => {
    // En pratique GSC renvoie des URL absolues ; un chemin relatif n'est
    // rattachable à aucun actif connu → jamais « citadelle ».
    const [s] = toSitemaps({ sitemap: [{ path: '/sitemap.xml' }] })
    expect(s.scope).toBe('external_or_unknown')
  })
})

describe('toPageRows — tag hôte/portée', () => {
  it('page Citadelle → scope citadelle ; page institutionnelle → institutional', () => {
    const cur: RawSearchAnalyticsRow[] = [
      { keys: ['https://citadelle.chapelleduroyaume.org/formations'], clicks: 9, impressions: 90, ctr: 0.1, position: 3 },
      { keys: ['https://chapelleduroyaume.org/'], clicks: 5, impressions: 50, ctr: 0.1, position: 4 },
    ]
    const rows = toPageRows(cur, [], 10)
    const cit = rows.find((r) => r.host === 'citadelle.chapelleduroyaume.org')!
    const inst = rows.find((r) => r.host === 'chapelleduroyaume.org')!
    expect(cit.scope).toBe('citadelle')
    expect(inst.scope).toBe('institutional')
  })
})

describe('toInspection — tag hôte/portée', () => {
  it('classe la portée depuis l’URL inspectée (jamais depuis la propriété)', () => {
    const cit = toInspection(CITADELLE_SITEMAP.replace('/sitemap.xml', '/'), {
      inspectionResult: { indexStatusResult: { verdict: 'PASS' } },
    })
    expect(cit.host).toBe('citadelle.chapelleduroyaume.org')
    expect(cit.scope).toBe('citadelle')
    expect(cit.verdict).toBe('PASS')

    const inst = toInspection('https://chapelleduroyaume.org/', {
      inspectionResult: { indexStatusResult: { verdict: 'PASS' } },
    })
    expect(inst.scope).toBe('institutional')
  })
})
