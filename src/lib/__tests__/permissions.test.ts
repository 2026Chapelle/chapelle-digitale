import { describe, it, expect } from 'vitest'
import { can, getPermissions, canModifyRole, wouldRemoveLastSuperAdmin } from '@/lib/permissions'

describe('matrice de permissions par rôle', () => {
  it('super_admin et admin : tout', () => {
    for (const role of ['super_admin', 'admin']) {
      expect(can(role, 'can_access_admin')).toBe(true)
      expect(can(role, 'can_access_formateur_space')).toBe(true)
      expect(can(role, 'can_access_integration_space')).toBe(true)
      expect(can(role, 'can_access_national_dashboard')).toBe(true)
      expect(can(role, 'can_manage_roles')).toBe(true)
    }
  })

  it('formateur : espace formateur SEULEMENT', () => {
    expect(can('formateur', 'can_access_formateur_space')).toBe(true)
    expect(can('formateur', 'can_access_integration_space')).toBe(false)
    expect(can('formateur', 'can_access_national_dashboard')).toBe(false)
    expect(can('formateur', 'can_access_admin')).toBe(false)
  })

  it('responsable_integration : intégration SEULEMENT', () => {
    expect(can('responsable_integration', 'can_access_integration_space')).toBe(true)
    expect(can('responsable_integration', 'can_access_formateur_space')).toBe(false)
    expect(can('responsable_integration', 'can_access_national_dashboard')).toBe(false)
  })

  it('national (responsable/pasteur national, pasteur) : national SEULEMENT', () => {
    for (const role of ['responsable_national', 'pasteur_national', 'pasteur']) {
      expect(can(role, 'can_access_national_dashboard')).toBe(true)
      expect(can(role, 'can_access_formateur_space')).toBe(false)
      expect(can(role, 'can_access_integration_space')).toBe(false)
      expect(can(role, 'can_access_admin')).toBe(false)
    }
  })

  it('membre simple : aucun espace spécialisé', () => {
    for (const role of ['membre', 'visiteur', 'disciple', 'leader']) {
      expect(can(role, 'can_access_formateur_space')).toBe(false)
      expect(can(role, 'can_access_integration_space')).toBe(false)
      expect(can(role, 'can_access_national_dashboard')).toBe(false)
      expect(can(role, 'can_access_admin')).toBe(false)
      expect(can(role, 'can_view_all_parcours')).toBe(false)
    }
  })

  it('réponse pastorale (can_respond_pastoral) : rôles pastoraux + admins, PAS un membre simple', () => {
    // Acquis : seuls les acteurs pastoraux peuvent répondre aux demandes.
    for (const role of ['super_admin', 'admin', 'pasteur', 'pasteur_national', 'responsable_national']) {
      expect(can(role, 'can_respond_pastoral')).toBe(true)
    }
    // Le berger (axe spirituel) peut répondre (soin des âmes) mais reste non-admin.
    expect(can('berger', 'can_respond_pastoral')).toBe(true)
    expect(can({ role: 'membre', membre_statut: 'berger' }, 'can_respond_pastoral')).toBe(true)
    expect(can('berger', 'can_access_admin')).toBe(false)
    // Membres simples : interdits.
    for (const role of ['membre', 'visiteur', 'disciple', 'leader', 'formateur', 'responsable_integration']) {
      expect(can(role, 'can_respond_pastoral')).toBe(false)
    }
  })

  it('berger : accès parcours total SANS droit admin (rôle ou statut)', () => {
    expect(can('berger', 'can_view_all_parcours')).toBe(true)
    expect(can('berger', 'can_override_parcours_locks')).toBe(true)
    expect(can('berger', 'can_access_admin')).toBe(false)
    // override via statut spirituel même si le rôle fonctionnel est « membre »
    const ctx = { role: 'membre', membre_statut: 'berger' }
    expect(can(ctx, 'can_override_parcours_locks')).toBe(true)
    expect(can(ctx, 'can_access_admin')).toBe(false)
    expect(getPermissions(ctx).has('can_view_all_parcours')).toBe(true)
  })
})

describe('canModifyRole (seul super_admin touche un privilégié)', () => {
  it('super_admin peut tout', () => {
    expect(canModifyRole(true, 'admin', 'membre')).toBe(true)
    expect(canModifyRole(true, 'membre', 'super_admin')).toBe(true)
  })
  it('non super_admin : interdit de toucher/promouvoir un privilégié', () => {
    expect(canModifyRole(false, 'admin', 'membre')).toBe(false)
    expect(canModifyRole(false, 'membre', 'admin')).toBe(false)
    expect(canModifyRole(false, 'super_admin', 'membre')).toBe(false)
  })
  it('non super_admin : autorisé entre rôles non privilégiés', () => {
    expect(canModifyRole(false, 'membre', 'formateur')).toBe(true)
    expect(canModifyRole(false, 'formateur', 'responsable_integration')).toBe(true)
  })
})

describe('wouldRemoveLastSuperAdmin', () => {
  it('bloque si dernier super_admin', () => {
    expect(wouldRemoveLastSuperAdmin('super_admin', 'admin', 1)).toBe(true)
  })
  it('autorise s’il en reste d’autres', () => {
    expect(wouldRemoveLastSuperAdmin('super_admin', 'admin', 2)).toBe(false)
  })
  it('non concerné si la cible n’est pas super_admin ou reste super_admin', () => {
    expect(wouldRemoveLastSuperAdmin('admin', 'membre', 1)).toBe(false)
    expect(wouldRemoveLastSuperAdmin('super_admin', 'super_admin', 1)).toBe(false)
  })
})
