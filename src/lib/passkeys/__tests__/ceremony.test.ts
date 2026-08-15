import { describe, it, expect } from 'vitest'
import { deriveRpId, deriveOrigin, isOriginAllowed, isRpIdAllowed } from '../ceremony'

describe('deriveRpId / deriveOrigin', () => {
  it('extrait le hostname (jamais scheme ni port)', () => {
    expect(deriveRpId('https://citadelle.chapelleduroyaume.org')).toBe('citadelle.chapelleduroyaume.org')
    expect(deriveRpId('http://localhost:3000')).toBe('localhost')
  })
  it('extrait l’origin complet', () => {
    expect(deriveOrigin('https://citadelle.chapelleduroyaume.org/x')).toBe('https://citadelle.chapelleduroyaume.org')
    expect(deriveOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })
  it('retombe proprement sur une valeur invalide', () => {
    expect(deriveRpId('pas-une-url')).toBe('localhost')
  })
})

describe('isOriginAllowed / isRpIdAllowed', () => {
  it('origin exact requis (sensibilité scheme/port)', () => {
    const allowed = 'https://citadelle.chapelleduroyaume.org'
    expect(isOriginAllowed('https://citadelle.chapelleduroyaume.org', allowed)).toBe(true)
    expect(isOriginAllowed('http://citadelle.chapelleduroyaume.org', allowed)).toBe(false)
    expect(isOriginAllowed('https://citadelle.chapelleduroyaume.org:8443', allowed)).toBe(false)
  })
  it('supporte une liste blanche d’origins', () => {
    expect(isOriginAllowed('http://localhost:3000', ['https://a.org', 'http://localhost:3000'])).toBe(true)
  })
  it('RP ID doit correspondre exactement', () => {
    expect(isRpIdAllowed('citadelle.chapelleduroyaume.org', 'citadelle.chapelleduroyaume.org')).toBe(true)
    expect(isRpIdAllowed('evil.org', 'citadelle.chapelleduroyaume.org')).toBe(false)
  })
})
