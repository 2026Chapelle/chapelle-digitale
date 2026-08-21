import { describe, it, expect } from 'vitest'
import {
  buildBreadcrumbJsonLd,
  homeBreadcrumb,
  buildWebPageJsonLd,
  buildFaqJsonLd,
  serializeJsonLd,
} from '../jsonld'

const BASE = 'https://citadelle.chapelleduroyaume.org'

describe('buildBreadcrumbJsonLd', () => {
  it('numérote les positions et absolutise les URLs', () => {
    const ld = buildBreadcrumbJsonLd(
      [
        { name: 'Accueil', path: '/' },
        { name: 'Servir', path: '/servir' },
      ],
      BASE,
    ) as any
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toHaveLength(2)
    expect(ld.itemListElement[0].position).toBe(1)
    expect(ld.itemListElement[0].item).toBe(`${BASE}/`)
    expect(ld.itemListElement[1].position).toBe(2)
    expect(ld.itemListElement[1].item).toBe(`${BASE}/servir`)
  })
})

describe('homeBreadcrumb', () => {
  it('produit un fil Accueil → page', () => {
    const ld = homeBreadcrumb('Parcours', '/parcours', BASE) as any
    expect(ld.itemListElement[0].name).toBe('Accueil')
    expect(ld.itemListElement[1].name).toBe('Parcours')
  })
})

describe('buildWebPageJsonLd', () => {
  it('inclut la description seulement si fournie', () => {
    const withDesc = buildWebPageJsonLd({ name: 'A', path: '/a', description: 'desc', base: BASE }) as any
    expect(withDesc.description).toBe('desc')
    const noDesc = buildWebPageJsonLd({ name: 'A', path: '/a', base: BASE }) as any
    expect(noDesc.description).toBeUndefined()
    expect(noDesc.url).toBe(`${BASE}/a`)
    expect(noDesc.inLanguage).toBe('fr-FR')
  })

  it('n’invente pas de description à partir d’une chaîne vide', () => {
    const ld = buildWebPageJsonLd({ name: 'A', path: '/a', description: '   ', base: BASE }) as any
    expect(ld.description).toBeUndefined()
  })
})

describe('buildFaqJsonLd', () => {
  it('ignore les paires vides et renvoie null si aucune valide', () => {
    expect(buildFaqJsonLd([])).toBeNull()
    expect(buildFaqJsonLd([{ question: '', answer: '' }])).toBeNull()
  })
  it('construit une FAQPage à partir de paires réelles', () => {
    const ld = buildFaqJsonLd([{ question: 'Q1 ?', answer: 'R1.' }]) as any
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(1)
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe('R1.')
  })
})

describe('serializeJsonLd', () => {
  it('produit un JSON valide', () => {
    const s = serializeJsonLd(homeBreadcrumb('Servir', '/servir', BASE))
    expect(() => JSON.parse(s)).not.toThrow()
  })
})
