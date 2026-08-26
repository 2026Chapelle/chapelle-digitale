import type { ContentGraphNode } from '../types/content'
import type {
  EditorialRecommendation,
  EditorialSettings,
  EditorialSignal,
} from './contracts'
import { applyEditorialCapacityLimits } from './capacity'
import { buildEditorialRecommendationsForWindow, type EditorialEngineInput } from './engine'
import { computeEditorialCapacityEnvelope, type EditorialCapacityEnvelope } from './capacity'

export { computeEditorialCapacityEnvelope }

export interface EditorialWeekCandidate {
  recommendationId: string
  contentKind: string
  channel: string
}

export interface EditorialWeekPlan {
  days: Array<{ date: string; recommendationIds: string[] }>
  recommendations: EditorialWeekCandidate[]
  autoAccepted: false
  autoPublished: false
}

export function prepareEditorialWeekPlan(input: {
  organizationId: string
  calendarWindow: { start: string; end: string }
  capacity: { live: number; podcast: number; article: number; shortVideo: number; social: number; whatsapp: number }
  candidates: ReadonlyArray<EditorialWeekCandidate>
  existingRecommendationIds?: ReadonlyArray<string>
}): EditorialWeekPlan {
  const envelope: EditorialCapacityEnvelope = computeEditorialCapacityEnvelope(input.capacity)
  const existing = new Set(input.existingRecommendationIds ?? [])
  const selected: EditorialWeekCandidate[] = []
  const familyCounts = new Map<string, number>()
  for (const candidate of input.candidates) {
    if (existing.has(candidate.recommendationId)) continue
    const family = candidate.contentKind.toUpperCase().replace(/-/g, '_')
    const limit = envelope.family[family]
    const count = familyCounts.get(family) ?? 0
    if (limit !== undefined && count >= limit) continue
    selected.push(candidate)
    familyCounts.set(family, count + 1)
    if (selected.length >= envelope.weeklyTotal) break
  }
  const start = new Date(`${input.calendarWindow.start}T00:00:00.000Z`)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return { date: date.toISOString().slice(0, 10), recommendationIds: [] as string[] }
  })
  selected.forEach((candidate, index) => days[index % days.length].recommendationIds.push(candidate.recommendationId))
  return { days, recommendations: selected, autoAccepted: false, autoPublished: false }
}

export interface EditorialWeekPreparationInput {
  organizationId: string
  nowIso: string
  sources: ReadonlyArray<ContentGraphNode>
  signals: ReadonlyArray<EditorialSignal>
  settings: EditorialSettings
  existingRecommendations?: ReadonlyArray<EditorialRecommendation>
}

export interface EditorialWeekPreparationResult {
  windowStart: string
  windowEnd: string
  recommendations: EditorialRecommendation[]
  priorityRecommendations: EditorialRecommendation[]
}

function addDaysIsoDate(dateIso: string, offsetDays: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

export function prepareEditorialWeek(input: EditorialWeekPreparationInput): EditorialWeekPreparationResult {
  const windowStart = input.nowIso.slice(0, 10)
  const windowEnd = addDaysIsoDate(windowStart, 6)
  const engineInput: EditorialEngineInput = {
    organizationId: input.organizationId,
    nowIso: input.nowIso,
    windowStart,
    windowEnd,
    sources: input.sources,
    signals: input.signals,
    existingRecommendations: input.existingRecommendations,
    capacity: input.settings.weeklyCapacity,
  }
  const result = buildEditorialRecommendationsForWindow(engineInput)
  return {
    windowStart,
    windowEnd,
    recommendations: result.recommendations,
    priorityRecommendations: applyEditorialCapacityLimits(result.priorityRecommendations, input.settings.weeklyCapacity),
  }
}
