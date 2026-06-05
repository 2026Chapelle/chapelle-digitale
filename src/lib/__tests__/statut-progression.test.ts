import { describe, it, expect } from 'vitest'
import { rankOf, statutCibleForParcours, computeStatutUpgrade } from '@/lib/formations/statut-progression'

describe('rankOf', () => {
  it('ordonne les statuts', () => {
    expect(rankOf('visiteur')).toBeLessThan(rankOf('nouveau_membre'))
    expect(rankOf('nouveau_membre')).toBeLessThan(rankOf('membre_actif'))
    expect(rankOf('membre_actif')).toBeLessThan(rankOf('disciple'))
    expect(rankOf(undefined)).toBe(0)
  })
})

describe('statutCibleForParcours', () => {
  it('mappe les slugs d’intégration', () => {
    expect(statutCibleForParcours('nouveau-croyant')).toBe('nouveau_membre')
    expect(statutCibleForParcours('je-decouvre-la-maison')).toBe('membre_actif')
    expect(statutCibleForParcours('je-stabilise-ma-foi')).toBe('disciple')
    expect(statutCibleForParcours('je-deviens-disciple-actif')).toBe('disciple')
  })
  it('ignore les slugs inconnus', () => {
    expect(statutCibleForParcours('autre-formation')).toBeNull()
    expect(statutCibleForParcours(null)).toBeNull()
  })
})

describe('computeStatutUpgrade (monotone)', () => {
  it('fait monter un visiteur', () => {
    expect(computeStatutUpgrade('visiteur', 'nouveau-croyant')).toBe('nouveau_membre')
  })
  it('fait monter vers membre_actif puis disciple', () => {
    expect(computeStatutUpgrade('nouveau_membre', 'je-decouvre-la-maison')).toBe('membre_actif')
    expect(computeStatutUpgrade('membre_actif', 'je-stabilise-ma-foi')).toBe('disciple')
  })
  it('ne redescend jamais', () => {
    // Déjà disciple → terminer P1 ne le ramène pas à membre_actif
    expect(computeStatutUpgrade('disciple', 'je-decouvre-la-maison')).toBeNull()
    // Statut pastoral supérieur préservé
    expect(computeStatutUpgrade('leader_cellule', 'je-stabilise-ma-foi')).toBeNull()
    expect(computeStatutUpgrade('berger', 'je-deviens-disciple-actif')).toBeNull()
  })
  it('ne bouge pas si même niveau', () => {
    expect(computeStatutUpgrade('nouveau_membre', 'nouveau-croyant')).toBeNull()
  })
  it('ignore les slugs hors intégration', () => {
    expect(computeStatutUpgrade('visiteur', 'formation-libre')).toBeNull()
  })
})
