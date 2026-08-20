import { describe, it, expect } from 'vitest'
import { overviewCountSpecs, type CountWindow } from '../count-specs'

const W: CountWindow = {
  nowIso: '2026-08-19T18:00:00.000Z',
  sinceTodayIso: '2026-08-19T00:00:00.000Z',
  onlineSinceIso: '2026-08-19T17:58:30.000Z',
}

describe('overviewCountSpecs (pur — verrouille les pièges de l’audit)', () => {
  const specs = overviewCountSpecs(W)

  it('les 5 comptages de la Vue générale sont définis', () => {
    expect(Object.keys(specs).sort()).toEqual(
      ['activeSessionsNow', 'lessonCompletionsToday', 'pageViewsToday', 'podcastStartsToday', 'signupsToday'].sort(),
    )
  })

  it("Visites : analytics_events type='pageview' (PAS 'page_view') + created_at aujourd’hui", () => {
    const s = specs.pageViewsToday
    expect(s.table).toBe('analytics_events')
    expect(s.filters).toContainEqual({ op: 'eq', col: 'type', val: 'pageview' })
    // garde explicite contre la régression 'page_view'
    expect(s.filters.find((f) => f.op === 'eq' && f.col === 'type')).not.toEqual(
      { op: 'eq', col: 'type', val: 'page_view' },
    )
    expect(s.filters).toContainEqual({ op: 'gte', col: 'created_at', val: W.sinceTodayIso })
  })

  it('Sessions actives : analytics_sessions.last_seen ≥ fenêtre en ligne', () => {
    const s = specs.activeSessionsNow
    expect(s.table).toBe('analytics_sessions')
    expect(s.filters).toContainEqual({ op: 'gte', col: 'last_seen', val: W.onlineSinceIso })
  })

  it('Inscriptions : profiles.created_at aujourd’hui', () => {
    const s = specs.signupsToday
    expect(s.table).toBe('profiles')
    expect(s.filters).toContainEqual({ op: 'gte', col: 'created_at', val: W.sinceTodayIso })
  })

  it('Écoutes podcast : audio_listening_events play_start/resume + occurred_at (pas created_at)', () => {
    const s = specs.podcastStartsToday
    expect(s.table).toBe('audio_listening_events')
    expect(s.filters).toContainEqual({ op: 'in', col: 'event_type', vals: ['play_start', 'play_resume'] })
    expect(s.filters).toContainEqual({ op: 'gte', col: 'occurred_at', val: W.sinceTodayIso })
    expect(s.filters.some((f) => f.op === 'gte' && f.col === 'created_at')).toBe(false)
  })

  it('Progressions : module_completions.completed_at (immuable) — pas video_progress', () => {
    const s = specs.lessonCompletionsToday
    expect(s.table).toBe('module_completions')
    expect(s.filters).toContainEqual({ op: 'gte', col: 'completed_at', val: W.sinceTodayIso })
  })
})
