import { describe, it, expect } from 'vitest'
import { isAdminCapable, ADMIN_ACCESS_PERMISSION } from '@/lib/admin/admin-access'
import { can } from '@/lib/permissions'

describe('isAdminCapable — décision serveur d’accès admin', () => {
  it('super_admin et admin → true', () => {
    expect(isAdminCapable('super_admin')).toBe(true)
    expect(isAdminCapable('admin')).toBe(true)
  })
  it('rôles non-admin → false (aucun accès admin)', () => {
    for (const role of ['formateur', 'responsable_integration', 'responsable_national', 'pasteur_national', 'pasteur', 'berger', 'leader', 'disciple', 'membre', 'visiteur']) {
      expect(isAdminCapable(role)).toBe(false)
    }
  })
  it('rôle absent / vide / inconnu → false', () => {
    expect(isAdminCapable(null)).toBe(false)
    expect(isAdminCapable(undefined)).toBe(false)
    expect(isAdminCapable('')).toBe(false)
    expect(isAdminCapable('   ')).toBe(false)
    expect(isAdminCapable('role_bidon')).toBe(false)
  })
  it('cohérent avec la source de vérité permissions.can(can_access_admin)', () => {
    for (const role of ['super_admin', 'admin', 'formateur', 'membre']) {
      expect(isAdminCapable(role)).toBe(can(role, ADMIN_ACCESS_PERMISSION))
    }
  })
})
