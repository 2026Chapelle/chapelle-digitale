import type { EditorialSignal } from './contracts'
import {
  buildEditorialRecommendationDedupeKey,
  type EditorialCapacity,
  type EditorialRecommendation,
  type EditorialRecommendationKind,
} from './contracts'
import { buildEditorialSignalSignature } from './memory'
import {
  isHumanLockedEditorialStatus,
  shouldSuppressRejectedEditorialRecommendation,
} from './memory'
import type { ContentGraphNode } from '../types/content'
import { compareEditorialPriorityBands, scoreEditorialPriority } from './prioritization'

export interface EditorialEngineInput {
  organizationId: string
  nowIso: string
  windowStart: string
  windowEnd: string
  sources: ReadonlyArray<ContentGraphNode>
  signals: ReadonlyArray<EditorialSignal>
  existingRecommendations?: ReadonlyArray<EditorialRecommendation>
  capacity?: EditorialCapacity | null
  derivedFromByContentId?: Readonly<Record<string, string | null>>
}

export interface EditorialEngineOutput {
  recommendations: EditorialRecommendation[]
  priorityRecommendations: EditorialRecommendation[]
  signalSnapshot: EditorialSignal[]
}

interface RecommendationSeed {
  kind: EditorialRecommendationKind
  contentKind: string
  targetChannel: string
  scheduledOffsetDays: number
  mission: number
  audience: number
  performance: number
  opportunity: number
  effort: number
  timing: number
  why: string[]
}

function addDaysIsoDate(dateIso: string, offsetDays: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function buildSourceSnapshot(source: ContentGraphNode, signalSnapshot: EditorialSignal[], parentRecommendationId: string | null) {
  return {
    entity: source.entity,
    destinations: source.destinations,
    parentRecommendationId,
    signalKeys: signalSnapshot.map((signal) => signal.key),
    signalSignature: buildEditorialSignalSignature(signalSnapshot),
  }
}

function recommendationSeedForSource(source: ContentGraphNode): ReadonlyArray<RecommendationSeed> {
  if (source.entity.type === 'live') {
    return [
      {
        kind: 'REPURPOSE',
        contentKind: 'article',
        targetChannel: 'web',
        scheduledOffsetDays: 0,
        mission: 82,
        audience: 84,
        performance: 78,
        opportunity: 80,
        effort: 34,
        timing: 75,
        why: ['reuse-first', 'live-source', 'article-funnel'],
      },
      {
        kind: 'REPURPOSE',
        contentKind: 'podcast',
        targetChannel: 'podcast',
        scheduledOffsetDays: 1,
        mission: 80,
        audience: 82,
        performance: 74,
        opportunity: 76,
        effort: 30,
        timing: 74,
        why: ['reuse-first', 'live-source', 'audio-reuse'],
      },
      {
        kind: 'REPURPOSE',
        contentKind: 'youtube_short',
        targetChannel: 'youtube',
        scheduledOffsetDays: 1,
        mission: 78,
        audience: 86,
        performance: 73,
        opportunity: 84,
        effort: 38,
        timing: 76,
        why: ['reuse-first', 'live-source', 'short-form'],
      },
      {
        kind: 'PROMOTE',
        contentKind: 'whatsapp',
        targetChannel: 'whatsapp',
        scheduledOffsetDays: 2,
        mission: 70,
        audience: 72,
        performance: 68,
        opportunity: 74,
        effort: 18,
        timing: 66,
        why: ['promote', 'community-distribution'],
      },
      {
        kind: 'PROMOTE',
        contentKind: 'facebook',
        targetChannel: 'facebook',
        scheduledOffsetDays: 2,
        mission: 68,
        audience: 68,
        performance: 66,
        opportunity: 72,
        effort: 16,
        timing: 62,
        why: ['promote', 'social-distribution'],
      },
    ]
  }

  if (source.entity.type === 'article') {
    return [
      {
        kind: 'PROMOTE',
        contentKind: 'whatsapp',
        targetChannel: 'whatsapp',
        scheduledOffsetDays: 0,
        mission: 60,
        audience: 66,
        performance: 62,
        opportunity: 66,
        effort: 14,
        timing: 60,
        why: ['promote', 'article-distribution'],
      },
      {
        kind: 'PROMOTE',
        contentKind: 'facebook',
        targetChannel: 'facebook',
        scheduledOffsetDays: 1,
        mission: 58,
        audience: 64,
        performance: 60,
        opportunity: 64,
        effort: 14,
        timing: 58,
        why: ['promote', 'article-distribution'],
      },
    ]
  }

  if (source.entity.type === 'podcast' || source.destinations.some((destination) => destination.platform === 'youtube')) {
    return [
      {
        kind: 'PROMOTE',
        contentKind: 'whatsapp',
        targetChannel: 'whatsapp',
        scheduledOffsetDays: 0,
        mission: 58,
        audience: 62,
        performance: 60,
        opportunity: 64,
        effort: 14,
        timing: 58,
        why: ['promote', 'distribution'],
      },
    ]
  }

  return []
}

function recommendationSeedForSignals(signals: ReadonlyArray<EditorialSignal>): ReadonlyArray<RecommendationSeed> {
  return signals.flatMap((signal) => {
    if (!signal.available) return []
    if (!signal.key.startsWith('seo:create:')) return []

    return [
      {
        kind: 'CREATE',
        contentKind: 'article',
        targetChannel: 'web',
        scheduledOffsetDays: 3,
        mission: 66,
        audience: 64,
        performance: 62,
        opportunity: 78,
        effort: 46,
        timing: 68,
        why: ['create', 'seo-opportunity', signal.key],
      },
    ]
  })
}

function buildRecommendationId(dedupeKey: string): string {
  return `draft:${dedupeKey}`
}

function dedupeEditorialSignals(signals: ReadonlyArray<EditorialSignal>): EditorialSignal[] {
  const seen = new Set<string>()
  const output: EditorialSignal[] = []
  for (const signal of signals) {
    if (seen.has(signal.key)) continue
    seen.add(signal.key)
    output.push(signal)
  }
  return output
}

function buildRecommendation(
  input: EditorialEngineInput,
  source: ContentGraphNode | null,
  seed: RecommendationSeed,
  index: number,
  signalSnapshot: EditorialSignal[],
): EditorialRecommendation {
  const parentRecommendationId = source
    ? input.derivedFromByContentId?.[source.entity.content_id] ?? null
    : null
  const scheduledFor = addDaysIsoDate(input.windowStart, seed.scheduledOffsetDays)
  const signalSignature = buildEditorialSignalSignature(signalSnapshot)
  const dedupeKey = buildEditorialRecommendationDedupeKey({
    organizationId: input.organizationId,
    recommendationKind: seed.kind,
    contentKind: seed.contentKind,
    targetChannel: seed.targetChannel,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    scheduledFor,
    sourceContentId: source?.entity.content_id ?? signalSnapshot[0]?.key ?? null,
    batchId: source ? `batch:${source.entity.content_id}:${input.windowStart}` : `batch:signals:${input.windowStart}`,
    parentRecommendationId,
  }) + `|signal:${signalSignature}`
  const priority = scoreEditorialPriority(seed)
  const sourceSnapshot = source
    ? buildSourceSnapshot(source, signalSnapshot, parentRecommendationId)
    : {
        signalKeys: signalSnapshot.map((signal) => signal.key),
        signalCount: signalSnapshot.length,
        signalSignature,
      }

  return {
    id: buildRecommendationId(dedupeKey),
    organizationId: input.organizationId,
    recommendationKind: seed.kind,
    contentKind: seed.contentKind,
    targetChannel: seed.targetChannel,
    status: 'PROPOSED',
    priorityBand: priority.band,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    scheduledFor,
    batchId: source ? `batch:${source.entity.content_id}:${input.windowStart}` : `batch:signals:${input.windowStart}`,
    parentRecommendationId,
    dedupeKey,
    sourceContentId: source?.entity.content_id ?? null,
    sourceContentType: source?.entity.type ?? null,
    sourceTitle: source?.entity.title ?? null,
    sourceSnapshot,
    signals: signalSnapshot,
    why: seed.why,
    humanTitleOverride: null,
    humanNotes: null,
    humanEdit: {},
    generatedAt: input.nowIso,
    lastRefreshedAt: input.nowIso,
    lastHumanActionAt: null,
    acceptedAt: null,
    scheduledAt: null,
    completedAt: null,
    rejectedAt: null,
    archivedAt: null,
    performanceSnapshot: {
      score: priority.score,
      dimensions: {
        mission: seed.mission,
        audience: seed.audience,
        performance: seed.performance,
        opportunity: seed.opportunity,
        effort: seed.effort,
        timing: seed.timing,
      },
    },
    createdBy: null,
    updatedBy: null,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  }
}

function dedupeByKey(recommendations: ReadonlyArray<EditorialRecommendation>): EditorialRecommendation[] {
  const seen = new Set<string>()
  const output: EditorialRecommendation[] = []
  for (const recommendation of recommendations) {
    if (seen.has(recommendation.dedupeKey)) continue
    seen.add(recommendation.dedupeKey)
    output.push(recommendation)
  }
  return output
}

function recommendationIdentity(dedupeKey: string): string {
  return dedupeKey.split('|signal:')[0]
}

function selectVisibleRecommendations(
  recommendations: ReadonlyArray<EditorialRecommendation>,
  capacity: EditorialCapacity | null | undefined,
): EditorialRecommendation[] {
  const visibleLimit = Math.min(5, Math.max(1, capacity?.weeklyTotal ?? 5))
  return [...recommendations]
    .sort((left, right) => {
      const bandOrder = compareEditorialPriorityBands(left.priorityBand, right.priorityBand)
      if (bandOrder !== 0) return bandOrder
    const leftScheduled = left.scheduledFor ?? left.windowStart
    const rightScheduled = right.scheduledFor ?? right.windowStart
    if (leftScheduled !== rightScheduled) {
      return leftScheduled.localeCompare(rightScheduled)
    }
      return left.dedupeKey.localeCompare(right.dedupeKey)
    })
    .slice(0, visibleLimit)
}

export function buildEditorialRecommendationsForWindow(input: EditorialEngineInput): EditorialEngineOutput {
  const signalSnapshot = dedupeEditorialSignals(input.signals)
  const generated = dedupeByKey([
    ...input.sources.flatMap((source) => {
      return recommendationSeedForSource(source).map((seed, index) =>
        buildRecommendation(input, source, seed, index, signalSnapshot),
      )
    }),
    ...recommendationSeedForSignals(signalSnapshot).map((seed, index) =>
      buildRecommendation(input, null, seed, index, signalSnapshot),
    ),
  ])

  const existingRecommendations = input.existingRecommendations ?? []
  const existingKeys = new Set(existingRecommendations.map((recommendation) => recommendation.dedupeKey))
  const existingByIdentity = new Map<string, EditorialRecommendation[]>()
  for (const existing of existingRecommendations) {
    const identity = recommendationIdentity(existing.dedupeKey)
    existingByIdentity.set(identity, [...(existingByIdentity.get(identity) ?? []), existing])
  }
  const recommendations = generated.filter((recommendation) => {
    if (existingKeys.has(recommendation.dedupeKey)) return false
    const identityMatches = existingByIdentity.get(recommendationIdentity(recommendation.dedupeKey)) ?? []
    if (identityMatches.some((existing) => isHumanLockedEditorialStatus(existing.status))) return false
    const signalSignature = typeof recommendation.sourceSnapshot.signalSignature === 'string'
      ? recommendation.sourceSnapshot.signalSignature
      : ''
    return !identityMatches.some((existing) => shouldSuppressRejectedEditorialRecommendation(existing, signalSignature))
  })

  return {
    recommendations,
    priorityRecommendations: selectVisibleRecommendations(recommendations, input.capacity),
    signalSnapshot,
  }
}
