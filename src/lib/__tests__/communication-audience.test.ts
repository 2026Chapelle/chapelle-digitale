import { describe, it, expect } from 'vitest'
import { matchesAudience, renderTemplate } from '@/lib/communication/audience'

const P = { role: 'membre', membre_statut: 'disciple', pays: 'France', plateforme_principale: 'cier' }

describe('matchesAudience', () => {
  it('cible vide = tous', () => {
    expect(matchesAudience(P, {})).toBe(true)
    expect(matchesAudience(P, null)).toBe(true)
    expect(matchesAudience(P, { roles: [], statuts: [] })).toBe(true)
  })
  it('filtre par rôle', () => {
    expect(matchesAudience(P, { roles: ['membre', 'formateur'] })).toBe(true)
    expect(matchesAudience(P, { roles: ['admin'] })).toBe(false)
  })
  it('filtre par statut spirituel / pays / plateforme', () => {
    expect(matchesAudience(P, { statuts: ['disciple'] })).toBe(true)
    expect(matchesAudience(P, { statuts: ['berger'] })).toBe(false)
    expect(matchesAudience(P, { pays: ['France'] })).toBe(true)
    expect(matchesAudience(P, { pays: ['RDC'] })).toBe(false)
    expect(matchesAudience(P, { plateformes: ['cier'] })).toBe(true)
    expect(matchesAudience(P, { plateformes: ['jeunesse'] })).toBe(false)
  })
  it('combine en ET', () => {
    expect(matchesAudience(P, { roles: ['membre'], pays: ['France'] })).toBe(true)
    expect(matchesAudience(P, { roles: ['membre'], pays: ['RDC'] })).toBe(false)
  })
})

describe('renderTemplate', () => {
  it('substitue les variables', () => {
    expect(renderTemplate('Bonjour {prenom} !', { prenom: 'Marie' })).toBe('Bonjour Marie !')
  })
  it('variable manquante → vide', () => {
    expect(renderTemplate('Bonjour {prenom} {nom}', { prenom: 'Marie' })).toBe('Bonjour Marie ')
  })
})
