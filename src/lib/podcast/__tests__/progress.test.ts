import { describe, it, expect } from 'vitest'
import {
  computeCompleted,
  resumePositionSeconds,
  shouldPersist,
  buildContinueListening,
  COMPLETION_RATIO,
  type AudioProgressRow,
} from '@/lib/podcast/progress'

const row = (p: Partial<AudioProgressRow> = {}): AudioProgressRow => ({
  podcast_id: 'x',
  position_seconds: 0,
  duration_seconds: 100,
  completed: false,
  last_played_at: '2026-08-12T00:00:00Z',
  ...p,
})

describe('computeCompleted', () => {
  it('ended fiable → terminé', () => {
    expect(computeCompleted(10, 100, true)).toBe(true)
  })
  it('seuil 95 % sinon', () => {
    expect(computeCompleted(94, 100)).toBe(false)
    expect(computeCompleted(95, 100)).toBe(true)
    expect(computeCompleted(100, 100)).toBe(true)
  })
  it('durée inconnue/0 → jamais terminé par seuil', () => {
    expect(computeCompleted(999, 0)).toBe(false)
    expect(computeCompleted(999, null)).toBe(false)
  })
})

describe('resumePositionSeconds', () => {
  it('reprend à la position enregistrée', () => {
    expect(resumePositionSeconds(row({ position_seconds: 42 }))).toBe(42)
  })
  it('terminé → 0', () => {
    expect(resumePositionSeconds(row({ position_seconds: 42, completed: true }))).toBe(0)
  })
  it('position ≤ 0 ou absente → 0', () => {
    expect(resumePositionSeconds(row({ position_seconds: 0 }))).toBe(0)
    expect(resumePositionSeconds(null)).toBe(0)
  })
  it('garde-fou position > durée → 0', () => {
    expect(resumePositionSeconds(row({ position_seconds: 150, duration_seconds: 100 }))).toBe(0)
  })
  it('trop proche de la fin (< 5 s restantes) → 0 (ne reprend pas à 99,9 %)', () => {
    expect(resumePositionSeconds(row({ position_seconds: 96, duration_seconds: 100 }))).toBe(0)
    expect(resumePositionSeconds(row({ position_seconds: 90, duration_seconds: 100 }))).toBe(90)
  })
})

describe('shouldPersist (throttling)', () => {
  it('force → toujours', () => {
    expect(shouldPersist({ position: 10, completed: false }, { position: 11, completed: false }, true)).toBe(true)
  })
  it('passage à terminé → oui', () => {
    expect(shouldPersist({ position: 90, completed: false }, { position: 100, completed: true })).toBe(true)
  })
  it('petit delta < 15 s → non', () => {
    expect(shouldPersist({ position: 10, completed: false }, { position: 20, completed: false })).toBe(false)
  })
  it('delta ≥ 15 s → oui', () => {
    expect(shouldPersist({ position: 10, completed: false }, { position: 25, completed: false })).toBe(true)
  })
  it('premier enregistrement : seulement si position > 0', () => {
    expect(shouldPersist(null, { position: 0, completed: false })).toBe(false)
    expect(shouldPersist(null, { position: 3, completed: false })).toBe(true)
  })
})

describe('buildContinueListening', () => {
  const eps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('commencés + non terminés + accessibles, triés last_played_at DESC', () => {
    const progress: AudioProgressRow[] = [
      row({ podcast_id: 'a', position_seconds: 30, last_played_at: '2026-08-10T00:00:00Z' }),
      row({ podcast_id: 'b', position_seconds: 50, last_played_at: '2026-08-12T00:00:00Z' }),
      row({ podcast_id: 'c', position_seconds: 98, completed: true }),          // terminé → exclu
      row({ podcast_id: 'z', position_seconds: 10 }),                            // hors catalogue → exclu
      row({ podcast_id: 'a2', position_seconds: 0 }),                            // non commencé → exclu
    ]
    const out = buildContinueListening(eps, progress)
    expect(out.map((i) => i.episode.id)).toEqual(['b', 'a']) // b plus récent
    expect(out[0].percent).toBeCloseTo(0.5)
    expect(out[0].remainingSeconds).toBe(50)
  })
  it('exclut aussi un épisode quasi-fini sans flag completed', () => {
    const progress: AudioProgressRow[] = [row({ podcast_id: 'a', position_seconds: Math.ceil(COMPLETION_RATIO * 100) })]
    expect(buildContinueListening(eps, progress)).toEqual([])
  })
  it('liste vide si aucune progression', () => {
    expect(buildContinueListening(eps, [])).toEqual([])
  })
})
