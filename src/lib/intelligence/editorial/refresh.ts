import type { ContentGraphNode } from '../types/content'
import type {
  EditorialRecommendation,
  EditorialSettings,
  EditorialSignal,
} from './contracts'
import { buildEditorialRecommendationsForWindow, type EditorialEngineInput } from './engine'
import { buildEditorialSignalSignature } from './memory'
import {
  appendEditorialRecommendationEvent,
  createEditorialRecommendation,
  getEditorialSettings,
  listEditorialRecommendations,
  type EditorialRecommendationInsertInput,
} from './store'

export interface EditorialRefreshDependencies {
  getSettings?: typeof getEditorialSettings
  listRecommendations?: typeof listEditorialRecommendations
  createRecommendation?: typeof createEditorialRecommendation
  appendEvent?: typeof appendEditorialRecommendationEvent
}

interface EditorialRefreshBaseInput {
  organizationId: string
  nowIso: string
  sources: ReadonlyArray<ContentGraphNode>
  signals: ReadonlyArray<EditorialSignal>
}

export type EditorialMachineAuth =
  | { kind: 'server'; authenticated: true }
  | { kind: 'missing' }

export type EditorialRefreshInput = EditorialRefreshBaseInput & (
  {
    mode: 'manual'
    requestedBy: string
    actor: { id: string; organizationId: string; permissions: ReadonlyArray<string> }
    machineAuth: null
  } | {
    mode: 'scheduled'
    requestedBy: null
    actor: null
    machineAuth: EditorialMachineAuth
  }
)

export interface EditorialRefreshResult {
  organizationId: string
  mode: 'manual' | 'scheduled'
  windowStart: string
  windowEnd: string
  signalSignature: string
  createdCount: number
  recommendations: EditorialRecommendation[]
  priorityRecommendations: EditorialRecommendation[]
}

const defaultDependencies: Required<EditorialRefreshDependencies> = {
  getSettings: getEditorialSettings,
  listRecommendations: listEditorialRecommendations,
  createRecommendation: createEditorialRecommendation,
  appendEvent: appendEditorialRecommendationEvent,
}

function mapInsertInput(
  recommendation: EditorialRecommendation,
  requestedBy: string | null,
): EditorialRecommendationInsertInput {
  return {
    organizationId: recommendation.organizationId,
    recommendationKind: recommendation.recommendationKind,
    contentKind: recommendation.contentKind,
    targetChannel: recommendation.targetChannel,
    windowStart: recommendation.windowStart,
    windowEnd: recommendation.windowEnd,
    scheduledFor: recommendation.scheduledFor ?? recommendation.windowStart,
    batchId: recommendation.batchId,
    parentRecommendationId: recommendation.parentRecommendationId,
    sourceContentId: recommendation.sourceContentId,
    sourceContentType: recommendation.sourceContentType,
    sourceTitle: recommendation.sourceTitle,
    sourceSnapshot: {
      ...recommendation.sourceSnapshot,
      signalSignature: recommendation.sourceSnapshot.signalSignature ?? null,
    },
    status: recommendation.status,
    priorityBand: recommendation.priorityBand,
    signals: recommendation.signals,
    why: recommendation.why,
    humanTitleOverride: recommendation.humanTitleOverride,
    humanNotes: recommendation.humanNotes,
    humanEdit: recommendation.humanEdit,
    generatedAt: recommendation.generatedAt,
    createdBy: requestedBy,
    updatedBy: requestedBy,
    dedupeKey: recommendation.dedupeKey,
  }
}

export async function refreshEditorialIntelligence(
  input: EditorialRefreshInput,
  dependencies: EditorialRefreshDependencies = {},
): Promise<EditorialRefreshResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  if (input.mode === 'manual') {
    if (input.actor.organizationId !== input.organizationId) throw new Error('organization-scope-required')
    if (input.actor.id !== input.requestedBy) throw new Error('authenticated-user-required')
    if (!input.actor.permissions.includes('can_manage_editorial_intelligence')) {
      throw new Error('editorial-permission-required')
    }
  } else if (!input.machineAuth || input.machineAuth.kind !== 'server' || !input.machineAuth.authenticated) {
    throw new Error('machine-auth-required')
  }
  const settings = await deps.getSettings(input.organizationId)
  if (!settings) {
    throw new Error(`Editorial settings not found for organization ${input.organizationId}.`)
  }

  const windowStart = input.nowIso.slice(0, 10)
  const windowEnd = windowStart
  const existingRecommendations = await deps.listRecommendations(input.organizationId, {
    windowFrom: windowStart,
    windowTo: windowEnd,
  })
  const signalSignature = buildEditorialSignalSignature(input.signals)
  const engineInput: EditorialEngineInput = {
    organizationId: input.organizationId,
    nowIso: input.nowIso,
    windowStart,
    windowEnd,
    sources: input.sources,
    signals: input.signals,
    existingRecommendations,
    capacity: settings.weeklyCapacity,
    derivedFromByContentId: {},
  }
  const result = buildEditorialRecommendationsForWindow(engineInput)
  const recommendations = result.recommendations
  const created: EditorialRecommendation[] = []

  for (const recommendation of recommendations) {
    const inserted = await deps.createRecommendation(mapInsertInput(recommendation, input.requestedBy))
    created.push(inserted)
  }

  if (created.length > 0) {
    await deps.appendEvent({
      organizationId: input.organizationId,
      recommendationId: created[0].id,
      eventType: 'REFRESHED',
      payload: {
        mode: input.mode,
        createdCount: created.length,
        signalSignature,
      },
      createdBy: input.requestedBy,
    })
  }

  return {
    organizationId: input.organizationId,
    mode: input.mode,
    windowStart,
    windowEnd,
    signalSignature,
    createdCount: created.length,
    recommendations: created,
    priorityRecommendations: result.priorityRecommendations,
  }
}
