import { describe, expect, it } from 'vitest'
import {
  buildSuggestedWeeklyDates,
  buildEditorialWorkspaceReadModel,
  formatEditorialAction,
  formatEditorialChannel,
  getEditorialToday,
  getWeeklyCapacity,
  selectCalendarRecommendations,
  selectWeeklyRecommendations,
} from './workspace-planning'

type FixtureRecommendation = {
  id: string
  status: 'PROPOSED' | 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED' | 'REJECTED'
  priorityBand: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  scheduledFor?: string | null
}

const recommendations = (count: number): FixtureRecommendation[] => Array.from({ length: count }, (_, index) => ({
  id: `rec-${index + 1}`,
  status: 'PROPOSED',
  priorityBand: index < 15 ? 'FORTE' : 'NORMALE',
  scheduledFor: index === 0 ? '2026-08-01' : null,
}))

describe('editorial workspace planning', () => {
  it('limits the weekly plan to the configured capacity while preserving all detected opportunities', () => {
    const detected = recommendations(50)

    expect(getWeeklyCapacity({ weeklyCapacity: { weeklyTotal: 10 } })).toBe(10)
    expect(selectWeeklyRecommendations(detected, 10)).toHaveLength(10)
    expect(detected).toHaveLength(50)
  })

  it('builds the page workspace read model from the configured capacity without truncating opportunities', () => {
    const detected = recommendations(50)
    const model = buildEditorialWorkspaceReadModel(detected, { weeklyCapacity: { weeklyTotal: 10 }, timezone: 'Africa/Abidjan' }, new Date('2026-08-27T12:00:00.000Z'))

    expect(model.opportunities).toHaveLength(50)
    expect(model.weeklyCapacity).toBe(10)
    expect(model.weeklyRecommendations).toHaveLength(10)
    expect(model.priorities).toHaveLength(5)
    expect(model.priorities).toEqual(model.weeklyRecommendations.slice(0, 5))
  })

  it('uses the UI-only fallback capacity when weekly capacity is missing, zero, or invalid', () => {
    expect(buildEditorialWorkspaceReadModel(recommendations(50), {}, new Date('2026-08-27T12:00:00.000Z')).weeklyCapacity).toBe(10)
    expect(buildEditorialWorkspaceReadModel(recommendations(50), { weeklyCapacity: { weeklyTotal: 0 } }, new Date('2026-08-27T12:00:00.000Z')).weeklyCapacity).toBe(10)
    expect(buildEditorialWorkspaceReadModel(recommendations(50), { weeklyCapacity: { weeklyTotal: Number.NaN } }, new Date('2026-08-27T12:00:00.000Z')).weeklyCapacity).toBe(10)
    expect(buildEditorialWorkspaceReadModel(recommendations(50), { weeklyCapacity: { weeklyTotal: Number.POSITIVE_INFINITY } }, new Date('2026-08-27T12:00:00.000Z')).weeklyCapacity).toBe(10)
  })

  it('resolves editorial today from the configured timezone rather than UTC', () => {
    const instant = new Date('2026-08-27T23:30:00.000Z')

    expect(getEditorialToday('Africa/Abidjan', instant)).toBe('2026-08-27')
    expect(getEditorialToday('Pacific/Auckland', instant)).toBe('2026-08-28')
  })

  it('uses UTC when the editorial timezone is missing or invalid', () => {
    const instant = new Date('2026-08-27T23:30:00.000Z')

    expect(getEditorialToday(undefined, instant)).toBe('2026-08-27')
    expect(getEditorialToday('Invalid/Timezone', instant)).toBe('2026-08-27')
  })

  it('keeps immediate priorities within five items from the weekly plan', () => {
    const weeklyPlan = selectWeeklyRecommendations(recommendations(10), 10)

    expect(weeklyPlan.slice(0, 5)).toHaveLength(5)
    expect(weeklyPlan.map((item) => item.id)).toEqual(['rec-1', 'rec-2', 'rec-3', 'rec-4', 'rec-5', 'rec-6', 'rec-7', 'rec-8', 'rec-9', 'rec-10'])
  })

  it('assigns deterministic suggested dates across the next seven days without mutating persisted dates', () => {
    const weeklyPlan = selectWeeklyRecommendations(recommendations(10), 10)
    const firstPlan = buildSuggestedWeeklyDates(weeklyPlan, '2026-08-27')
    const secondPlan = buildSuggestedWeeklyDates(weeklyPlan, '2026-08-27')

    expect(firstPlan.map((item) => item.suggestedFor)).toEqual([
      '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31',
      '2026-09-01', '2026-09-02', '2026-08-27', '2026-08-28', '2026-08-29',
    ])
    expect(secondPlan).toEqual(firstPlan)
    expect(new Set(firstPlan.map((item) => item.suggestedFor)).size).toBeGreaterThan(1)
    expect(weeklyPlan[0].scheduledFor).toBe('2026-08-01')
    expect(firstPlan[0]).not.toBe(weeklyPlan[0])
  })

  it('selects only human-committed recommendations for the calendar', () => {
    const selected = selectCalendarRecommendations([
      { id: 'proposed', status: 'PROPOSED' },
      { id: 'accepted', status: 'ACCEPTED' },
      { id: 'scheduled', status: 'SCHEDULED' },
      { id: 'completed', status: 'COMPLETED' },
      { id: 'rejected', status: 'REJECTED' },
    ])

    expect(selected.map((item) => item.id)).toEqual(['accepted', 'scheduled', 'completed'])
  })

  it('formats editorial actions and channels in human French', () => {
    expect(formatEditorialAction({ recommendationKind: 'REPURPOSE', contentKind: 'article', targetChannel: 'web' })).toBe('Décliner en article')
    expect(formatEditorialAction({ recommendationKind: 'PROMOTE', targetChannel: 'whatsapp' })).toBe('Promouvoir sur WhatsApp')
    expect(formatEditorialAction({ recommendationKind: 'CREATE', contentKind: 'article' })).toBe('Créer un article')
    expect(formatEditorialChannel('web')).toBe('Site web')
  })
})
