import { describe, it, expect } from 'vitest'
import {
  resolveCanonicalOrganizationId,
  resolveNewcomerAdminOrganizationId,
  resolvePublicNewcomerOrganizationId,
  NewcomerTenantScopeError,
  type OrgLookupClient,
} from '../newcomer-tenant-scope'
import { CHAPELLE_ORGANIZATION_SLUG } from '@/core/erp'

function mockOrgClient(rows: Array<{ id: string }>, error?: string): OrgLookupClient {
  return {
    from: (table: string) => {
      expect(table).toBe('organizations')
      return {
        select: (_c: string) => ({
          eq: (col: string, val: string) => {
            expect(col).toBe('slug')
            expect(val).toBe(CHAPELLE_ORGANIZATION_SLUG)
            return {
              limit: async (_n: number) => ({
                data: error ? null : rows,
                error: error ? { message: error } : null,
              }),
            }
          },
        }),
      }
    },
  }
}

describe('Lot 2-A — resolveCanonicalOrganizationId', () => {
  it('résout l’organisation canonique unique', async () => {
    const id = await resolveCanonicalOrganizationId(mockOrgClient([{ id: 'org-canon' }]))
    expect(id).toBe('org-canon')
  })

  it('échoue si absente', async () => {
    await expect(resolveCanonicalOrganizationId(mockOrgClient([]))).rejects.toThrow(
      NewcomerTenantScopeError,
    )
  })

  it('échoue si dupliquée', async () => {
    await expect(
      resolveCanonicalOrganizationId(mockOrgClient([{ id: 'a' }, { id: 'b' }])),
    ).rejects.toThrow(NewcomerTenantScopeError)
  })

  it('public et admin cier_admin partagent le scope canonique', async () => {
    const client = mockOrgClient([{ id: 'org-canon' }])
    const pub = await resolvePublicNewcomerOrganizationId(client)
    const adm = await resolveNewcomerAdminOrganizationId(client, { adminCookieOk: true })
    expect(pub).toBe('org-canon')
    expect(adm).toBe('org-canon')
  })

  it('admin sans cookie → Non autorisé', async () => {
    await expect(
      resolveNewcomerAdminOrganizationId(mockOrgClient([{ id: 'org-canon' }]), {
        adminCookieOk: false,
      }),
    ).rejects.toThrow(/Non autorisé/)
  })

  it('propage l’erreur du lookup canonique (client DB)', async () => {
    await expect(
      resolveCanonicalOrganizationId(mockOrgClient([], 'connection refused')),
    ).rejects.toThrow(NewcomerTenantScopeError)
    await expect(
      resolveCanonicalOrganizationId(mockOrgClient([], 'connection refused')),
    ).rejects.toThrow(/connection refused/)
  })
})
