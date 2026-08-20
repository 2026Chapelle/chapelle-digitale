import { describe, it, expect } from 'vitest'
import { normalizeAcquisitionSource, parseHost } from '../normalize'

describe('parseHost', () => {
  it('extrait l’hôte d’une URL, vide sinon', () => {
    expect(parseHost('https://www.youtube.com/watch?v=x')).toBe('www.youtube.com')
    expect(parseHost('facebook.com/page')).toBe('facebook.com')
    expect(parseHost('')).toBe('')
    expect(parseHost(null)).toBe('')
  })
})

describe('normalizeAcquisitionSource (règles d’attribution)', () => {
  it('UTM_SOURCE_WINS : un canal spécifique gagne même depuis un referrer interne', () => {
    expect(normalizeAcquisitionSource('whatsapp', 'https://citadelle.chapelleduroyaume.org/x')).toBe('whatsapp')
  })

  it('WHATSAPP / FACEBOOK / YOUTUBE / GOOGLE_ATTRIBUTION', () => {
    expect(normalizeAcquisitionSource('whatsapp', '')).toBe('whatsapp')
    expect(normalizeAcquisitionSource('facebook', '')).toBe('facebook')
    expect(normalizeAcquisitionSource('youtube', '')).toBe('youtube')
    expect(normalizeAcquisitionSource('google', '')).toBe('google')
  })

  it('EXTERNAL_REFERRER_DETECTED : un site externe inconnu reste referral', () => {
    expect(normalizeAcquisitionSource('referral', 'https://partenaire-externe.com/a')).toBe('referral')
  })

  it('INTERNAL_REFERRER_IGNORED : nav interne Citadelle → internal (exclu de l’attribution)', () => {
    expect(normalizeAcquisitionSource('referral', 'https://citadelle.chapelleduroyaume.org/podcast')).toBe('internal')
    expect(normalizeAcquisitionSource('referral', 'http://localhost:3000/parcours')).toBe('internal')
  })

  it('CHAPELLE_ATTRIBUTION : referrer chapelleduroyaume.org → chapelle', () => {
    expect(normalizeAcquisitionSource('referral', 'https://www.chapelleduroyaume.org/')).toBe('chapelle')
    expect(normalizeAcquisitionSource('referral', 'https://chapelleduroyaume.org/dons')).toBe('chapelle')
    expect(normalizeAcquisitionSource('chapelle', '')).toBe('chapelle')
  })

  it('DIRECT_DETECTED : aucun referrer → direct', () => {
    expect(normalizeAcquisitionSource('direct', '')).toBe('direct')
    expect(normalizeAcquisitionSource('direct', null)).toBe('direct')
  })

  it('UNKNOWN_SOURCE_TO_OTHER : utm arbitraire → other ; source vide/nulle → unknown (jamais direct)', () => {
    expect(normalizeAcquisitionSource('partenaire_promo_42', '')).toBe('other')
    expect(normalizeAcquisitionSource('', '')).toBe('unknown')
    expect(normalizeAcquisitionSource(null, '')).toBe('unknown')
    expect(normalizeAcquisitionSource(null, null)).toBe('unknown')
  })
})
