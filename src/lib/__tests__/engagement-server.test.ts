import { describe, it, expect } from 'vitest'
import { dayKey, activeDaysFromSessions, scoreFromSignals, type EngagementSignals } from '@/lib/pastoral/engagement-server'

const ZERO: EngagementSignals = { lives: 0, downloads: 0, prieres: 0, prieres_sans_suivi: 0, formations: 0, formations_abandonnees: 0, events: 0, dons: 0 }
const NOW = Date.parse('2026-06-05T12:00:00Z')

describe('dayKey', () => {
  it('extrait le jour UTC', () => {
    expect(dayKey('2026-06-05T18:00:00Z')).toBe('2026-06-05')
    expect(dayKey('2026-06-05T23:59:59Z')).toBe('2026-06-05')
  })
})

describe('activeDaysFromSessions', () => {
  it('compte les jours DISTINCTS par membre sur 30 j', () => {
    const m = activeDaysFromSessions([
      { user_id: 'u1', last_seen: '2026-06-05T08:00:00Z' },
      { user_id: 'u1', last_seen: '2026-06-05T20:00:00Z' }, // même jour → compte 1
      { user_id: 'u1', last_seen: '2026-06-04T10:00:00Z' }, // autre jour
      { user_id: 'u2', last_seen: '2026-06-01T10:00:00Z' },
    ], NOW)
    expect(m.get('u1')).toBe(2)
    expect(m.get('u2')).toBe(1)
  })
  it('exclut hors fenêtre 30 j et les entrées nulles', () => {
    const m = activeDaysFromSessions([
      { user_id: 'u1', last_seen: '2026-01-01T10:00:00Z' }, // > 30 j
      { user_id: null, last_seen: '2026-06-05T10:00:00Z' },
      { user_id: 'u2', last_seen: null },
    ], NOW)
    expect(m.get('u1')).toBeUndefined()
    expect(m.size).toBe(0)
  })
})

describe('scoreFromSignals (réutilise la formule pure engagementScore)', () => {
  it('aucun signal → 0', () => {
    expect(scoreFromSignals(ZERO, 0)).toBe(0)
  })
  it('membre saturé → plafonné à 100', () => {
    expect(scoreFromSignals({ lives: 10, downloads: 10, prieres: 10, prieres_sans_suivi: 0, formations: 5, formations_abandonnees: 0, events: 10, dons: 5 }, 20)).toBe(100)
  })
  it('cas intermédiaire → valeur exacte de la formule', () => {
    // active_days=3 → 9 ; breadth(prieres,formations)=2 → 16 ; formations 1*5=5 ; prieres 2*2=4 = 34
    expect(scoreFromSignals({ ...ZERO, prieres: 2, formations: 1 }, 3)).toBe(34)
  })
})
