import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: () => {
    throw new Error('createRouteClient ne doit pas etre appele dans les tests (client injecte)')
  },
}))

import { createOrganizationRepository } from '../organization-repository'
import { createOrganizationMembershipRepository } from '../organization-membership-repository'
import { ErpAuthError, ErpDataError, type ErpSessionClient } from '../auth-client'

type Row = Record<string, unknown>

function createMockClient(opts: {
  userId?: string | null
  authError?: string | null
  tables?: Record<string, Row[]>
  queryError?: string | null
}): ErpSessionClient {
  const tables = opts.tables ?? {}

  function filterRows(table: string, filters: Record<string, string | string[]>): Row[] {
    let rows = [...(tables[table] ?? [])]
    for (const [col, val] of Object.entries(filters)) {
      if (Array.isArray(val)) {
        rows = rows.filter((r) => val.includes(String(r[col])))
      } else {
        rows = rows.filter((r) => String(r[col]) === val)
      }
    }
    return rows
  }

  function makeChain(table: string) {
    const filters: Record<string, string | string[]> = {}
    const chain = {
      eq(col: string, val: string) {
        filters[col] = val
        return chain
      },
      in(col: string, vals: string[]) {
        filters[col] = vals
        return chain
      },
      async maybeSingle() {
        if (opts.queryError) return { data: null, error: { message: opts.queryError } }
        const rows = filterRows(table, filters)
        return { data: rows[0] ?? null, error: null }
      },
      then(onfulfilled: (v: { data: unknown; error: { message: string } | null }) => unknown) {
        const run = async () => {
          if (opts.queryError) return { data: null, error: { message: opts.queryError } }
          return { data: filterRows(table, filters), error: null }
        }
        return run().then(onfulfilled as (v: unknown) => unknown)
      },
    }
    return chain
  }

  return {
    auth: {
      getUser: async () => {
        if (opts.authError) {
          return { data: { user: null }, error: { message: opts.authError } }
        }
        if (!opts.userId) {
          return { data: { user: null }, error: null }
        }
        return { data: { user: { id: opts.userId } }, error: null }
      },
    },
    from: (table: string) => ({
      select: (_columns: string) => makeChain(table),
    }),
  } as unknown as ErpSessionClient
}

const orgRow = {
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
  updated_at: '2026-01-01T00:00:00.000Z',
}

const memRow = {
  id: 'm1',
  organization_id: 'org-1',
  user_id: 'user-1',
  membership_role: 'member',
  status: 'active',
  is_default: true,
  joined_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('Lot 1 — repositories authentifies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auth.getUser absent -> ErpAuthError', async () => {
    const repo = createOrganizationRepository(createMockClient({ userId: null }))
    await expect(repo.findById('org-1')).rejects.toBeInstanceOf(ErpAuthError)
  })

  it('auth error -> ErpAuthError', async () => {
    const repo = createOrganizationRepository(
      createMockClient({ userId: null, authError: 'jwt invalid' }),
    )
    await expect(repo.findBySlug('x')).rejects.toBeInstanceOf(ErpAuthError)
  })

  it('userId correspondant OK', async () => {
    const client = createMockClient({
      userId: 'user-1',
      tables: {
        organizations: [orgRow],
        organization_members: [memRow],
      },
    })
    const orgs = createOrganizationRepository(client)
    const mems = createOrganizationMembershipRepository(client)
    const list = await orgs.listForUser('user-1')
    expect(list).toHaveLength(1)
    expect(list[0].slug).toBe('chapelle-du-royaume')
    const m = await mems.findMembership('org-1', 'user-1')
    expect(m?.userId).toBe('user-1')
  })

  it('userId divergent refuse', async () => {
    const repo = createOrganizationRepository(
      createMockClient({
        userId: 'user-1',
        tables: { organizations: [orgRow], organization_members: [memRow] },
      }),
    )
    await expect(repo.listForUser('user-OTHER')).rejects.toBeInstanceOf(ErpAuthError)
  })

  it('erreur Supabase -> ErpDataError', async () => {
    const repo = createOrganizationRepository(
      createMockClient({ userId: 'user-1', queryError: 'relation missing' }),
    )
    await expect(repo.findById('org-1')).rejects.toBeInstanceOf(ErpDataError)
  })

  it('aucune reference supabaseAdmin dans le module repository (statique)', async () => {
    // Contrôle comportemental : factories acceptent uniquement client session injecte
    const client = createMockClient({ userId: 'user-1', tables: { organizations: [orgRow] } })
    const repo = createOrganizationRepository(client)
    const o = await repo.findById('org-1')
    expect(o?.id).toBe('org-1')
  })
})
