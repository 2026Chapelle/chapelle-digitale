import { describe, it, expect } from 'vitest'
import {
  isDailyUnlockParcours,
  computeNextAvailableAt,
  isAvailableAt,
  evaluateDailyLock,
  formatRemainingUntil,
  DAILY_UNLOCK_PARCOURS_SLUGS,
  DAILY_LOCK_MESSAGE,
} from '@/lib/formations/module-daily-unlock'

describe('isDailyUnlockParcours', () => {
  it('reconnaît les 4 parcours d\'intégration', () => {
    expect(DAILY_UNLOCK_PARCOURS_SLUGS).toHaveLength(4)
    for (const slug of DAILY_UNLOCK_PARCOURS_SLUGS) {
      expect(isDailyUnlockParcours(slug)).toBe(true)
    }
  })

  it('n\'applique PAS la règle hors périmètre', () => {
    expect(isDailyUnlockParcours('masterclass-elevation')).toBe(false)
    expect(isDailyUnlockParcours('lois-elevation-divine')).toBe(false)
    expect(isDailyUnlockParcours(null)).toBe(false)
    expect(isDailyUnlockParcours(undefined)).toBe(false)
    expect(isDailyUnlockParcours('')).toBe(false)
  })
})

describe('computeNextAvailableAt — Option C', () => {
  it('Cas 1 : validation en journée → lendemain 00:00 UTC', () => {
    // 10/07/2026 à 14:35 → 11/07/2026 à 00:00
    const next = computeNextAvailableAt('2026-07-10T14:35:00.000Z')
    expect(next.toISOString()).toBe('2026-07-11T00:00:00.000Z')
  })

  it('Cas 2 : validation juste avant minuit → lendemain 00:00 (quelques minutes)', () => {
    // 10/07/2026 à 23:58 → 11/07/2026 à 00:00
    const next = computeNextAvailableAt('2026-07-10T23:58:00.000Z')
    expect(next.toISOString()).toBe('2026-07-11T00:00:00.000Z')
    const nowAlmostMidnight = new Date('2026-07-10T23:59:00.000Z')
    expect(isAvailableAt(nowAlmostMidnight, next)).toBe(false)
    const afterMidnight = new Date('2026-07-11T00:00:00.000Z')
    expect(isAvailableAt(afterMidnight, next)).toBe(true)
  })

  it('Cas 3 : dernier module — pas de next_available si pas de prereq (évalué ailleurs)', () => {
    // Sans prereqCompletedAt, evaluateDailyLock ne verrouille jamais
    const r = evaluateDailyLock('nouveau-croyant', null, new Date('2026-07-10T15:00:00.000Z'))
    expect(r.locked).toBe(false)
    expect(r.next_available_at).toBeNull()
  })

  it('utilisateur revenant plusieurs jours après → déjà débloqué', () => {
    const completedAt = '2026-07-10T14:35:00.000Z'
    const now = new Date('2026-07-15T10:00:00.000Z')
    const r = evaluateDailyLock('je-stabilise-ma-foi', completedAt, now)
    expect(r.locked).toBe(false)
    expect(isAvailableAt(now, computeNextAvailableAt(completedAt))).toBe(true)
  })

  it('plusieurs utilisateurs, horaires différents → next_available_at indépendants', () => {
    const u1 = computeNextAvailableAt('2026-07-10T09:00:00.000Z')
    const u2 = computeNextAvailableAt('2026-07-10T22:30:00.000Z')
    // Même jour de validation → même minuit suivant
    expect(u1.toISOString()).toBe('2026-07-11T00:00:00.000Z')
    expect(u2.toISOString()).toBe('2026-07-11T00:00:00.000Z')

    const u3 = computeNextAvailableAt('2026-07-11T01:00:00.000Z')
    expect(u3.toISOString()).toBe('2026-07-12T00:00:00.000Z')
  })
})

describe('evaluateDailyLock', () => {
  const midday = new Date('2026-07-10T14:35:00.000Z')
  const evening = new Date('2026-07-10T20:00:00.000Z')
  const nextMidnight = new Date('2026-07-11T00:00:00.000Z')

  it('verrouille le module suivant le jour de validation', () => {
    const r = evaluateDailyLock('nouveau-croyant', midday, evening)
    expect(r.locked).toBe(true)
    expect(r.next_available_at).toBe('2026-07-11T00:00:00.000Z')
    expect(r.remaining_label).toMatch(/Disponible dans/)
  })

  it('débloque exactement à minuit', () => {
    const r = evaluateDailyLock('je-decouvre-la-maison', midday, nextMidnight)
    expect(r.locked).toBe(false)
  })

  it('hors périmètre : jamais de verrou daily même le jour même', () => {
    const r = evaluateDailyLock('autre-formation', midday, evening)
    expect(r.locked).toBe(false)
    expect(r.next_available_at).toBeNull()
  })

  it('premier module (pas de prereq) : pas de verrou daily', () => {
    const r = evaluateDailyLock('je-deviens-disciple-actif', undefined, evening)
    expect(r.locked).toBe(false)
  })
})

describe('formatRemainingUntil + message UX', () => {
  it('produit un compteur lisible', () => {
    const now = new Date('2026-07-10T15:36:00.000Z')
    const next = new Date('2026-07-11T00:00:00.000Z')
    // 8h 24min
    expect(formatRemainingUntil(now, next)).toBe('Disponible dans 8h 24min.')
  })

  it('message principal stable', () => {
    expect(DAILY_LOCK_MESSAGE).toContain('00h00')
  })
})
