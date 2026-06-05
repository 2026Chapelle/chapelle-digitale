import { describe, it, expect } from 'vitest'
import { resolveIntegrationScope } from '@/lib/integration-scope'

describe('resolveIntegrationScope (RBAC)', () => {
  it('admin / super_admin → visibilité globale', () => {
    expect(resolveIntegrationScope({ role: 'admin' })).toBe('all')
    expect(resolveIntegrationScope({ role: 'super_admin' })).toBe('all')
    // admin avec affectation nation reste global (admin prioritaire)
    expect(resolveIntegrationScope({ role: 'admin', hasNationAssignment: true })).toBe('all')
  })

  it('responsable / pasteur national → périmètre national', () => {
    expect(resolveIntegrationScope({ role: 'responsable_national' })).toBe('nation')
    expect(resolveIntegrationScope({ role: 'pasteur_national' })).toBe('nation')
    expect(resolveIntegrationScope({ role: 'pasteur' })).toBe('nation')
  })

  it('affectation nation (même sans rôle national) → périmètre national', () => {
    expect(resolveIntegrationScope({ role: 'membre', hasNationAssignment: true })).toBe('nation')
  })

  it('responsable_integration → ses membres assignés', () => {
    expect(resolveIntegrationScope({ role: 'responsable_integration' })).toBe('assigned')
  })

  it('membre simple / inconnu → refusé', () => {
    expect(resolveIntegrationScope({ role: 'membre' })).toBe('denied')
    expect(resolveIntegrationScope({ role: 'disciple' })).toBe('denied')
    expect(resolveIntegrationScope({ role: null })).toBe('denied')
  })
})
