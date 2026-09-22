import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UnitAccessError, type ActorUnitContext } from '@/lib/erp/unit-access'
import { createReplayReactionAdminService } from './live-replay-reaction-admin-server'

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const LIVE_ID = '22222222-2222-4222-8222-222222222222'
const UNIT_ID = '33333333-3333-4333-8333-333333333333'
const CHILD_ID = '44444444-4444-4444-8444-444444444444'
const USER_ID = '55555555-5555-4555-8555-555555555555'

type Result = { data?: unknown; error?: { message: string } | null }

function query(result: Result, operations: Array<[string, unknown[]]>) {
  const api: any = {}
  for (const method of ['select', 'eq', 'in', 'is', 'update', 'upsert']) {
    api[method] = (...args: unknown[]) => {
      operations.push([method, args])
      return api
    }
  }
  api.maybeSingle = () => {
    operations.push(['maybeSingle', []])
    return Promise.resolve({ data: result.data ?? null, error: result.error ?? null })
  }
  api.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject)
  return api
}

function fakeDb(results: Record<string, Result[]>) {
  const tables: string[] = []
  const operations: Record<string, Array<[string, unknown[]]>> = {}
  const db = {
    from: vi.fn((table: string) => {
      tables.push(table)
      operations[table] ||= []
      const next = results[table]?.shift()
      if (!next) throw new Error(`Unexpected table call: ${table}`)
      return query(next, operations[table])
    }),
  }
  return { db, tables, operations }
}

function actor(role: string, isWorldScope = false): ActorUnitContext {
  return {
    userId: USER_ID,
    email: 'admin@example.test',
    organizationId: ORG_ID,
    homeUnitIds: [UNIT_ID],
    isWorldScope,
    highestRole: role as ActorUnitContext['highestRole'],
    memberships: [
      {
        id: 'membership-1',
        organization_id: ORG_ID,
        organization_unit_id: UNIT_ID,
        user_id: USER_ID,
        unit_role: role as any,
        status: 'active',
        is_primary: true,
        unit: {
          id: UNIT_ID,
          name: 'Unité',
          slug: 'unite',
          unit_type: isWorldScope ? 'world_headquarters' : 'local_church',
          status: 'active',
          materialized_path: `/world/${UNIT_ID}`,
          depth: 1,
          parent_id: null,
          continent_code: null,
          country_code: null,
        },
      },
    ],
  }
}

function replayRow(organizationId: string | null, unitId: string | null) {
  return {
    id: LIVE_ID,
    title: 'Culte royal',
    status: 'published',
    youtube_url: 'https://youtube.test/watch?v=1',
    video_url: null,
    organization_id: organizationId,
    organization_unit_id: unitId,
  }
}

function dependencies(
  currentActor: ActorUnitContext,
  database: ReturnType<typeof fakeDb>['db'],
  unitIds = [UNIT_ID, CHILD_ID],
) {
  return {
    db: database,
    resolveAdminActorProfile: vi.fn(async () => ({
      userId: USER_ID,
      email: 'admin@example.test',
      role: 'admin',
    })),
    resolveCanonicalOrganizationId: vi.fn(async () => ORG_ID),
    resolveActorUnitContext: vi.fn(async () => currentActor),
    listAccessibleUnitIds: vi.fn(async () => unitIds),
    assertUnitAccess: vi.fn(async () => ({ id: UNIT_ID })),
    canManageWorldSettings: vi.fn(() => currentActor.isWorldScope),
  }
}

describe('LIVE 4C replay reaction ERP governance', () => {
  it.each(['world_super_admin', 'world_admin'])(
    '%s can manage a global replay',
    async (role) => {
      const store = fakeDb({
        cms_lives: [
          { data: replayRow(null, null) },
          { data: replayRow(null, null) },
        ],
        live_replay_reaction_settings: [{ data: null }],
      })
      const deps = dependencies(actor(role, true), store.db)
      const service = createReplayReactionAdminService(deps as any)

      await expect(service.updateReplayReactionGovernance({
        cmsLiveId: LIVE_ID,
        enabled: true,
        organizationId: null,
        organizationUnitId: null,
      })).resolves.toMatchObject({ ok: true })

      expect(deps.assertUnitAccess).not.toHaveBeenCalled()
      expect(store.tables).not.toContain('live_replay_reactions')
    },
  )

  it.each(['world_super_admin', 'world_admin'])(
    '%s can manage an attached replay',
    async (role) => {
      const store = fakeDb({
        cms_lives: [
          { data: null },
          { data: replayRow(ORG_ID, CHILD_ID) },
          { data: replayRow(ORG_ID, CHILD_ID) },
        ],
        live_replay_reaction_settings: [{ data: null }],
      })
      const currentActor = actor(role, true)
      const deps = dependencies(currentActor, store.db)
      const service = createReplayReactionAdminService(deps as any)

      await expect(service.updateReplayReactionGovernance({
        cmsLiveId: LIVE_ID,
        enabled: true,
        organizationId: ORG_ID,
        organizationUnitId: CHILD_ID,
      })).resolves.toMatchObject({ ok: true })

      expect(deps.assertUnitAccess).toHaveBeenCalledWith(
        currentActor,
        CHILD_ID,
        { write: true },
        store.db,
      )
    },
  )

  it.each([
    ['zone_admin', CHILD_ID, [UNIT_ID, CHILD_ID]],
    ['national_admin', CHILD_ID, [UNIT_ID, CHILD_ID]],
    ['local_admin', UNIT_ID, [UNIT_ID]],
  ] as const)(
    '%s manages only its authorized attached replay hierarchy',
    async (role, targetUnitId, accessibleUnitIds) => {
      const store = fakeDb({
        cms_lives: [
          { data: replayRow(ORG_ID, targetUnitId) },
          { data: replayRow(ORG_ID, targetUnitId) },
        ],
        live_replay_reaction_settings: [{ data: null }],
      })
      const currentActor = actor(role)
      const deps = dependencies(currentActor, store.db, [...accessibleUnitIds])
      const service = createReplayReactionAdminService(deps as any)

      await expect(service.updateReplayReactionGovernance({
        cmsLiveId: LIVE_ID,
        enabled: false,
        organizationId: ORG_ID,
        organizationUnitId: targetUnitId,
      })).resolves.toMatchObject({ ok: true })

      expect(deps.assertUnitAccess).toHaveBeenCalledWith(
        currentActor,
        targetUnitId,
        { write: true },
        store.db,
      )
      expect(store.operations.live_replay_reaction_settings).toContainEqual([
        'upsert',
        [
          {
            cms_live_id: LIVE_ID,
            enabled: false,
            updated_by: USER_ID,
          },
          { onConflict: 'cms_live_id' },
        ],
      ])
      expect(store.tables).not.toContain('live_replay_reactions')
    },
  )

  it.each(['zone_admin', 'national_admin', 'local_admin'])(
    '%s receives uniform not_found for a global replay',
    async (role) => {
      const store = fakeDb({})
      const service = createReplayReactionAdminService(
        dependencies(actor(role), store.db, [UNIT_ID]) as any,
      )

      await expect(service.updateReplayReactionGovernance({
        cmsLiveId: LIVE_ID,
        enabled: true,
        organizationId: null,
        organizationUnitId: null,
      })).resolves.toEqual({ ok: false, reason: 'not_found' })

      expect(store.tables).not.toContain('cms_lives')
    },
  )

  it('returns uniform not_found before reading an out-of-scope replay', async () => {
    const store = fakeDb({})
    const deps = dependencies(actor('local_admin'), store.db, [UNIT_ID])
    deps.assertUnitAccess.mockRejectedValue(
      new UnitAccessError('Unité introuvable.', 404),
    )
    const service = createReplayReactionAdminService(deps as any)

    await expect(service.updateReplayReactionGovernance({
      cmsLiveId: LIVE_ID,
      enabled: true,
      organizationId: ORG_ID,
      organizationUnitId: CHILD_ID,
    })).resolves.toEqual({ ok: false, reason: 'not_found' })

    expect(store.tables).not.toContain('cms_lives')
  })

  it('forbids a missing real identity even if the caller reached the service', async () => {
    const store = fakeDb({})
    const deps = dependencies(actor('world_admin', true), store.db)
    deps.resolveAdminActorProfile.mockRejectedValue(
      new UnitAccessError('Identité administrateur requise.', 403, 'actor_required'),
    )
    const service = createReplayReactionAdminService(deps as any)

    await expect(service.listManageableReplayReactionSettings())
      .resolves.toEqual({ ok: false, reason: 'forbidden' })
    expect(deps.resolveCanonicalOrganizationId).not.toHaveBeenCalled()
  })

  it('forbids an actor without an active admin membership', async () => {
    const store = fakeDb({})
    const deps = dependencies(actor('world_admin', true), store.db)
    deps.resolveActorUnitContext.mockRejectedValue(
      new UnitAccessError('Autorisation administrative requise.', 403, 'no_admin_membership'),
    )
    const service = createReplayReactionAdminService(deps as any)

    await expect(service.listManageableReplayReactionSettings())
      .resolves.toEqual({ ok: false, reason: 'forbidden' })
    expect(deps.resolveActorUnitContext).toHaveBeenCalledWith(
      ORG_ID,
      USER_ID,
      store.db,
      { requireAdminRole: true },
    )
  })

  it('lists only scoped replays and units, defaulting missing settings to enabled', async () => {
    const attached = replayRow(ORG_ID, UNIT_ID)
    const global = { ...replayRow(null, null), id: '66666666-6666-4666-8666-666666666666' }
    const store = fakeDb({
      cms_lives: [{ data: [attached] }, { data: [global] }],
      live_replay_reaction_settings: [{ data: [{ cms_live_id: global.id, enabled: false }] }],
      organization_units: [{
        data: [{ id: UNIT_ID, name: 'Locale', unit_type: 'local_church', parent_id: null }],
      }],
    })
    const service = createReplayReactionAdminService(
      dependencies(actor('world_admin', true), store.db, [UNIT_ID]) as any,
    )

    const result = await service.listManageableReplayReactionSettings()

    expect(result).toEqual({
      ok: true,
      data: {
        canManageGlobal: true,
        lives: [
          expect.objectContaining({ cmsLiveId: LIVE_ID, enabled: true }),
          expect.objectContaining({ cmsLiveId: global.id, enabled: false }),
        ],
        units: [{ id: UNIT_ID, name: 'Locale', unitType: 'local_church', parentId: null }],
      },
    })
    expect(store.tables).not.toContain('live_replay_reactions')
  })
})
