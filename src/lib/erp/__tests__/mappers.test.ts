import { describe, it, expect } from 'vitest'
import { mapOrganizationRow, mapOrganizationMembershipRow } from '../organization-mapper'
import {
  mapProfileRoleToMembershipRole,
  mapProfileStatutToMembershipStatus,
  mapProfileStatutToIsDefault,
} from '../map-profile-to-membership'

describe('Lot 1 — organization-mapper', () => {
  it('mappe une organization row SQL vers Core', () => {
    const o = mapOrganizationRow({
      id: 'org-1',
      name: 'Chapelle',
      slug: 'chapelle-du-royaume',
      status: 'active',
      country: 'CI',
      timezone: 'Africa/Abidjan',
      default_locale: 'fr',
      default_currency: 'XOF',
      logo_url: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    })
    expect(o).toEqual({
      id: 'org-1',
      name: 'Chapelle',
      slug: 'chapelle-du-royaume',
      status: 'active',
      country: 'CI',
      timezone: 'Africa/Abidjan',
      defaultLocale: 'fr',
      defaultCurrency: 'XOF',
      logoUrl: null,
      createdBy: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('mappe membership + nullables', () => {
    const m = mapOrganizationMembershipRow({
      id: 'm1',
      organization_id: 'org-1',
      user_id: 'u1',
      membership_role: 'owner',
      status: 'active',
      is_default: true,
      joined_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(m?.organizationId).toBe('org-1')
    expect(m?.userId).toBe('u1')
    expect(m?.membershipRole).toBe('owner')
    expect(m?.isDefault).toBe(true)
  })

  it('rejette status SQL invalide', () => {
    expect(
      mapOrganizationRow({
        id: 'x',
        name: 'n',
        slug: 's',
        status: 'ACTIF',
        country: null,
        timezone: 't',
        default_locale: 'fr',
        default_currency: 'XOF',
        logo_url: null,
        created_by: null,
        created_at: 't',
        updated_at: 't',
      }),
    ).toBeNull()
  })
})

describe('Lot 1 — map-profile-to-membership', () => {
  it('mappe les roles prouves', () => {
    expect(mapProfileRoleToMembershipRole('super_admin')).toBe('owner')
    expect(mapProfileRoleToMembershipRole('admin')).toBe('admin')
    expect(mapProfileRoleToMembershipRole('formateur')).toBe('staff')
    expect(mapProfileRoleToMembershipRole('pasteur')).toBe('staff')
    expect(mapProfileRoleToMembershipRole('nation_pastor')).toBe('staff')
    expect(mapProfileRoleToMembershipRole('membre')).toBe('member')
    expect(mapProfileRoleToMembershipRole('visiteur')).toBe('member')
    expect(mapProfileRoleToMembershipRole('inconnu')).toBe('member')
  })

  it('mappe statut profil', () => {
    expect(mapProfileStatutToMembershipStatus('actif')).toBe('active')
    expect(mapProfileStatutToIsDefault('actif')).toBe(true)
    expect(mapProfileStatutToMembershipStatus('en_attente')).toBe('invited')
    expect(mapProfileStatutToIsDefault('en_attente')).toBe(false)
    expect(mapProfileStatutToMembershipStatus('inactif')).toBe('suspended')
    expect(mapProfileStatutToMembershipStatus('suspendu')).toBe('suspended')
    expect(mapProfileStatutToMembershipStatus('???')).toBe('suspended')
    expect(mapProfileStatutToIsDefault(null)).toBe(false)
  })

  it('aucune permission implicite (fonctions pures de mapping seulement)', () => {
    expect(mapProfileRoleToMembershipRole('super_admin')).not.toBe('member')
    // mapping ne renvoie que des roles SaaS, pas de clés erp.*
    expect(mapProfileRoleToMembershipRole('admin')).toBe('admin')
  })
})
