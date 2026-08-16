import { describe, it, expect } from 'vitest'
import {
  resolveActiveOrganizationFromData,
  createActiveOrganizationResolver,
  type Organization,
  type OrganizationMembership,
} from '@/core/erp'

function org(partial: Partial<Organization> & Pick<Organization, 'id'>): Organization {
  return {
    name: 'Org',
    slug: partial.id,
    status: 'active',
    country: 'CI',
    timezone: 'Africa/Abidjan',
    defaultLocale: 'fr',
    defaultCurrency: 'XOF',
    logoUrl: null,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function mem(
  partial: Partial<OrganizationMembership> &
    Pick<OrganizationMembership, 'id' | 'organizationId' | 'userId'>,
): OrganizationMembership {
  return {
    membershipRole: 'member',
    status: 'active',
    isDefault: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const NOW = '2026-07-15T22:00:00.000Z'

describe('Lot 1 — resolveActiveOrganizationFromData', () => {
  it('user absent -> null', () => {
    expect(
      resolveActiveOrganizationFromData(
        { userId: null },
        { memberships: [], organizations: [] },
        NOW,
      ),
    ).toBeNull()
  })

  it('membership absent -> null', () => {
    expect(
      resolveActiveOrganizationFromData(
        { userId: 'u1' },
        { memberships: [], organizations: [org({ id: 'o1' })] },
        NOW,
      ),
    ).toBeNull()
  })

  it('exclut invited / suspended / removed', () => {
    for (const status of ['invited', 'suspended', 'removed'] as const) {
      expect(
        resolveActiveOrganizationFromData(
          { userId: 'u1' },
          {
            memberships: [mem({ id: 'm1', organizationId: 'o1', userId: 'u1', status })],
            organizations: [org({ id: 'o1' })],
          },
          NOW,
        ),
      ).toBeNull()
    }
  })

  it('exclut organisation suspended / archived', () => {
    for (const status of ['suspended', 'archived'] as const) {
      expect(
        resolveActiveOrganizationFromData(
          { userId: 'u1' },
          {
            memberships: [mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: true })],
            organizations: [org({ id: 'o1', status })],
          },
          NOW,
        ),
      ).toBeNull()
    }
  })

  it('default actif selectionne', () => {
    const r = resolveActiveOrganizationFromData(
      { userId: 'u1' },
      {
        memberships: [
          mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: false }),
          mem({ id: 'm2', organizationId: 'o2', userId: 'u1', isDefault: true }),
        ],
        organizations: [org({ id: 'o1' }), org({ id: 'o2', slug: 'deux' })],
      },
      NOW,
    )
    expect(r?.organization.id).toBe('o2')
    expect(r?.source).toBe('default_membership')
    expect(r?.resolvedAt).toBe(NOW)
  })

  it('exactement une active sans default selectionne', () => {
    const r = resolveActiveOrganizationFromData(
      { userId: 'u1' },
      {
        memberships: [mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: false })],
        organizations: [org({ id: 'o1' })],
      },
      NOW,
    )
    expect(r?.organization.id).toBe('o1')
  })

  it('deux actives sans default -> null', () => {
    expect(
      resolveActiveOrganizationFromData(
        { userId: 'u1' },
        {
          memberships: [
            mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: false }),
            mem({ id: 'm2', organizationId: 'o2', userId: 'u1', isDefault: false }),
          ],
          organizations: [org({ id: 'o1' }), org({ id: 'o2' })],
        },
        NOW,
      ),
    ).toBeNull()
  })

  it('deux defaults actifs valides -> null (jamais le premier trouve)', () => {
    const orgs = [org({ id: 'o1' }), org({ id: 'o2', slug: 'o2' })]
    const memsOrderA = [
      mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: true }),
      mem({ id: 'm2', organizationId: 'o2', userId: 'u1', isDefault: true }),
    ]
    const memsOrderB = [
      mem({ id: 'm2', organizationId: 'o2', userId: 'u1', isDefault: true }),
      mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: true }),
    ]
    expect(
      resolveActiveOrganizationFromData(
        { userId: 'u1' },
        { memberships: memsOrderA, organizations: orgs },
        NOW,
      ),
    ).toBeNull()
    expect(
      resolveActiveOrganizationFromData(
        { userId: 'u1' },
        { memberships: memsOrderB, organizations: orgs },
        NOW,
      ),
    ).toBeNull()
  })

  it('default sur org inactive ignore; autre unique active prise', () => {
    const r = resolveActiveOrganizationFromData(
      { userId: 'u1' },
      {
        memberships: [
          mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: true }),
          mem({ id: 'm2', organizationId: 'o2', userId: 'u1', isDefault: false }),
        ],
        organizations: [org({ id: 'o1', status: 'suspended' }), org({ id: 'o2' })],
      },
      NOW,
    )
    expect(r?.organization.id).toBe('o2')
  })

  it('resolvedAt deterministe (horloge injectee)', async () => {
    const resolver = createActiveOrganizationResolver(
      {
        loadForUser: async () => ({
          memberships: [mem({ id: 'm1', organizationId: 'o1', userId: 'u1', isDefault: true })],
          organizations: [org({ id: 'o1' })],
        }),
      },
      { nowIso: () => 'FIXED' },
    )
    const r = await resolver.resolve({ userId: 'u1' })
    expect(r?.resolvedAt).toBe('FIXED')
  })

  it('aucun fallback monolithe (slug chapelle ignore si pas de membership)', () => {
    expect(
      resolveActiveOrganizationFromData(
        { userId: 'u1' },
        {
          memberships: [],
          organizations: [org({ id: 'o1', slug: 'chapelle-du-royaume' })],
        },
        NOW,
      ),
    ).toBeNull()
  })
})
