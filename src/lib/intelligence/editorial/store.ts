import { supabaseAdmin } from '@/lib/supabase'
import {
  buildEditorialRecommendationDedupeKey,
  type EditorialCapacity,
  type EditorialPriorityBand,
  type EditorialRecommendation,
  type EditorialRecommendationEvent,
  type EditorialRecommendationIdentityInput,
  type EditorialRecommendationKind,
  type EditorialRecommendationStatus,
  type EditorialSettings,
  type EditorialSignal,
} from './contracts'

export interface EditorialRecommendationRow {
  id: string
  organization_id: string
  recommendation_kind: EditorialRecommendationKind
  content_kind: string
  target_channel: string
  status: EditorialRecommendationStatus
  priority_band: EditorialPriorityBand
  window_start: string
  window_end: string
  scheduled_for: string | null
  batch_id: string | null
  parent_recommendation_id: string | null
  dedupe_key: string
  source_content_id: string | null
  source_content_type: string | null
  source_title: string | null
  source_snapshot_jsonb: Record<string, unknown>
  signals_jsonb: ReadonlyArray<EditorialSignal>
  why_jsonb: ReadonlyArray<string>
  human_title_override: string | null
  human_notes: string | null
  human_edit_jsonb: Record<string, unknown>
  generated_at: string
  last_refreshed_at: string | null
  last_human_action_at: string | null
  accepted_at: string | null
  scheduled_at: string | null
  completed_at: string | null
  rejected_at: string | null
  archived_at: string | null
  performance_snapshot_jsonb: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface EditorialRecommendationEventRow {
  id: string
  organization_id: string
  recommendation_id: string
  event_type: string
  payload_jsonb: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface EditorialSettingsRow {
  organization_id: string
  timezone: string
  refresh_mode: 'manual' | 'daily'
  refresh_time_local: string | null
  weekly_capacity_jsonb: {
    weeklyTotal: number
    family: Partial<Record<EditorialRecommendationKind, number>>
  }
  channel_capacity_jsonb: Record<string, number>
  content_kind_capacity_jsonb: Record<string, number>
  manual_refresh_enabled: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface EditorialRecommendationListFilters {
  status?: EditorialRecommendationStatus | ReadonlyArray<EditorialRecommendationStatus>
  recommendationKind?: EditorialRecommendationKind
  targetChannel?: string
  contentKind?: string
  batchId?: string | null
  parentRecommendationId?: string | null
  scheduledFrom?: string
  scheduledTo?: string
  windowFrom?: string
  windowTo?: string
  limit?: number
}

export interface EditorialRecommendationInsertInput extends EditorialRecommendationIdentityInput {
  status: EditorialRecommendationStatus
  priorityBand: EditorialPriorityBand
  sourceContentType?: string | null
  sourceTitle?: string | null
  sourceSnapshot?: Record<string, unknown>
  signals?: ReadonlyArray<EditorialSignal>
  why?: ReadonlyArray<string>
  humanTitleOverride?: string | null
  humanNotes?: string | null
  humanEdit?: Record<string, unknown>
  generatedAt: string
  createdBy: string | null
  updatedBy: string | null
  dedupeKey?: string
}

export interface EditorialRecommendationPatchInput {
  status?: EditorialRecommendationStatus
  priorityBand?: EditorialPriorityBand
  scheduledFor?: string | null
  batchId?: string | null
  parentRecommendationId?: string | null
  sourceTitle?: string | null
  humanTitleOverride?: string | null
  humanNotes?: string | null
  humanEdit?: Record<string, unknown>
  lastHumanActionAt?: string | null
  lastRefreshedAt?: string | null
  acceptedAt?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  rejectedAt?: string | null
  archivedAt?: string | null
  performanceSnapshot?: Record<string, unknown>
  updatedBy: string | null
}

export interface EditorialRecommendationEventInsertInput {
  organizationId: string
  recommendationId: string
  eventType: string
  payload?: Record<string, unknown>
  createdBy: string | null
}

export interface EditorialSettingsUpsertInput {
  organizationId: string
  timezone: string
  refreshMode: 'manual' | 'daily'
  refreshTimeLocal?: string | null
  weeklyCapacity: EditorialCapacity
  channelCapacity?: Record<string, number>
  contentKindCapacity?: Record<string, number>
  manualRefreshEnabled?: boolean
  createdBy: string | null
  updatedBy: string | null
}

const RECOMMENDATION_COLUMNS = [
  'id',
  'organization_id',
  'recommendation_kind',
  'content_kind',
  'target_channel',
  'status',
  'priority_band',
  'window_start',
  'window_end',
  'scheduled_for',
  'batch_id',
  'parent_recommendation_id',
  'dedupe_key',
  'source_content_id',
  'source_content_type',
  'source_title',
  'source_snapshot_jsonb',
  'signals_jsonb',
  'why_jsonb',
  'human_title_override',
  'human_notes',
  'human_edit_jsonb',
  'generated_at',
  'last_refreshed_at',
  'last_human_action_at',
  'accepted_at',
  'scheduled_at',
  'completed_at',
  'rejected_at',
  'archived_at',
  'performance_snapshot_jsonb',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
].join(', ')

const SETTINGS_COLUMNS = [
  'organization_id',
  'timezone',
  'refresh_mode',
  'refresh_time_local',
  'weekly_capacity_jsonb',
  'channel_capacity_jsonb',
  'content_kind_capacity_jsonb',
  'manual_refresh_enabled',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
].join(', ')

export function toEditorialRecommendationRecord(row: EditorialRecommendationRow): EditorialRecommendation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recommendationKind: row.recommendation_kind,
    contentKind: row.content_kind,
    targetChannel: row.target_channel,
    status: row.status,
    priorityBand: row.priority_band,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    scheduledFor: row.scheduled_for,
    batchId: row.batch_id,
    parentRecommendationId: row.parent_recommendation_id,
    dedupeKey: row.dedupe_key,
    sourceContentId: row.source_content_id,
    sourceContentType: row.source_content_type,
    sourceTitle: row.source_title,
    sourceSnapshot: row.source_snapshot_jsonb,
    signals: row.signals_jsonb,
    why: row.why_jsonb,
    humanTitleOverride: row.human_title_override,
    humanNotes: row.human_notes,
    humanEdit: row.human_edit_jsonb,
    generatedAt: row.generated_at,
    lastRefreshedAt: row.last_refreshed_at,
    lastHumanActionAt: row.last_human_action_at,
    acceptedAt: row.accepted_at,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    rejectedAt: row.rejected_at,
    archivedAt: row.archived_at,
    performanceSnapshot: row.performance_snapshot_jsonb,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toEditorialRecommendationEventRecord(row: EditorialRecommendationEventRow): EditorialRecommendationEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recommendationId: row.recommendation_id,
    eventType: row.event_type,
    payload: row.payload_jsonb,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function toEditorialSettingsRecord(row: EditorialSettingsRow): EditorialSettings {
  return {
    organizationId: row.organization_id,
    timezone: row.timezone,
    refreshMode: row.refresh_mode,
    refreshTimeLocal: row.refresh_time_local,
    weeklyCapacity: {
      weeklyTotal: row.weekly_capacity_jsonb.weeklyTotal,
      family: row.weekly_capacity_jsonb.family ?? {},
      channel: row.channel_capacity_jsonb ?? {},
      contentKind: row.content_kind_capacity_jsonb ?? {},
    },
    manualRefreshEnabled: row.manual_refresh_enabled,
    channelCapacity: row.channel_capacity_jsonb,
    contentKindCapacity: row.content_kind_capacity_jsonb,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeEditorialRecommendationInsert(input: EditorialRecommendationInsertInput) {
  const dedupeKey =
    input.dedupeKey ||
    buildEditorialRecommendationDedupeKey({
      organizationId: input.organizationId,
      recommendationKind: input.recommendationKind,
      contentKind: input.contentKind,
      targetChannel: input.targetChannel,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      scheduledFor: input.scheduledFor ?? input.windowStart,
      sourceContentId: input.sourceContentId,
      batchId: input.batchId,
      parentRecommendationId: input.parentRecommendationId ?? null,
    })

  return {
    organization_id: input.organizationId,
    recommendation_kind: input.recommendationKind,
    content_kind: input.contentKind,
    target_channel: input.targetChannel,
    status: input.status,
    priority_band: input.priorityBand,
    window_start: input.windowStart,
    window_end: input.windowEnd,
    scheduled_for: input.scheduledFor ?? null,
    batch_id: input.batchId,
    parent_recommendation_id: input.parentRecommendationId ?? null,
    dedupe_key: dedupeKey,
    source_content_id: input.sourceContentId,
    source_content_type: input.sourceContentType ?? null,
    source_title: input.sourceTitle ?? null,
    source_snapshot_jsonb: input.sourceSnapshot ?? {},
    signals_jsonb: input.signals ?? [],
    why_jsonb: input.why ?? [],
    human_title_override: input.humanTitleOverride ?? null,
    human_notes: input.humanNotes ?? null,
    human_edit_jsonb: input.humanEdit ?? {},
    generated_at: input.generatedAt,
    last_refreshed_at: input.generatedAt,
    last_human_action_at: null,
    accepted_at: null,
    scheduled_at: null,
    completed_at: null,
    rejected_at: null,
    archived_at: null,
    performance_snapshot_jsonb: {},
    created_by: input.createdBy,
    updated_by: input.updatedBy,
  }
}

function recommendationQuery(orgId: string) {
  return supabaseAdmin.from('editorial_recommendations').select(RECOMMENDATION_COLUMNS).eq('organization_id', orgId)
}

export async function listEditorialRecommendations(
  organizationId: string,
  filters: EditorialRecommendationListFilters = {},
): Promise<EditorialRecommendation[]> {
  let q: any = recommendationQuery(organizationId)

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      q = q.in('status', filters.status)
    } else {
      q = q.eq('status', filters.status)
    }
  }
  if (filters.recommendationKind) q = q.eq('recommendation_kind', filters.recommendationKind)
  if (filters.targetChannel) q = q.eq('target_channel', filters.targetChannel)
  if (filters.contentKind) q = q.eq('content_kind', filters.contentKind)
  if (filters.batchId !== undefined) q = filters.batchId === null ? q.is('batch_id', null) : q.eq('batch_id', filters.batchId)
  if (filters.parentRecommendationId !== undefined) {
    q = filters.parentRecommendationId === null
      ? q.is('parent_recommendation_id', null)
      : q.eq('parent_recommendation_id', filters.parentRecommendationId)
  }
  if (filters.scheduledFrom) q = q.gte('scheduled_for', filters.scheduledFrom)
  if (filters.scheduledTo) q = q.lte('scheduled_for', filters.scheduledTo)
  if (filters.windowFrom) q = q.gte('window_end', filters.windowFrom)
  if (filters.windowTo) q = q.lte('window_start', filters.windowTo)
  if (filters.limit) q = q.limit(filters.limit)

  const { data, error } = await q.order('priority_band', { ascending: true }).order('scheduled_for', {
    ascending: true,
    nullsFirst: false,
  })
  if (error) {
    throw new Error(error.message)
  }
  return (Array.isArray(data) ? data : []).map((row) => toEditorialRecommendationRecord(row as unknown as EditorialRecommendationRow))
}

export async function getEditorialRecommendation(
  organizationId: string,
  recommendationId: string,
): Promise<EditorialRecommendation | null> {
  const { data, error } = await recommendationQuery(organizationId).eq('id', recommendationId).maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  return data ? toEditorialRecommendationRecord(data as unknown as EditorialRecommendationRow) : null
}

export async function createEditorialRecommendation(
  input: EditorialRecommendationInsertInput,
): Promise<EditorialRecommendation> {
  const row = normalizeEditorialRecommendationInsert(input)
  const { data, error } = await supabaseAdmin
    .from('editorial_recommendations')
    .insert(row)
    .select(RECOMMENDATION_COLUMNS)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Editorial recommendation insert returned no row.')
  }
  return toEditorialRecommendationRecord(data as unknown as EditorialRecommendationRow)
}

export async function patchEditorialRecommendation(
  organizationId: string,
  recommendationId: string,
  patch: EditorialRecommendationPatchInput,
): Promise<EditorialRecommendation | null> {
  const payload: Record<string, unknown> = {
    updated_by: patch.updatedBy,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priorityBand !== undefined ? { priority_band: patch.priorityBand } : {}),
    ...(patch.scheduledFor !== undefined ? { scheduled_for: patch.scheduledFor } : {}),
    ...(patch.batchId !== undefined ? { batch_id: patch.batchId } : {}),
    ...(patch.parentRecommendationId !== undefined ? { parent_recommendation_id: patch.parentRecommendationId } : {}),
    ...(patch.sourceTitle !== undefined ? { source_title: patch.sourceTitle } : {}),
    ...(patch.humanTitleOverride !== undefined ? { human_title_override: patch.humanTitleOverride } : {}),
    ...(patch.humanNotes !== undefined ? { human_notes: patch.humanNotes } : {}),
    ...(patch.humanEdit !== undefined ? { human_edit_jsonb: patch.humanEdit } : {}),
    ...(patch.lastHumanActionAt !== undefined ? { last_human_action_at: patch.lastHumanActionAt } : {}),
    ...(patch.lastRefreshedAt !== undefined ? { last_refreshed_at: patch.lastRefreshedAt } : {}),
    ...(patch.acceptedAt !== undefined ? { accepted_at: patch.acceptedAt } : {}),
    ...(patch.scheduledAt !== undefined ? { scheduled_at: patch.scheduledAt } : {}),
    ...(patch.completedAt !== undefined ? { completed_at: patch.completedAt } : {}),
    ...(patch.rejectedAt !== undefined ? { rejected_at: patch.rejectedAt } : {}),
    ...(patch.archivedAt !== undefined ? { archived_at: patch.archivedAt } : {}),
    ...(patch.performanceSnapshot !== undefined ? { performance_snapshot_jsonb: patch.performanceSnapshot } : {}),
  }

  const { data, error } = await supabaseAdmin
    .from('editorial_recommendations')
    .update(payload)
    .eq('organization_id', organizationId)
    .eq('id', recommendationId)
    .select(RECOMMENDATION_COLUMNS)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data ? toEditorialRecommendationRecord(data as unknown as EditorialRecommendationRow) : null
}

export async function appendEditorialRecommendationEvent(
  input: EditorialRecommendationEventInsertInput,
): Promise<EditorialRecommendationEvent> {
  const { data, error } = await supabaseAdmin
    .from('editorial_recommendation_events')
    .insert({
      organization_id: input.organizationId,
      recommendation_id: input.recommendationId,
      event_type: input.eventType,
      payload_jsonb: input.payload ?? {},
      created_by: input.createdBy,
    })
    .select('id, organization_id, recommendation_id, event_type, payload_jsonb, created_by, created_at')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Editorial recommendation event insert returned no row.')
  }
  return toEditorialRecommendationEventRecord(data as unknown as EditorialRecommendationEventRow)
}

export async function getEditorialSettings(
  organizationId: string,
): Promise<EditorialSettings | null> {
  const { data, error } = await supabaseAdmin
    .from('editorial_settings')
    .select(SETTINGS_COLUMNS)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data ? toEditorialSettingsRecord(data as unknown as EditorialSettingsRow) : null
}

export async function upsertEditorialSettings(
  input: EditorialSettingsUpsertInput,
): Promise<EditorialSettings> {
  const { data, error } = await supabaseAdmin
    .from('editorial_settings')
    .upsert(
      {
        organization_id: input.organizationId,
        timezone: input.timezone,
        refresh_mode: input.refreshMode,
        refresh_time_local: input.refreshTimeLocal ?? null,
        weekly_capacity_jsonb: {
          weeklyTotal: input.weeklyCapacity.weeklyTotal,
          family: input.weeklyCapacity.family,
        },
        channel_capacity_jsonb: input.channelCapacity ?? input.weeklyCapacity.channel,
        content_kind_capacity_jsonb: input.contentKindCapacity ?? input.weeklyCapacity.contentKind,
        manual_refresh_enabled: input.manualRefreshEnabled ?? true,
        created_by: input.createdBy,
        updated_by: input.updatedBy,
      },
      { onConflict: 'organization_id' },
    )
    .select(SETTINGS_COLUMNS)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Editorial settings upsert returned no row.')
  }
  return toEditorialSettingsRecord(data as unknown as EditorialSettingsRow)
}
