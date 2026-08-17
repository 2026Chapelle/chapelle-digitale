import { describe, it, expect } from 'vitest'
import {
  parsePodcastPromotion,
  PROMOTION_KIND_LABELS,
  type PromotionKind,
} from '@/lib/podcast/promotion'

describe('parsePodcastPromotion — FAIL-SAFE', () => {
  it('null si non-objet', () => {
    expect(parsePodcastPromotion(null)).toBeNull()
    expect(parsePodcastPromotion(undefined)).toBeNull()
    expect(parsePodcastPromotion('x')).toBeNull()
    expect(parsePodcastPromotion(42)).toBeNull()
    expect(parsePodcastPromotion([])).toBeNull()
  })
  it('null si ni titre ni image', () => {
    expect(parsePodcastPromotion({})).toBeNull()
    expect(parsePodcastPromotion({ cta_label: 'Voir', description: 'texte' })).toBeNull()
    expect(parsePodcastPromotion({ title: '   ' })).toBeNull()
  })
  it('ne lève jamais sur entrées hostiles', () => {
    expect(() => parsePodcastPromotion({ title: 123, image_url: {}, kind: [] })).not.toThrow()
    expect(parsePodcastPromotion({ title: 123, image_url: {} })).toBeNull()
  })
})

describe('parsePodcastPromotion — alias colonnes CMS + jsonb fusionné', () => {
  it('subtitle (colonne native) alimente eyebrow, comme parsePodcastHero', () => {
    const r = parsePodcastPromotion({ title: 'Formation', subtitle: 'Nouveau cycle' })
    expect(r?.eyebrow).toBe('Nouveau cycle')
  })
  it('eyebrow/label priment sur subtitle si présents', () => {
    expect(parsePodcastPromotion({ title: 'T', eyebrow: 'E', subtitle: 'S' })?.eyebrow).toBe('E')
    expect(parsePodcastPromotion({ title: 'T', label: 'L', subtitle: 'S' })?.eyebrow).toBe('L')
  })
  it('camelCase toléré (imageUrl / ctaLabel / ctaHref)', () => {
    const r = parsePodcastPromotion({ imageUrl: 'https://x/p.png', ctaLabel: 'Voir', ctaHref: '/x' })
    expect(r?.image).toBe('https://x/p.png')
    expect(r?.ctaLabel).toBe('Voir')
    expect(r?.ctaHref).toBe('/x')
  })
  it('kind posé dans le jsonb `data` fusionné par la page est bien lu', () => {
    // La page fusionne { ...row, ...row.data } → kind vient du jsonb (pas de colonne dédiée).
    const merged = { title: 'Partenariat', body: 'desc', kind: 'partenaire' }
    expect(parsePodcastPromotion(merged)?.kind).toBe('partenaire')
  })
})

describe('parsePodcastPromotion — mapping & défauts', () => {
  it('titre seul → ok, kind défaut decouvrir, autres champs null', () => {
    expect(parsePodcastPromotion({ title: 'Retraite 2026' })).toEqual({
      kind: 'decouvrir',
      eyebrow: null,
      title: 'Retraite 2026',
      description: null,
      image: null,
      ctaLabel: null,
      ctaHref: null,
    })
  })
  it('image seule → ok (titre vide)', () => {
    const p = parsePodcastPromotion({ image_url: '/promo.jpg' })
    expect(p).not.toBeNull()
    expect(p?.image).toBe('/promo.jpg')
    expect(p?.title).toBe('')
  })
  it('mappe tous les alias snake_case', () => {
    expect(parsePodcastPromotion({
      kind: 'partenaire',
      eyebrow: 'Nos partenaires',
      title: 'Éditions du Royaume',
      description: 'Des livres pour grandir',
      image_url: '/p.jpg',
      cta_label: 'Découvrir',
      cta_href: '/marketplace',
    })).toEqual({
      kind: 'partenaire',
      eyebrow: 'Nos partenaires',
      title: 'Éditions du Royaume',
      description: 'Des livres pour grandir',
      image: '/p.jpg',
      ctaLabel: 'Découvrir',
      ctaHref: '/marketplace',
    })
  })
  it('mappe les alias camelCase / secondaires (type, label, body, image)', () => {
    const p = parsePodcastPromotion({
      type: 'promotion',
      label: 'Campagne',
      title: 'Soutenez la mission',
      body: 'Votre don compte',
      image: '/don.jpg',
    })
    expect(p?.kind).toBe('promotion')
    expect(p?.eyebrow).toBe('Campagne')
    expect(p?.description).toBe('Votre don compte')
    expect(p?.image).toBe('/don.jpg')
  })
})

describe('parsePodcastPromotion — normalisation kind', () => {
  const kinds: PromotionKind[] = ['promotion', 'partenaire', 'decouvrir']
  for (const k of kinds) {
    it(`accepte le kind valide « ${k} »`, () => {
      expect(parsePodcastPromotion({ title: 'T', kind: k })?.kind).toBe(k)
    })
  }
  it('insensible à la casse et aux espaces', () => {
    expect(parsePodcastPromotion({ title: 'T', kind: '  Partenaire ' })?.kind).toBe('partenaire')
    expect(parsePodcastPromotion({ title: 'T', type: 'PROMOTION' })?.kind).toBe('promotion')
  })
  it('inconnu / absent → decouvrir', () => {
    expect(parsePodcastPromotion({ title: 'T', kind: 'sponsor' })?.kind).toBe('decouvrir')
    expect(parsePodcastPromotion({ title: 'T', kind: '' })?.kind).toBe('decouvrir')
    expect(parsePodcastPromotion({ title: 'T' })?.kind).toBe('decouvrir')
  })
})

describe('parsePodcastPromotion — trim & CTA', () => {
  it('trim les chaînes et map vide → null', () => {
    const p = parsePodcastPromotion({ title: '  Titre  ', description: '   ', cta_href: '  /x  ' })
    expect(p?.title).toBe('Titre')
    expect(p?.description).toBeNull()
    expect(p?.ctaHref).toBe('/x')
  })
  it('CTA présent', () => {
    const p = parsePodcastPromotion({ title: 'T', cta_label: 'Voir', cta_href: '/evenements' })
    expect(p?.ctaLabel).toBe('Voir')
    expect(p?.ctaHref).toBe('/evenements')
  })
  it('CTA absent → null/null', () => {
    const p = parsePodcastPromotion({ title: 'T' })
    expect(p?.ctaLabel).toBeNull()
    expect(p?.ctaHref).toBeNull()
  })
})

describe('PROMOTION_KIND_LABELS', () => {
  it('libellés FR', () => {
    expect(PROMOTION_KIND_LABELS).toEqual({
      promotion: 'Promotion',
      partenaire: 'Partenaire',
      decouvrir: 'À découvrir',
    })
  })
})
