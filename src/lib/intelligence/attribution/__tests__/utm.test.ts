import { describe, it, expect } from 'vitest'
import {
  deriveMedium,
  normalizeUtmBundle,
  normalizeUtmCampaign,
  normalizeUtmContent,
  normalizeUtmValue,
} from '../utm'

describe('normalizeUtmValue', () => {
  it('UTM_VALUES_NORMALIZED : trim + lowercase + borne', () => {
    expect(normalizeUtmValue('  WhatsApp  ', { max: 32, lowercase: true })).toBe('whatsapp')
  })

  it('EMPTY_UTM_TO_NULL : vide / whitespace / non-string → null', () => {
    expect(normalizeUtmValue('', { max: 32, lowercase: true })).toBeNull()
    expect(normalizeUtmValue('   ', { max: 32, lowercase: true })).toBeNull()
    expect(normalizeUtmValue(undefined, { max: 32, lowercase: true })).toBeNull()
    expect(normalizeUtmValue(42, { max: 32, lowercase: true })).toBeNull()
  })

  it('OVERSIZED_UTM_REJECTED_OR_TRUNCATED_SAFELY : tronqué à la borne', () => {
    const long = 'a'.repeat(200)
    expect(normalizeUtmValue(long, { max: 64, lowercase: true })).toHaveLength(64)
  })

  it('strip HTML/contrôle (anti stored-XSS admin)', () => {
    expect(normalizeUtmValue('<script>x', { max: 64, lowercase: true })).toBe('scriptx')
    expect(normalizeUtmValue('<>', { max: 64, lowercase: true })).toBeNull()
  })

  it('NO_PII : email et téléphone brut → null, mais campagne datée préservée', () => {
    expect(normalizeUtmValue('jean@example.com', { max: 64, lowercase: true })).toBeNull()
    expect(normalizeUtmValue('0748842415', { max: 64, lowercase: true })).toBeNull()
    expect(normalizeUtmValue('+225 07 48 84 24 15', { max: 64, lowercase: true })).toBeNull()
    // campagne datée = lettres + chiffres → conservée
    expect(normalizeUtmCampaign('Culte_20260823')).toBe('culte_20260823')
  })

  it('utm_content préserve la casse (variantes créa)', () => {
    expect(normalizeUtmContent('Banner_A')).toBe('Banner_A')
  })
})

describe('normalizeUtmBundle', () => {
  it('normalise les 5 champs', () => {
    const b = normalizeUtmBundle({ source: 'WhatsApp', medium: 'Channel', campaign: 'Culte_20260823', content: 'Main_CTA', term: 'GRACE' })
    expect(b).toEqual({ source: 'whatsapp', medium: 'channel', campaign: 'culte_20260823', content: 'Main_CTA', term: 'grace' })
  })
  it('champs absents → null', () => {
    expect(normalizeUtmBundle({})).toEqual({ source: null, medium: null, campaign: null, content: null, term: null })
    expect(normalizeUtmBundle(null)).toEqual({ source: null, medium: null, campaign: null, content: null, term: null })
  })
})

describe('deriveMedium (ensemble fermé)', () => {
  it('classe vers ATTRIBUTION_MEDIUMS avec défaut unknown', () => {
    expect(deriveMedium('cpc')).toBe('paid')
    expect(deriveMedium('channel')).toBe('social')
    expect(deriveMedium('seo')).toBe('organic')
    expect(deriveMedium('newsletter')).toBe('email')
    expect(deriveMedium('qr')).toBe('referral')
    expect(deriveMedium('none')).toBe('direct')
    expect(deriveMedium('')).toBe('unknown')
    expect(deriveMedium('truc-inconnu')).toBe('unknown')
  })
})
