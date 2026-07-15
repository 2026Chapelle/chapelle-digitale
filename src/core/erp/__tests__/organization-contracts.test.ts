import { describe, it, expect } from 'vitest'
import {
  ORGANIZATION_STATUSES,
  ORGANIZATION_MEMBERSHIP_ROLES,
  isOrganizationStatus,
  isOrganizationMembershipRole,
  isOrganizationMembershipStatus,
  isActiveOrganizationMembership,
  CHAPELLE_ORGANIZATION_SLUG,
  type OrganizationMembership,
  type OrganizationMembershipRole,
} from '@/core/erp'

describe('Core ERP — organization status', () => {
  it('reconnaît les statuts valides', () => {
    for (const s of ORGANIZATION_STATUSES) {
      expect(isOrganizationStatus(s)).toBe(true)
    }
  })

  it('rejette les statuts invalides', () => {
    expect(isOrganizationStatus('actif')).toBe(false)
    expect(isOrganizationStatus('ACTIVE')).toBe(false)
    expect(isOrganizationStatus('')).toBe(false)
    expect(isOrganizationStatus(null)).toBe(false)
    expect(isOrganizationStatus(undefined)).toBe(false)
    expect(isOrganizationStatus(1)).toBe(false)
  })
})

describe('Core ERP — membership roles', () => {
  it('reconnaît les rôles d’adhésion SaaS', () => {
    for (const r of ORGANIZATION_MEMBERSHIP_ROLES) {
      expect(isOrganizationMembershipRole(r)).toBe(true)
    }
  })

  it('rejette les rôles invalides ou hors périmètre SaaS', () => {
    expect(isOrganizationMembershipRole('super_admin')).toBe(false)
    expect(isOrganizationMembershipRole('formateur')).toBe(false)
    expect(isOrganizationMembershipRole('visiteur')).toBe(false)
    expect(isOrganizationMembershipRole('leader_cellule')).toBe(false)
    expect(isOrganizationMembershipRole('')).toBe(false)
  })
})

describe('Core ERP — membership status & actif', () => {
  it('reconnaît les statuts d’adhésion', () => {
    expect(isOrganizationMembershipStatus('active')).toBe(true)
    expect(isOrganizationMembershipStatus('invited')).toBe(true)
    expect(isOrganizationMembershipStatus('suspended')).toBe(true)
    expect(isOrganizationMembershipStatus('removed')).toBe(true)
    expect(isOrganizationMembershipStatus('left')).toBe(false)
  })

  function membership(partial: Partial<OrganizationMembership> & Pick<OrganizationMembership, 'status'>): OrganizationMembership {
    return {
      id: 'm1',
      organizationId: 'org1',
      userId: 'u1',
      membershipRole: 'member',
      isDefault: true,
      joinedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...partial,
    }
  }

  it('détermine un membership actif uniquement si status=active', () => {
    expect(isActiveOrganizationMembership(membership({ status: 'active' }))).toBe(true)
    expect(isActiveOrganizationMembership(membership({ status: 'invited' }))).toBe(false)
    expect(isActiveOrganizationMembership(membership({ status: 'suspended' }))).toBe(false)
    expect(isActiveOrganizationMembership(membership({ status: 'removed' }))).toBe(false)
    expect(isActiveOrganizationMembership(null)).toBe(false)
    expect(isActiveOrganizationMembership(undefined)).toBe(false)
  })
})

describe('Core ERP — séparation conceptuelle membershipRole vs profiles.role', () => {
  it('les rôles d’adhésion SaaS ne contiennent pas les rôles métier Citadelle', () => {
    const productRoles = [
      'super_admin',
      'admin',
      'formateur',
      'responsable_integration',
      'pasteur',
      'berger',
      'membre',
      'visiteur',
      'leader_cellule',
    ]
    for (const role of productRoles) {
      // Même si la chaîne "admin" existe dans les deux axes, le jeu SaaS est
      // owner|admin|staff|member — on vérifie l’absence des rôles métier hors liste.
      if (role === 'admin' || role === 'member') {
        expect(isOrganizationMembershipRole(role)).toBe(true)
      } else {
        expect(isOrganizationMembershipRole(role)).toBe(false)
      }
    }
  })

  it('membershipRole et profileRole coexistent sans fusion (types distincts conceptuellement)', () => {
    const membershipRole: OrganizationMembershipRole = 'staff'
    const profileRole = 'formateur'
    // Un staff SaaS peut être formateur métier : les deux axes restent orthogonaux.
    expect(isOrganizationMembershipRole(membershipRole)).toBe(true)
    expect(isOrganizationMembershipRole(profileRole)).toBe(false)
    expect(membershipRole).not.toBe(profileRole)
  })

  it('expose le slug Chapelle de référence sans lier le runtime', () => {
    expect(CHAPELLE_ORGANIZATION_SLUG).toBe('chapelle-du-royaume')
  })
})
