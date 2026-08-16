import { describe, it, expect } from 'vitest'
import {
  buildOrganizationContext,
  isActiveOrganizationMembership,
  type Organization,
  type OrganizationMembership,
  type OrganizationSettings,
  type OrganizationContext,
  type CurrentOrganizationProvider,
  type ActiveOrganizationContext,
  type ErpPermissionKey,
} from '@/core/erp'

function org(partial: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Chapelle Test',
    slug: 'chapelle-test',
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

function membership(partial: Partial<OrganizationMembership> = {}): OrganizationMembership {
  return {
    id: 'mem-1',
    organizationId: 'org-1',
    userId: 'user-1',
    membershipRole: 'member',
    status: 'active',
    isDefault: true,
    joinedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function settings(partial: Partial<OrganizationSettings> = {}): OrganizationSettings {
  return {
    organizationId: 'org-1',
    branding: { displayName: 'Chapelle Test', logoUrl: null, primaryColor: null },
    locale: {
      country: 'CI',
      defaultLocale: 'fr',
      timezone: 'Africa/Abidjan',
      defaultCurrency: 'XOF',
    },
    notifications: { emailEnabled: true, pushEnabled: false, digestEnabled: false },
    pastoral: { newcomerFollowUpEnabled: false, defaultIntegrationTrack: null },
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const baseInput = {
  organization: org(),
  membership: membership(),
  source: 'default_membership' as const,
  resolvedAt: '2026-07-15T12:00:00.000Z',
  permissions: ['erp.org.read'] as const satisfies readonly ErpPermissionKey[],
  settings: settings(),
}

describe('Lot 0.6-A — OrganizationContext factory', () => {
  it('construit un contexte valide qui etend ActiveOrganizationContext', () => {
    const r = buildOrganizationContext(baseInput)
    expect(r.ok).toBe(true)
    if (!r.ok) return

    const ctx: OrganizationContext = r.context
    const active: ActiveOrganizationContext = {
      organization: ctx.organization,
      membership: ctx.membership,
      source: ctx.source,
      resolvedAt: ctx.resolvedAt,
    }
    expect(active.organization.id).toBe('org-1')
    expect(active.membership.userId).toBe('user-1')
    expect(active.source).toBe('default_membership')
    expect(active.resolvedAt).toBe('2026-07-15T12:00:00.000Z')
    expect(ctx.permissions).toEqual(['erp.org.read'])
    expect(ctx.settings.organizationId).toBe('org-1')
  })

  it('resolvedAt vide -> resolved_at_required', () => {
    const r = buildOrganizationContext({ ...baseInput, resolvedAt: '' })
    expect(r).toEqual({ ok: false, reason: 'resolved_at_required' })
  })

  it('organisation suspended -> organization_not_active', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      organization: org({ status: 'suspended' }),
    })
    expect(r).toEqual({ ok: false, reason: 'organization_not_active' })
  })

  it('organisation archived -> organization_not_active', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      organization: org({ status: 'archived' }),
    })
    expect(r).toEqual({ ok: false, reason: 'organization_not_active' })
  })

  it('membership invited -> membership_not_active', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      membership: membership({ status: 'invited' }),
    })
    expect(r).toEqual({ ok: false, reason: 'membership_not_active' })
  })

  it('membership suspended -> membership_not_active', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      membership: membership({ status: 'suspended' }),
    })
    expect(r).toEqual({ ok: false, reason: 'membership_not_active' })
  })

  it('membership removed -> membership_not_active', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      membership: membership({ status: 'removed' }),
    })
    expect(r).toEqual({ ok: false, reason: 'membership_not_active' })
  })

  it('membership.organizationId divergent -> membership_organization_mismatch', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      membership: membership({ organizationId: 'org-other' }),
    })
    expect(r).toEqual({ ok: false, reason: 'membership_organization_mismatch' })
  })

  it('settings.organizationId divergent -> settings_organization_mismatch', () => {
    const r = buildOrganizationContext({
      ...baseInput,
      settings: settings({ organizationId: 'org-other' }),
    })
    expect(r).toEqual({ ok: false, reason: 'settings_organization_mismatch' })
  })

  it('copie les permissions en readonly sans muter l entree', () => {
    const inputPerms: ErpPermissionKey[] = ['erp.org.read']
    const r = buildOrganizationContext({ ...baseInput, permissions: inputPerms })
    expect(r.ok).toBe(true)
    if (!r.ok) return

    inputPerms.push('erp.org.update')
    expect(r.context.permissions).toEqual(['erp.org.read'])
    expect(r.context.permissions).not.toContain('erp.org.update')
  })

  it('reutilise isActiveOrganizationMembership du Lot 0.5', () => {
    expect(isActiveOrganizationMembership(membership({ status: 'active' }))).toBe(true)
    expect(isActiveOrganizationMembership(membership({ status: 'invited' }))).toBe(false)
  })

  it('ne contient ni token, cookie, session ni client', () => {
    const r = buildOrganizationContext(baseInput)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.context).not.toHaveProperty('token')
    expect(r.context).not.toHaveProperty('cookie')
    expect(r.context).not.toHaveProperty('session')
    expect(r.context).not.toHaveProperty('supabase')
    expect(r.context).not.toHaveProperty('serviceRole')
  })

  it('CurrentOrganizationProvider est un contrat callable async', async () => {
    const stub: CurrentOrganizationProvider = {
      getCurrentOrganizationContext: async () => null,
    }
    expect(await stub.getCurrentOrganizationContext()).toBeNull()
  })

  it('n ajoute aucune permission automatique selon owner ou admin', () => {
    const asOwner = buildOrganizationContext({
      ...baseInput,
      membership: membership({ membershipRole: 'owner' }),
      permissions: [],
    })
    const asAdmin = buildOrganizationContext({
      ...baseInput,
      membership: membership({ membershipRole: 'admin' }),
      permissions: [],
    })
    const asMember = buildOrganizationContext({
      ...baseInput,
      membership: membership({ membershipRole: 'member' }),
      permissions: [],
    })
    expect(asOwner.ok && asOwner.context.permissions).toEqual([])
    expect(asAdmin.ok && asAdmin.context.permissions).toEqual([])
    expect(asMember.ok && asMember.context.permissions).toEqual([])
  })
})
