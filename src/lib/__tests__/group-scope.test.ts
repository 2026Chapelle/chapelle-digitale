import { describe, it, expect } from 'vitest'
import { resolveGroupScope } from '@/lib/group-scope'

describe('resolveGroupScope (RBAC communauté)', () => {
  it('admin / super_admin → portée globale', () => {
    expect(resolveGroupScope({ role: 'admin' })).toBe('all')
    expect(resolveGroupScope({ role: 'super_admin' })).toBe('all')
    // admin avec affectation nation reste global (admin prioritaire)
    expect(resolveGroupScope({ role: 'admin', hasNationAssignment: true })).toBe('all')
  })

  it('responsable / pasteur national → périmètre national', () => {
    expect(resolveGroupScope({ role: 'responsable_national' })).toBe('nation')
    expect(resolveGroupScope({ role: 'pasteur_national' })).toBe('nation')
    expect(resolveGroupScope({ role: 'pasteur' })).toBe('nation')
  })

  it('affectation nation (même sans rôle national) → périmètre national', () => {
    expect(resolveGroupScope({ role: 'membre', hasNationAssignment: true })).toBe('nation')
  })

  it('responsable_integration → ses cellules assignées', () => {
    expect(resolveGroupScope({ role: 'responsable_integration' })).toBe('assigned')
  })

  it('membre simple / inconnu → refusé', () => {
    expect(resolveGroupScope({ role: 'membre' })).toBe('denied')
    expect(resolveGroupScope({ role: 'disciple' })).toBe('denied')
    expect(resolveGroupScope({ role: 'leader' })).toBe('denied') // leader local ≠ droit global
    expect(resolveGroupScope({ role: null })).toBe('denied')
  })
})
