import { describe, it, expect } from 'vitest'
import { normalizePremiumOffer, premiumDeniedNotice } from '../premium-offer'

describe('normalizePremiumOffer (pas de faux bouton)', () => {
  it('lien http(s) valide → offre', () => {
    expect(normalizePremiumOffer({ lien_achat: 'https://chariow.example/premium', titre: 'Premium' }))
      .toEqual({ url: 'https://chariow.example/premium', titre: 'Premium' })
  })
  it('lien vide / relatif / invalide → pas d’offre (null)', () => {
    expect(normalizePremiumOffer({ lien_achat: '' })).toBeNull()
    expect(normalizePremiumOffer({ lien_achat: '/checkout' })).toBeNull()
    expect(normalizePremiumOffer({ lien_achat: 'javascript:alert(1)' })).toBeNull()
    expect(normalizePremiumOffer({ lien_achat: null })).toBeNull()
    expect(normalizePremiumOffer(null)).toBeNull()
  })
})

describe('premiumDeniedNotice', () => {
  it('avec offre réelle → message + CTA vers la destination', () => {
    const n = premiumDeniedNotice({ url: 'https://buy.example/x', titre: 'Premium' })
    expect(n.ctaUrl).toBe('https://buy.example/x')
    expect(n.ctaLabel).toBeTruthy()
  })
  it('sans offre → message neutre, AUCUN CTA', () => {
    const n = premiumDeniedNotice(null)
    expect(n.ctaUrl).toBeUndefined()
    expect(n.title).toBe('Contenu premium')
  })
  it('accès expiré/révoqué (lapsed) + offre → copie « n’est plus actif » + CTA réactiver', () => {
    const n = premiumDeniedNotice({ url: 'https://buy.example/x', titre: null }, { lapsed: true })
    expect(n.title).toBe('Accès Premium expiré')
    expect(n.message).toMatch(/n'est plus actif/i)
    expect(n.ctaUrl).toBe('https://buy.example/x')
    expect(n.ctaLabel).toMatch(/réactiver/i)
  })
  it('lapsed SANS offre → copie « n’est plus actif », AUCUN CTA (pas de faux bouton)', () => {
    const n = premiumDeniedNotice(null, { lapsed: true })
    expect(n.ctaUrl).toBeUndefined()
    expect(n.message).toMatch(/n'est plus actif/i)
  })
})
