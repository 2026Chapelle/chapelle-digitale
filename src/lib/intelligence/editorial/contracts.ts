export const EDITORIAL_RECOMMENDATION_KINDS = ['CREATE', 'REPURPOSE', 'PROMOTE'] as const
export const EDITORIAL_RECOMMENDATION_STATUSES = [
  'PROPOSED',
  'ACCEPTED',
  'SCHEDULED',
  'COMPLETED',
  'REJECTED',
  'ARCHIVED',
] as const
export const EDITORIAL_PRIORITY_BANDS = ['FORTE', 'NORMALE', 'A_SURVEILLER'] as const

export type EditorialRecommendationKind = (typeof EDITORIAL_RECOMMENDATION_KINDS)[number]
export type EditorialRecommendationStatus = (typeof EDITORIAL_RECOMMENDATION_STATUSES)[number]
export type EditorialPriorityBand = (typeof EDITORIAL_PRIORITY_BANDS)[number]
export type EditorialSignalTruthState = 'REAL' | 'PARTIAL' | 'UNAVAILABLE' | 'EDITORIAL_RECOMMENDATION'

export interface EditorialSignal {
  key: string
  source: string
  truthState: EditorialSignalTruthState
  available: boolean
  observedAt: string
  value: unknown
  note?: string | null
}

export interface EditorialCapacity {
  weeklyTotal: number
  family: Partial<Record<EditorialRecommendationKind, number>>
  channel: Record<string, number>
  contentKind: Record<string, number>
}

export interface EditorialRecommendation {
  id: string
  organizationId: string
  recommendationKind: EditorialRecommendationKind
  contentKind: string
  targetChannel: string
  status: EditorialRecommendationStatus
  priorityBand: EditorialPriorityBand
  windowStart: string
  windowEnd: string
  scheduledFor: string | null
  batchId: string | null
  parentRecommendationId: string | null
  dedupeKey: string
  sourceContentId: string | null
  sourceContentType: string | null
  sourceTitle: string | null
  sourceSnapshot: Record<string, unknown>
  signals: ReadonlyArray<EditorialSignal>
  why: ReadonlyArray<string>
  humanTitleOverride: string | null
  humanNotes: string | null
  humanEdit: Record<string, unknown>
  generatedAt: string
  lastRefreshedAt: string | null
  lastHumanActionAt: string | null
  acceptedAt: string | null
  scheduledAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  archivedAt: string | null
  performanceSnapshot: Record<string, unknown>
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface EditorialRecommendationEvent {
  id: string
  organizationId: string
  recommendationId: string
  eventType: string
  payload: Record<string, unknown>
  createdBy: string | null
  createdAt: string
}

export interface EditorialSettings {
  organizationId: string
  timezone: string
  refreshMode: 'manual' | 'daily'
  refreshTimeLocal: string | null
  weeklyCapacity: EditorialCapacity
  manualRefreshEnabled: boolean
  channelCapacity: Record<string, number>
  contentKindCapacity: Record<string, number>
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface EditorialRecommendationIdentityInput {
  organizationId: string
  recommendationKind: EditorialRecommendationKind
  contentKind: string
  targetChannel: string
  windowStart: string
  windowEnd: string
  scheduledFor: string
  sourceContentId: string | null
  batchId: string | null
  parentRecommendationId?: string | null
}

const TRANSITIONS: Readonly<Record<EditorialRecommendationStatus, ReadonlySet<EditorialRecommendationStatus>>> = {
  PROPOSED: new Set<EditorialRecommendationStatus>(['ACCEPTED', 'SCHEDULED', 'REJECTED', 'ARCHIVED']),
  ACCEPTED: new Set<EditorialRecommendationStatus>(['SCHEDULED', 'REJECTED', 'ARCHIVED']),
  SCHEDULED: new Set<EditorialRecommendationStatus>(['COMPLETED', 'REJECTED', 'ARCHIVED']),
  COMPLETED: new Set<EditorialRecommendationStatus>(['ARCHIVED']),
  REJECTED: new Set<EditorialRecommendationStatus>(['ARCHIVED']),
  ARCHIVED: new Set<EditorialRecommendationStatus>(),
}

export function buildEditorialRecommendationDedupeKey(input: EditorialRecommendationIdentityInput): string {
  return [
    input.organizationId.trim(),
    input.recommendationKind,
    input.contentKind.trim(),
    input.targetChannel.trim(),
    input.windowStart,
    input.windowEnd,
    input.scheduledFor,
    input.sourceContentId?.trim() || 'none',
  ].join('|')
}

export function canTransitionEditorialRecommendation(
  from: EditorialRecommendationStatus,
  to: EditorialRecommendationStatus,
): boolean {
  return TRANSITIONS[from]?.has(to) ?? false
}
