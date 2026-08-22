import { describe, it, expect } from 'vitest'
import { conversionCountSpecs } from '../count-specs'

const SINCE = '2026-08-22T00:00:00.000Z'

describe('conversionCountSpecs', () => {
  const specs = conversionCountSpecs({ sinceTodayIso: SINCE })

  it('les dons ne comptent QUE les paiements complétés, sur date_creation', () => {
    expect(specs.donationsConfirmed.table).toBe('dons')
    expect(specs.donationsConfirmed.filters).toEqual([
      { op: 'eq', col: 'statut', val: 'complete' },
      { op: 'gte', col: 'date_creation', val: SINCE },
    ])
  })

  it('les inscriptions événement excluent les simples rappels', () => {
    expect(specs.eventRegistrations.table).toBe('event_registrations')
    expect(specs.eventRegistrations.filters).toContainEqual({
      op: 'in',
      col: 'type',
      vals: ['inscription', 'participation'],
    })
  })

  it('les écoutes podcast filtrent play_start/resume sur occurred_at', () => {
    expect(specs.podcastPlays.table).toBe('audio_listening_events')
    expect(specs.podcastPlays.filters).toContainEqual({
      op: 'in',
      col: 'event_type',
      vals: ['play_start', 'play_resume'],
    })
    expect(specs.podcastPlays.filters).toContainEqual({ op: 'gte', col: 'occurred_at', val: SINCE })
  })

  it('les visites comptent les pageview sur analytics_events.created_at', () => {
    expect(specs.pageViews.table).toBe('analytics_events')
    expect(specs.pageViews.filters).toContainEqual({ op: 'eq', col: 'type', val: 'pageview' })
  })

  it('complétions de module sur completed_at ; inscriptions sur profiles.created_at', () => {
    expect(specs.moduleCompletions.table).toBe('module_completions')
    expect(specs.moduleCompletions.filters).toContainEqual({ op: 'gte', col: 'completed_at', val: SINCE })
    expect(specs.signups.table).toBe('profiles')
    expect(specs.prayerRequests.table).toBe('priere_demandes')
  })
})
