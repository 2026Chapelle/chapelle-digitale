import { describe, it, expect } from 'vitest'
import {
  requireOrganizationId,
  stripClientOrganizationId,
  OrganizationIdError,
} from '../newcomer-organization-id'

describe('Lot 2-A — requireOrganizationId', () => {
  it('refuse null / undefined / non-string', () => {
    expect(() => requireOrganizationId(null)).toThrow(OrganizationIdError)
    expect(() => requireOrganizationId(undefined)).toThrow(OrganizationIdError)
    expect(() => requireOrganizationId(42)).toThrow(OrganizationIdError)
    expect(() => requireOrganizationId({})).toThrow(OrganizationIdError)
  })

  it('refuse chaîne vide ou blanc', () => {
    expect(() => requireOrganizationId('')).toThrow(OrganizationIdError)
    expect(() => requireOrganizationId('   ')).toThrow(OrganizationIdError)
  })

  it('accepte un id non vide et trim', () => {
    expect(requireOrganizationId('  org-canon  ')).toBe('org-canon')
  })
})

describe('Lot 2-A — stripClientOrganizationId', () => {
  it('retire organization_id et organizationId sans toucher le reste', () => {
    const out = stripClientOrganizationId({
      prenom: 'A',
      organization_id: 'evil-org',
      organizationId: 'evil-org-2',
      telephone: '01',
    })
    expect(out).toEqual({ prenom: 'A', telephone: '01' })
    expect('organization_id' in out).toBe(false)
    expect('organizationId' in out).toBe(false)
  })
})
