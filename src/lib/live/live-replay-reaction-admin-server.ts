import 'server-only'

import { supabaseAdmin } from '@/lib/supabase'
import { resolveCanonicalOrganizationId } from '@/lib/erp/resolve-canonical-organization'
import {
  UnitAccessError,
  assertUnitAccess,
  canManageWorldSettings,
  listAccessibleUnitIds,
  resolveActorUnitContext,
  resolveAdminActorProfile,
  type ActorUnitContext,
} from '@/lib/erp/unit-access'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ReplayReactionGovernanceInput = {
  cmsLiveId: string
  enabled: boolean
  organizationId: string | null
  organizationUnitId: string | null
}

export type ReplayReactionGovernanceReason =
  | 'forbidden'
  | 'not_found'
  | 'invalid_request'
  | 'unavailable'

export type ManageableReplayReactionLive = {
  cmsLiveId: string
  title: string
  status: string
  organizationId: string | null
  organizationUnitId: string | null
  enabled: boolean
}

export type ManageableReplayReactionUnit = {
  id: string
  name: string
  unitType: string
  parentId: string | null
}

export type ReplayReactionGovernanceData = {
  lives: ManageableReplayReactionLive[]
  units: ManageableReplayReactionUnit[]
  canManageGlobal: boolean
}

export type ReplayReactionGovernanceListResult =
  | { ok: true; data: ReplayReactionGovernanceData }
  | { ok: false; reason: ReplayReactionGovernanceReason }

export type ReplayReactionGovernanceUpdateResult =
  | { ok: true; data: { live: ManageableReplayReactionLive } }
  | { ok: false; reason: ReplayReactionGovernanceReason }

type ReplayRow = {
  id: string
  title: string | null
  status: string | null
  youtube_url: string | null
  video_url: string | null
  organization_id: string | null
  organization_unit_id: string | null
}

type UnitRow = {
  id: string
  name: string
  unit_type: string
  parent_id: string | null
}

type SettingRow = {
  cms_live_id: string
  enabled: boolean
}

type Scope = {
  organizationId: string
  unitIds: string[]
  includeGlobal: boolean
}

type AdminDependencies = {
  resolveAdminActorProfile: typeof resolveAdminActorProfile
  resolveCanonicalOrganizationId: typeof resolveCanonicalOrganizationId
  resolveActorUnitContext: typeof resolveActorUnitContext
  listAccessibleUnitIds: typeof listAccessibleUnitIds
  assertUnitAccess: typeof assertUnitAccess
  canManageWorldSettings: typeof canManageWorldSettings
  db: { from: (table: string) => any }
}

const defaultDependencies: AdminDependencies = {
  resolveAdminActorProfile,
  resolveCanonicalOrganizationId,
  resolveActorUnitContext,
  listAccessibleUnitIds,
  assertUnitAccess,
  canManageWorldSettings,
  db: supabaseAdmin as any,
}

function hasReplayMedia(row: ReplayRow): boolean {
  return Boolean(
    (typeof row.youtube_url === 'string' && row.youtube_url.trim()) ||
    (typeof row.video_url === 'string' && row.video_url.trim()),
  )
}

function isReplay(row: ReplayRow): boolean {
  return (
    (row.status === 'ended' || row.status === 'published') &&
    hasReplayMedia(row)
  )
}

function validInput(input: ReplayReactionGovernanceInput): boolean {
  if (!UUID_RE.test(input.cmsLiveId) || typeof input.enabled !== 'boolean') return false
  const global = input.organizationId === null && input.organizationUnitId === null
  const attached =
    typeof input.organizationId === 'string' &&
    UUID_RE.test(input.organizationId) &&
    typeof input.organizationUnitId === 'string' &&
    UUID_RE.test(input.organizationUnitId)
  return global || attached
}

function mapFailure(error: unknown): ReplayReactionGovernanceReason {
  if (error instanceof UnitAccessError) {
    if (error.status === 404) return 'not_found'
    if (error.status === 401 || error.status === 403) return 'forbidden'
  }
  return 'unavailable'
}

function toLive(row: ReplayRow, enabled: boolean): ManageableReplayReactionLive {
  return {
    cmsLiveId: row.id,
    title: typeof row.title === 'string' ? row.title : '',
    status: typeof row.status === 'string' ? row.status : '',
    organizationId: row.organization_id,
    organizationUnitId: row.organization_unit_id,
    enabled,
  }
}

async function resolveActor(
  dependencies: AdminDependencies,
): Promise<ActorUnitContext> {
  const profile = await dependencies.resolveAdminActorProfile()
  const organizationId = await dependencies.resolveCanonicalOrganizationId()
  const actor = await dependencies.resolveActorUnitContext(
    organizationId,
    profile.userId,
    dependencies.db,
    { requireAdminRole: true },
  )
  return { ...actor, email: profile.email }
}

async function loadScopedLives(
  dependencies: AdminDependencies,
  scope: Scope,
): Promise<ReplayRow[]> {
  const columns =
    'id,title,status,youtube_url,video_url,organization_id,organization_unit_id'
  const rows: ReplayRow[] = []

  if (scope.unitIds.length > 0) {
    const { data, error } = await dependencies.db
      .from('cms_lives')
      .select(columns)
      .eq('organization_id', scope.organizationId)
      .in('organization_unit_id', scope.unitIds)

    if (error) throw new Error(error.message)
    rows.push(...((Array.isArray(data) ? data : []) as ReplayRow[]))
  }

  if (scope.includeGlobal) {
    const { data, error } = await dependencies.db
      .from('cms_lives')
      .select(columns)
      .is('organization_id', null)
      .is('organization_unit_id', null)

    if (error) throw new Error(error.message)
    rows.push(...((Array.isArray(data) ? data : []) as ReplayRow[]))
  }

  return rows.filter(isReplay)
}

async function loadScopedReplay(
  dependencies: AdminDependencies,
  scope: Scope,
  cmsLiveId: string,
): Promise<ReplayRow | null> {
  const columns =
    'id,title,status,youtube_url,video_url,organization_id,organization_unit_id'

  if (scope.includeGlobal) {
    const { data, error } = await dependencies.db
      .from('cms_lives')
      .select(columns)
      .eq('id', cmsLiveId)
      .is('organization_id', null)
      .is('organization_unit_id', null)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) return isReplay(data as ReplayRow) ? (data as ReplayRow) : null
  }

  if (scope.unitIds.length === 0) return null

  const { data, error } = await dependencies.db
    .from('cms_lives')
    .select(columns)
    .eq('id', cmsLiveId)
    .eq('organization_id', scope.organizationId)
    .in('organization_unit_id', scope.unitIds)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data || !isReplay(data as ReplayRow)) return null
  return data as ReplayRow
}

async function buildScope(
  dependencies: AdminDependencies,
  actor: ActorUnitContext,
): Promise<Scope> {
  return {
    organizationId: actor.organizationId,
    unitIds: await dependencies.listAccessibleUnitIds(actor, dependencies.db),
    includeGlobal: dependencies.canManageWorldSettings(actor),
  }
}

export function createReplayReactionAdminService(
  dependencies: AdminDependencies = defaultDependencies,
) {
  async function listManageableReplayReactionSettings(): Promise<ReplayReactionGovernanceListResult> {
    try {
      const actor = await resolveActor(dependencies)
      const scope = await buildScope(dependencies, actor)
      const lives = await loadScopedLives(dependencies, scope)
      const liveIds = lives.map((row) => row.id)

      let settings: SettingRow[] = []
      if (liveIds.length > 0) {
        const { data, error } = await dependencies.db
          .from('live_replay_reaction_settings')
          .select('cms_live_id,enabled')
          .in('cms_live_id', liveIds)
        if (error) throw new Error(error.message)
        settings = (Array.isArray(data) ? data : []) as SettingRow[]
      }

      let units: UnitRow[] = []
      if (scope.unitIds.length > 0) {
        const { data, error } = await dependencies.db
          .from('organization_units')
          .select('id,name,unit_type,parent_id')
          .eq('organization_id', scope.organizationId)
          .in('id', scope.unitIds)
          .eq('status', 'active')
        if (error) throw new Error(error.message)
        units = (Array.isArray(data) ? data : []) as UnitRow[]
      }

      const enabledByLive = new Map(
        settings.map((row) => [row.cms_live_id, row.enabled !== false]),
      )

      return {
        ok: true,
        data: {
          lives: lives.map((row) => toLive(row, enabledByLive.get(row.id) ?? true)),
          units: units.map((row) => ({
            id: row.id,
            name: row.name,
            unitType: row.unit_type,
            parentId: row.parent_id,
          })),
          canManageGlobal: scope.includeGlobal,
        },
      }
    } catch (error) {
      return { ok: false, reason: mapFailure(error) }
    }
  }

  async function updateReplayReactionGovernance(
    input: ReplayReactionGovernanceInput,
  ): Promise<ReplayReactionGovernanceUpdateResult> {
    if (!validInput(input)) return { ok: false, reason: 'invalid_request' }

    try {
      const actor = await resolveActor(dependencies)
      const scope = await buildScope(dependencies, actor)
      const global = input.organizationId === null && input.organizationUnitId === null

      if (global) {
        if (!scope.includeGlobal) return { ok: false, reason: 'not_found' }
      } else {
        if (
          input.organizationId !== actor.organizationId ||
          !input.organizationUnitId
        ) {
          return { ok: false, reason: 'not_found' }
        }
        try {
          await dependencies.assertUnitAccess(
            actor,
            input.organizationUnitId,
            { write: true },
            dependencies.db,
          )
        } catch (error) {
          if (error instanceof UnitAccessError && (error.status === 403 || error.status === 404)) {
            return { ok: false, reason: 'not_found' }
          }
          throw error
        }
      }

      const current = await loadScopedReplay(dependencies, scope, input.cmsLiveId)
      if (!current) return { ok: false, reason: 'not_found' }

      let updateQuery = dependencies.db
        .from('cms_lives')
        .update({
          organization_id: input.organizationId,
          organization_unit_id: input.organizationUnitId,
        })
        .eq('id', input.cmsLiveId)

      updateQuery = current.organization_id === null
        ? updateQuery.is('organization_id', null)
        : updateQuery.eq('organization_id', current.organization_id)
      updateQuery = current.organization_unit_id === null
        ? updateQuery.is('organization_unit_id', null)
        : updateQuery.eq('organization_unit_id', current.organization_unit_id)

      const { data: updated, error: updateError } = await updateQuery
        .select('id,title,status,youtube_url,video_url,organization_id,organization_unit_id')
        .maybeSingle()

      if (updateError) throw new Error(updateError.message)
      if (!updated) return { ok: false, reason: 'not_found' }

      const { error: settingError } = await dependencies.db
        .from('live_replay_reaction_settings')
        .upsert(
          {
            cms_live_id: input.cmsLiveId,
            enabled: input.enabled,
            updated_by: actor.userId,
          },
          { onConflict: 'cms_live_id' },
        )

      if (settingError) throw new Error(settingError.message)

      return {
        ok: true,
        data: { live: toLive(updated as ReplayRow, input.enabled) },
      }
    } catch (error) {
      return { ok: false, reason: mapFailure(error) }
    }
  }

  return {
    listManageableReplayReactionSettings,
    updateReplayReactionGovernance,
  }
}

const productionService = createReplayReactionAdminService()

export const listManageableReplayReactionSettings =
  productionService.listManageableReplayReactionSettings

export const updateReplayReactionGovernance =
  productionService.updateReplayReactionGovernance
