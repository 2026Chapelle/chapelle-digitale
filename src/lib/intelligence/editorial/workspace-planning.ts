import { buildEditorialLogicalIdentity } from './logical-identity'

type PlanningRecommendation = {
  id?: string
  status?: string
  priorityBand?: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  scheduledFor?: string | null
  organizationId?: string | null
  recommendationKind?: string | null
  contentKind?: string | null
  targetChannel?: string | null
  sourceContentId?: string | null
  sourceSnapshot?: Record<string, unknown> | null
  signals?: ReadonlyArray<{ key?: string | null }> | null
  generatedAt?: string | null
  lastRefreshedAt?: string | null
  lastHumanActionAt?: string | null
  acceptedAt?: string | null
  scheduledAt?: string | null
  completedAt?: string | null
  rejectedAt?: string | null
  archivedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type EditorialPlanningSettings = {
  weeklyCapacity?: { weeklyTotal?: unknown }
  timezone?: unknown
}

const DEFAULT_WEEKLY_CAPACITY = 10
const PLANNING_STATUSES = new Set(['PROPOSED', 'ACCEPTED'])
const CALENDAR_STATUSES = new Set(['ACCEPTED', 'SCHEDULED', 'COMPLETED'])

function priorityRank(item: PlanningRecommendation) {
  return item.priorityBand === 'FORTE' ? 0 : item.priorityBand === 'NORMALE' ? 1 : 2
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function resolveEditorialTimeZone(timeZone?: unknown) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format()
    return timeZone
  } catch {
    return 'UTC'
  }
}

export function getEditorialToday(timeZone: unknown, now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveEditorialTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function getWeeklyCapacity(settings?: EditorialPlanningSettings | null) {
  const capacity = settings?.weeklyCapacity?.weeklyTotal
  return typeof capacity === 'number' && Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : DEFAULT_WEEKLY_CAPACITY
}

export function selectWeeklyRecommendations<T extends PlanningRecommendation>(recommendations: readonly T[], capacity: number): T[] {
  return recommendations
    .filter((item) => PLANNING_STATUSES.has(item.status ?? 'PROPOSED'))
    .map((item, index) => ({ item, index }))
    .sort((left, right) => priorityRank(left.item) - priorityRank(right.item) || left.index - right.index)
    .slice(0, Math.max(0, capacity))
    .map(({ item }) => item)
}

export function buildSuggestedWeeklyDates<T extends PlanningRecommendation>(recommendations: readonly T[], today: string): Array<T & { suggestedFor?: string }> {
  let proposedIndex = 0
  return recommendations.map((item) => {
    if ((item.status ?? 'PROPOSED') !== 'PROPOSED') return { ...item }
    const suggestedFor = addDays(today, proposedIndex % 7)
    proposedIndex += 1
    return { ...item, suggestedFor }
  })
}

function hasEditorialIdentity(item: PlanningRecommendation) {
  return Boolean(item.organizationId && item.recommendationKind && item.contentKind && item.targetChannel)
}

function canonicalStateRecency(item: PlanningRecommendation) {
  return (
    item.lastHumanActionAt ??
    item.rejectedAt ??
    item.archivedAt ??
    item.completedAt ??
    item.scheduledAt ??
    item.acceptedAt ??
    item.lastRefreshedAt ??
    item.generatedAt ??
    item.updatedAt ??
    item.createdAt ??
    ''
  )
}

function canonicalStatusTieBreak(status?: string) {
  if (CALENDAR_STATUSES.has(status ?? '')) return 0
  if (status === 'REJECTED' || status === 'ARCHIVED') return 1
  if (status === 'PROPOSED') return 2
  return 3
}

function compareCanonicalRecommendations(left: PlanningRecommendation, right: PlanningRecommendation) {
  const recencyOrder = canonicalStateRecency(right)
    .localeCompare(canonicalStateRecency(left))

  if (recencyOrder !== 0) return recencyOrder

  const statusOrder =
    canonicalStatusTieBreak(left.status) -
    canonicalStatusTieBreak(right.status)

  if (statusOrder !== 0) return statusOrder

  return (left.id ?? '').localeCompare(right.id ?? '')
}
export function selectCanonicalEditorialOpportunities<T extends PlanningRecommendation>(recommendations: readonly T[]): T[] {
  const groups = new Map<string, T[]>()
  recommendations.forEach((recommendation, index) => {
    const identity = hasEditorialIdentity(recommendation)
      ? buildEditorialLogicalIdentity(recommendation)
      : `unidentified:${recommendation.id ?? index}`
    groups.set(identity, [...(groups.get(identity) ?? []), recommendation])
  })
  return Array.from(groups.values()).map((group) => [...group].sort(compareCanonicalRecommendations)[0]!)
}

export function buildEditorialWorkspaceReadModel<T extends PlanningRecommendation>(recommendations: readonly T[], settings: EditorialPlanningSettings | null | undefined, now: Date) {
  const opportunities = selectCanonicalEditorialOpportunities(recommendations)
  const weeklyCapacity = getWeeklyCapacity(settings)
  const weeklyRecommendations = buildSuggestedWeeklyDates(selectWeeklyRecommendations(opportunities, weeklyCapacity), getEditorialToday(settings?.timezone, now))
  return {
    opportunities,
    weeklyCapacity,
    weeklyRecommendations,
    priorities: weeklyRecommendations.slice(0, 5),
    calendarRecommendations: selectCalendarRecommendations(opportunities),
  }
}

export function buildEditorialWorkspaceSummary<T extends { priorityBand?: PlanningRecommendation['priorityBand'] }>(workspace: {
  priorities: T[]
  weeklyRecommendations: T[]
  opportunities: T[]
  calendarRecommendations: T[]
  weeklyCapacity: number
}) {
  return {
    priorities: workspace.priorities,
    weeklyRecommendations: workspace.weeklyRecommendations,
    opportunities: workspace.opportunities,
    calendarRecommendations: workspace.calendarRecommendations,
    totalOpportunities: workspace.opportunities.length,
    weeklyCapacity: workspace.weeklyCapacity,
    watchlist: workspace.opportunities.filter((item) => item.priorityBand === 'A_SURVEILLER'),
  }
}

export function selectCalendarRecommendations<T extends { status?: string }>(recommendations: readonly T[]): T[] {
  return recommendations.filter((item) => CALENDAR_STATUSES.has(item.status ?? ''))
}

export function formatEditorialChannel(channel?: string | null) {
  const labels: Record<string, string> = {
    web: 'Site web',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    youtube: 'YouTube',
    podcast: 'Podcast',
  }
  return labels[channel?.toLowerCase() ?? ''] ?? 'Canal \u00e9ditorial'
}

export function formatEditorialFamily(kind?: string | null) {
  if (kind === 'REPURPOSE') return 'D\u00e9cliner'
  if (kind === 'PROMOTE') return 'Promouvoir'
  return 'Cr\u00e9er'
}

export function formatEditorialAction(input: { recommendationKind?: string | null; contentKind?: string | null; targetChannel?: string | null }) {
  const contentKind = input.contentKind?.toLowerCase()
  const channel = formatEditorialChannel(input.targetChannel)

  if (input.recommendationKind === 'REPURPOSE') {
    if (contentKind === 'article') return 'D\u00e9cliner en article'
    if (contentKind === 'podcast') return 'D\u00e9cliner en podcast'
    if (contentKind === 'youtube_short') return 'Cr\u00e9er une vid\u00e9o courte'
    return 'D\u00e9cliner ce contenu'
  }

  if (input.recommendationKind === 'PROMOTE') {
    return input.targetChannel
      ? `Promouvoir sur ${channel}`
      : 'Promouvoir ce contenu'
  }

  if (contentKind === 'article') return 'Cr\u00e9er un article'
  if (contentKind === 'podcast') return 'Cr\u00e9er un podcast'
  if (contentKind === 'youtube_short') return 'Cr\u00e9er une vid\u00e9o courte'

  return 'Cr\u00e9er un contenu'
}
