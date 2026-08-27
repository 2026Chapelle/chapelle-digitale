type PlanningRecommendation = {
  status?: string
  priorityBand?: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  scheduledFor?: string | null
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

export function buildEditorialWorkspaceReadModel<T extends PlanningRecommendation>(recommendations: readonly T[], settings: EditorialPlanningSettings | null | undefined, now: Date) {
  const weeklyCapacity = getWeeklyCapacity(settings)
  const weeklyRecommendations = buildSuggestedWeeklyDates(selectWeeklyRecommendations(recommendations, weeklyCapacity), getEditorialToday(settings?.timezone, now))
  return {
    opportunities: [...recommendations],
    weeklyCapacity,
    weeklyRecommendations,
    priorities: weeklyRecommendations.slice(0, 5),
    calendarRecommendations: selectCalendarRecommendations(recommendations),
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
  return labels[channel?.toLowerCase() ?? ''] ?? 'Canal éditorial'
}

export function formatEditorialFamily(kind?: string | null) {
  if (kind === 'REPURPOSE') return 'Décliner'
  if (kind === 'PROMOTE') return 'Promouvoir'
  return 'Créer'
}

export function formatEditorialAction(input: { recommendationKind?: string | null; contentKind?: string | null; targetChannel?: string | null }) {
  const contentKind = input.contentKind?.toLowerCase()
  const channel = formatEditorialChannel(input.targetChannel)
  if (input.recommendationKind === 'REPURPOSE') {
    if (contentKind === 'article') return 'Décliner en article'
    if (contentKind === 'podcast') return 'Décliner en podcast'
    if (contentKind === 'youtube_short') return 'Créer une vidéo courte'
    return 'Décliner ce contenu'
  }
  if (input.recommendationKind === 'PROMOTE') return input.targetChannel ? `Promouvoir sur ${channel}` : 'Promouvoir ce contenu'
  if (contentKind === 'article') return 'Créer un article'
  if (contentKind === 'podcast') return 'Créer un podcast'
  if (contentKind === 'youtube_short') return 'Créer une vidéo courte'
  return 'Créer un contenu'
}
