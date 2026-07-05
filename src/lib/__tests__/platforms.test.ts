import { describe, it, expect } from 'vitest'
import { PLATFORMS, platformLabel, isValidPlatform, resolvePlatformScope, aggregatePlatformMembers } from '@/lib/platforms'

const NOW = Date.parse('2026-06-05T12:00:00Z')

describe('référentiel plateformes', () => {
  it('contient les 8 plateformes officielles', () => {
    expect(PLATFORMS.length).toBe(8)
    expect(PLATFORMS.map((p) => p.label)).toEqual(expect.arrayContaining([
      'CIER', 'Mahanaïm', 'Familles de la Chapelle', "Femmes d'Exceptions",
      'Jeunesse de la Chapelle', 'Cité du Refuge', 'CFIC', 'Académie des Élus',
    ]))
  })
  it('platformLabel / isValidPlatform', () => {
    expect(platformLabel('cier')).toBe('CIER')
    expect(platformLabel('chapelle-familiale')).toBe('Académie des Élus')
    expect(platformLabel('inconnu')).toBe('inconnu')
    expect(isValidPlatform('cfic')).toBe(true)
    expect(isValidPlatform('reseau-social')).toBe(false)
  })
})

describe('resolvePlatformScope (RBAC)', () => {
  it('admin / super_admin → all', () => {
    expect(resolvePlatformScope({ role: 'admin' })).toBe('all')
    expect(resolvePlatformScope({ role: 'super_admin' })).toBe('all')
  })
  it('national (rôle ou affectation) → nation', () => {
    expect(resolvePlatformScope({ role: 'responsable_national' })).toBe('nation')
    expect(resolvePlatformScope({ role: 'pasteur_national' })).toBe('nation')
    expect(resolvePlatformScope({ role: 'membre', hasNationAssignment: true })).toBe('nation')
  })
  it('membre simple / inconnu → denied', () => {
    expect(resolvePlatformScope({ role: 'membre' })).toBe('denied')
    expect(resolvePlatformScope({ role: 'leader' })).toBe('denied')
    expect(resolvePlatformScope({ role: null })).toBe('denied')
  })
})

describe('aggregatePlatformMembers', () => {
  it('agrège membres / engagement moyen / actifs / rétention par plateforme', () => {
    const rows = [
      { plateforme_principale: 'cier', score_engagement: 80, derniere_connexion: '2026-06-04T10:00:00Z' }, // actif
      { plateforme_principale: 'cier', score_engagement: 40, derniere_connexion: '2026-01-01T10:00:00Z' }, // inactif (>30j)
      { plateforme_principale: 'cfic', score_engagement: 60, derniere_connexion: '2026-06-01T10:00:00Z' }, // actif
    ]
    const m = aggregatePlatformMembers(rows, NOW)
    expect(m.get('cier')).toEqual({ membres: 2, engagement_moyen: 60, actifs: 1, retention: 50 })
    expect(m.get('cfic')).toEqual({ membres: 1, engagement_moyen: 60, actifs: 1, retention: 100 })
  })
  it('plateforme nulle → clé «—» ; liste vide → map vide', () => {
    expect(aggregatePlatformMembers([{ plateforme_principale: null, score_engagement: 0, derniere_connexion: null }], NOW).get('—')?.membres).toBe(1)
    expect(aggregatePlatformMembers([], NOW).size).toBe(0)
  })
})
