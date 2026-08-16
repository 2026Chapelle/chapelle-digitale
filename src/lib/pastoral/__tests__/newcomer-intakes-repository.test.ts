import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('server-only', () => ({}))

import {
  createNewcomerIntakesRepository,
  type NewcomerDbClient,
} from '../newcomer-intakes-repository'
import { OrganizationIdError } from '../newcomer-organization-id'

type Row = Record<string, unknown>

/**
 * Mock PostgREST minimal : capture filters / insert / update pour prouver le scoping.
 */
function createMockDb(tables: Record<string, Row[]>) {
  const calls: Array<{
    op: string
    table: string
    filters: Record<string, string | string[]>
    row?: Row
    patch?: Row
  }> = []

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

  function makeSelectChain(table: string, op: string) {
    const filters: Record<string, string | string[]> = {}
    let orderCol: string | null = null
    let ascending = true
    let limitN: number | null = null
    let selectCols = '*'

    const chain: Record<string, unknown> = {
      eq(col: string, val: string) {
        filters[col] = val
        return chain
      },
      in(col: string, vals: string[]) {
        filters[col] = vals
        return chain
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col
        ascending = opts?.ascending !== false
        return chain
      },
      limit(n: number) {
        limitN = n
        return chain
      },
      select(cols: string) {
        selectCols = cols
        return chain
      },
      async single() {
        calls.push({ op: op + ':single', table, filters })
        const rows = filterRows(table, filters)
        if (!rows[0]) return { data: null, error: { message: 'not found' } }
        return { data: rows[0], error: null }
      },
      async maybeSingle() {
        calls.push({ op: op + ':maybeSingle', table, filters, patch: undefined })
        const rows = filterRows(table, filters)
        return { data: rows[0] ?? null, error: null }
      },
      then(onfulfilled: (v: { data: unknown; error: null }) => unknown) {
        return (async () => {
          calls.push({ op, table, filters })
          let rows = filterRows(table, filters)
          if (orderCol) {
            rows = [...rows].sort((a, b) => {
              const av = String(a[orderCol!] ?? '')
              const bv = String(b[orderCol!] ?? '')
              return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
            })
          }
          if (limitN != null) rows = rows.slice(0, limitN)
          void selectCols
          return { data: rows, error: null }
        })().then(onfulfilled as (v: unknown) => unknown)
      },
    }
    return chain
  }

  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          const chain = makeSelectChain(table, 'select')
          // first select sets columns conceptually
          void columns
          return chain
        },
        insert(row: Row) {
          calls.push({ op: 'insert', table, filters: {}, row })
          const id = String(row.id ?? `new-${calls.length}`)
          const stored = { ...row, id }
          tables[table] = [...(tables[table] ?? []), stored]
          return {
            select(_c: string) {
              return {
                async single() {
                  return { data: { id }, error: null }
                },
              }
            },
          }
        },
        update(patch: Row) {
          const filters: Record<string, string | string[]> = {}
          const chain: Record<string, unknown> = {
            eq(col: string, val: string) {
              filters[col] = val
              return chain
            },
            in(col: string, vals: string[]) {
              filters[col] = vals
              return chain
            },
            order() {
              return chain
            },
            limit() {
              return chain
            },
            select(_cols: string) {
              return chain
            },
            async maybeSingle() {
              calls.push({ op: 'update', table, filters, patch })
              const rows = filterRows(table, filters)
              if (!rows[0]) return { data: null, error: null }
              Object.assign(rows[0], patch)
              return { data: rows[0], error: null }
            },
            async single() {
              const r = await (chain.maybeSingle as () => Promise<{ data: unknown; error: null }>)()
              return r
            },
            then(onfulfilled: (v: unknown) => unknown) {
              return (chain.maybeSingle as () => Promise<unknown>)().then(onfulfilled)
            },
          }
          return chain
        },
      }
    },
  } as unknown as NewcomerDbClient

  return { client, calls, tables }
}

const ORG_A = 'org-chapelle'
const ORG_B = 'org-other'

describe('Lot 2-A — newcomer-intakes-repository', () => {
  it('refuse organizationId vide sur toute méthode', async () => {
    const { client } = createMockDb({})
    const repo = createNewcomerIntakesRepository(client)
    expect(() => repo.scopeOf('')).toThrow(OrganizationIdError)
    await expect(repo.listForOrganization('  ', { columns: 'id' })).rejects.toThrow(
      OrganizationIdError,
    )
    await expect(
      repo.insertForOrganization(null, {
        prenom: 'A',
        nom: null,
        telephone: '010',
        email: null,
        source: 'nouveau_venu_form',
        message: null,
        consent: true,
        consented_at: '2026-01-01T00:00:00Z',
        intake_payload: {},
      }),
    ).rejects.toThrow(OrganizationIdError)
  })

  it('insert injecte organization_id serveur et ignore le client', async () => {
    const { client, calls } = createMockDb({ newcomer_intakes: [] })
    const repo = createNewcomerIntakesRepository(client)
    const res = await repo.insertForOrganization(ORG_A, {
      prenom: 'Ada',
      nom: null,
      telephone: '0700000000',
      email: null,
      source: 'nouveau_venu_form',
      message: null,
      consent: true,
      consented_at: '2026-07-16T00:00:00Z',
      intake_payload: { heard_from: 'ami' },
      organization_id: ORG_B,
      organizationId: ORG_B,
    } as never)

    expect(res.id).toBeTruthy()
    const insert = calls.find((c) => c.op === 'insert')
    expect(insert?.row?.organization_id).toBe(ORG_A)
    expect(insert?.row?.organizationId).toBeUndefined()
    expect(insert?.row?.prenom).toBe('Ada')
  })

  it('liste uniquement les lignes du tenant', async () => {
    const { client, calls } = createMockDb({
      newcomer_intakes: [
        { id: 'i1', organization_id: ORG_A, prenom: 'A', created_at: '2026-07-02', status: 'new' },
        { id: 'i2', organization_id: ORG_B, prenom: 'B', created_at: '2026-07-03', status: 'new' },
        { id: 'i3', organization_id: ORG_A, prenom: 'C', created_at: '2026-07-01', status: 'contacted' },
      ],
    })
    const repo = createNewcomerIntakesRepository(client)
    const rows = await repo.listForOrganization(ORG_A, { columns: 'id, prenom', limit: 500 })
    expect(rows.map((r) => r.id).sort()).toEqual(['i1', 'i3'])
    const listCall = calls.find((c) => c.op === 'select')
    expect(listCall?.filters.organization_id).toBe(ORG_A)
  })

  it('PATCH metadata + update bornés org+id — ligne autre org invisible', async () => {
    const { client, calls, tables } = createMockDb({
      newcomer_intakes: [
        {
          id: 'i-own',
          organization_id: ORG_A,
          metadata: { keep: true },
          status: 'new',
        },
        {
          id: 'i-foreign',
          organization_id: ORG_B,
          metadata: { secret: true },
          status: 'new',
        },
      ],
    })
    const repo = createNewcomerIntakesRepository(client)

    const metaOwn = await repo.getMetadataForOrganization(ORG_A, 'i-own')
    expect(metaOwn?.metadata).toEqual({ keep: true })

    const metaForeign = await repo.getMetadataForOrganization(ORG_A, 'i-foreign')
    expect(metaForeign).toBeNull()

    const updated = await repo.updateForOrganization(
      ORG_A,
      'i-own',
      { status: 'contacted', organization_id: ORG_B },
      'id, status',
    )
    expect(updated?.status).toBe('contacted')
    const upd = calls.find((c) => c.op === 'update')
    expect(upd?.filters).toMatchObject({ organization_id: ORG_A, id: 'i-own' })
    expect(upd?.patch).not.toHaveProperty('organization_id')

    const updatedForeign = await repo.updateForOrganization(
      ORG_A,
      'i-foreign',
      { status: 'archived' },
      'id, status',
    )
    expect(updatedForeign).toBeNull()
    expect(tables.newcomer_intakes.find((r) => r.id === 'i-foreign')?.status).toBe('new')
  })

  it('journey : intake hors tenant refusé ; intake du tenant trouvé', async () => {
    const { client } = createMockDb({
      newcomer_intakes: [
        { id: 'in-a', organization_id: ORG_A, journey_status: 'active' },
        { id: 'in-b', organization_id: ORG_B, journey_status: 'active' },
      ],
    })
    const repo = createNewcomerIntakesRepository(client)
    expect(await repo.findIdInOrganization(ORG_A, 'in-a')).toBe('in-a')
    expect(await repo.findIdInOrganization(ORG_A, 'in-b')).toBeNull()
    expect(await repo.getJourneyStateForOrganization(ORG_A, 'in-b', 'id, journey_status')).toBeNull()
    expect(
      (await repo.getJourneyStateForOrganization(ORG_A, 'in-a', 'id, journey_status'))?.journey_status,
    ).toBe('active')
  })

  it('stats listForOrganization exige un scope (pas de listAll)', async () => {
    const { client, calls } = createMockDb({
      newcomer_intakes: [
        { id: '1', organization_id: ORG_A, status: 'new', created_at: '2026-07-01' },
        { id: '2', organization_id: ORG_B, status: 'new', created_at: '2026-07-01' },
      ],
    })
    const repo = createNewcomerIntakesRepository(client)
    const rows = await repo.listForOrganization(ORG_A, {
      columns: 'id, status, created_at',
      limit: 2000,
    })
    expect(rows).toHaveLength(1)
    expect(calls.some((c) => c.filters.organization_id === ORG_A)).toBe(true)
  })

  it('listJourneyFieldsForOrganization applique organization_id + liste ids', async () => {
    const { client, calls } = createMockDb({
      newcomer_intakes: [
        { id: 'j1', organization_id: ORG_A, journey_step_key: 'received' },
        { id: 'j2', organization_id: ORG_A, journey_step_key: 'contacted' },
        { id: 'j3', organization_id: ORG_B, journey_step_key: 'secret' },
      ],
    })
    const repo = createNewcomerIntakesRepository(client)
    const rows = await repo.listJourneyFieldsForOrganization(
      ORG_A,
      ['j1', 'j2', 'j3'],
      'id, journey_step_key',
    )
    expect(rows.map((r) => r.id).sort()).toEqual(['j1', 'j2'])
    expect(rows.every((r) => r.journey_step_key !== 'secret')).toBe(true)
    const call = calls.find((c) => c.op === 'select' && Array.isArray(c.filters.id))
    expect(call?.filters.organization_id).toBe(ORG_A)
    expect(call?.filters.id).toEqual(['j1', 'j2', 'j3'])
  })

  it('getJourneyStateForOrganization applique organization_id + id', async () => {
    const { client, calls } = createMockDb({
      newcomer_intakes: [
        { id: 'js1', organization_id: ORG_A, journey_status: 'active' },
        { id: 'js1', organization_id: ORG_B, journey_status: 'other' },
      ],
    })
    // Deux lignes même id impossible en vrai ; mock filtre par org+id
    const repo = createNewcomerIntakesRepository(client)
    const state = await repo.getJourneyStateForOrganization(
      ORG_A,
      'js1',
      'id, journey_status',
    )
    expect(state?.journey_status).toBe('active')
    const call = calls.find((c) => c.op === 'select:maybeSingle')
    expect(call?.filters).toMatchObject({ organization_id: ORG_A, id: 'js1' })
  })

  it('updateForOrganization retire organization_id et organizationId du patch', async () => {
    const { client, calls } = createMockDb({
      newcomer_intakes: [
        { id: 'u1', organization_id: ORG_A, status: 'new', metadata: {} },
      ],
    })
    const repo = createNewcomerIntakesRepository(client)
    await repo.updateForOrganization(
      ORG_A,
      'u1',
      {
        status: 'to_review',
        organization_id: ORG_B,
        organizationId: ORG_B,
      },
      'id, status',
    )
    const upd = calls.find((c) => c.op === 'update')
    expect(upd?.filters).toMatchObject({ organization_id: ORG_A, id: 'u1' })
    expect(upd?.patch).toEqual({ status: 'to_review' })
    expect(upd?.patch).not.toHaveProperty('organization_id')
    expect(upd?.patch).not.toHaveProperty('organizationId')
  })
})

describe('Lot 2-A — getNewcomerAdminStats scope obligatoire', () => {
  it('requireOrganizationId est appelé (organizationId vide refuse avant I/O)', async () => {
    // Import dynamique pour isoler le mock supabase si besoin
    const { getNewcomerAdminStats } = await import('../newcomer-intakes-server')
    await expect(getNewcomerAdminStats('')).rejects.toThrow(OrganizationIdError)
    await expect(getNewcomerAdminStats(null)).rejects.toThrow(OrganizationIdError)
  })
})

describe('Lot 2-A — migration DEFAULT canonique (inspection statique)', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260716120000_citadelle_erp_lot2a_newcomer_intakes_organization.sql',
    ),
    'utf8',
  )

  it('pose un DEFAULT serveur via ALTER dynamique quoté', () => {
    expect(sql).toMatch(/ALTER COLUMN organization_id SET DEFAULT %L::uuid/)
    expect(sql).toMatch(/EXECUTE format\(/)
    expect(sql).toMatch(/GARDE TRANSITOIRE/)
    expect(sql).toMatch(/Incompatible avec une 2e organisation|INCOMPATIBLE avec une deuxième organisation/i)
  })

  it('DEFAULT est posé avant NOT NULL', () => {
    const iDefault = sql.indexOf('SET DEFAULT %L::uuid')
    const iNotNull = sql.indexOf('ALTER COLUMN organization_id SET NOT NULL')
    expect(iDefault).toBeGreaterThan(0)
    expect(iNotNull).toBeGreaterThan(iDefault)
  })

  it('postcheck exige column_default non NULL et égalité UUID canonique', () => {
    expect(sql).toMatch(/col_default IS NULL/)
    expect(sql).toMatch(/column_default/)
    expect(sql).toMatch(/position\(canon_id::text/)
    expect(sql).toMatch(/pg_get_expr\(ad\.adbin/)
  })
})
