import { describe, it, expect } from 'vitest'
import { reduceTracker, initTrackerState, type TrackerState, type PlaybackSample } from '../audio-tracking'

function sample(p: Partial<PlaybackSample>): PlaybackSample {
  return {
    id: p.id ?? 'ep1',
    playing: p.playing ?? true,
    positionSeconds: p.positionSeconds ?? 0,
    percent: p.percent ?? 0,
    startAt: p.startAt ?? 0,
    ended: p.ended ?? false,
  }
}

/** Rejoue une séquence d'échantillons et concatène tous les événements émis. */
function run(samples: PlaybackSample[], init: TrackerState | null = null) {
  let state = init
  const all: string[] = []
  for (const s of samples) {
    const r = reduceTracker(state, s)
    state = r.state
    all.push(...r.events.map((e) => e.eventType))
  }
  return { state, events: all }
}

describe('reduceTracker — play validé après lecture réelle', () => {
  it('première lecture → exactement 1 play_start (après MIN_PLAY_SECONDS)', () => {
    const { events } = run([
      sample({ positionSeconds: 0, playing: true }),   // trop tôt
      sample({ positionSeconds: 1, playing: true }),   // trop tôt
      sample({ positionSeconds: 3, playing: true }),   // ≥ 2s → play_start
    ])
    expect(events).toEqual(['play_start'])
  })

  it('re-render au même point → aucun second play_start', () => {
    const { events } = run([
      sample({ positionSeconds: 3, playing: true }),
      sample({ positionSeconds: 3, playing: true }),
      sample({ positionSeconds: 3, playing: true }),
    ])
    expect(events).toEqual(['play_start'])
  })

  it('clic qui n\'aboutit jamais à la lecture (média refusé / autoplay bloqué) → aucun play', () => {
    // playing reste false ou position ne dépasse jamais le seuil.
    const { events } = run([
      sample({ positionSeconds: 0, playing: false }),
      sample({ positionSeconds: 0, playing: false }),
    ])
    expect(events).toEqual([])
  })

  it('pause immédiate avant le seuil → aucun play', () => {
    const { events } = run([
      sample({ positionSeconds: 1, playing: true }),
      sample({ positionSeconds: 1, playing: false }),
    ])
    expect(events).toEqual([])
  })
})

describe('reduceTracker — reprise (PODCAST-2)', () => {
  it('startAt > 0 → play_resume et non play_start', () => {
    const { events } = run([
      sample({ startAt: 300, positionSeconds: 300, percent: 50, playing: true }),   // trop tôt (300 < 300+2)
      sample({ startAt: 300, positionSeconds: 303, percent: 51, playing: true }),   // ≥ base+2 → resume
    ])
    expect(events[0]).toBe('play_resume')
    expect(events.filter((e) => e === 'play_start')).toHaveLength(0)
  })
})

describe('reduceTracker — checkpoints', () => {
  it('émet chaque seuil une seule fois, dans l\'ordre', () => {
    const { events } = run([
      sample({ positionSeconds: 3, percent: 5, playing: true }),    // play_start
      sample({ positionSeconds: 30, percent: 25, playing: true }),  // 25
      sample({ positionSeconds: 31, percent: 26, playing: true }),  // rien (déjà 25)
      sample({ positionSeconds: 60, percent: 55, playing: true }),  // 50
      sample({ positionSeconds: 90, percent: 80, playing: true }),  // 75
    ])
    expect(events).toEqual(['play_start', 'progress_checkpoint', 'progress_checkpoint', 'progress_checkpoint'])
  })

  it('un seek arrière ne re-déclenche pas un seuil déjà émis', () => {
    const { events } = run([
      sample({ positionSeconds: 3, percent: 5, playing: true }),
      sample({ positionSeconds: 60, percent: 55, playing: true }),  // franchit 25 et 50 d'un coup
      sample({ positionSeconds: 30, percent: 25, playing: true }),  // seek arrière → rien
    ])
    // play_start + checkpoints 25 & 50 (un seul passage), pas de re-émission.
    expect(events.filter((e) => e === 'progress_checkpoint')).toHaveLength(2)
  })

  it('aucun checkpoint avant que le play soit validé', () => {
    const { events } = run([
      sample({ positionSeconds: 0, percent: 30, playing: false }),  // pas encore démarré
    ])
    expect(events).toEqual([])
  })
})

describe('reduceTracker — completed', () => {
  it('fin réelle → completed une seule fois', () => {
    const { events } = run([
      sample({ positionSeconds: 3, percent: 5, playing: true }),
      sample({ positionSeconds: 600, percent: 100, ended: true, playing: true }),
      sample({ positionSeconds: 600, percent: 100, ended: true, playing: false }),  // pas de doublon
    ])
    expect(events.filter((e) => e === 'completed')).toHaveLength(1)
  })

  it('percent >= 100 sans flag ended vaut aussi completed', () => {
    const { events } = run([
      sample({ positionSeconds: 3, percent: 5, playing: true }),
      sample({ positionSeconds: 600, percent: 100, ended: false, playing: true }),
    ])
    expect(events.filter((e) => e === 'completed')).toHaveLength(1)
  })
})

describe('reduceTracker — changement d\'épisode', () => {
  it('nouvel id → l\'état repart de zéro (nouveau play_start)', () => {
    const first = reduceTracker(null, sample({ id: 'ep1', positionSeconds: 3, playing: true }))
    expect(first.events.map((e) => e.eventType)).toEqual(['play_start'])
    const second = reduceTracker(first.state, sample({ id: 'ep2', positionSeconds: 3, playing: true }))
    expect(second.events.map((e) => e.eventType)).toEqual(['play_start'])
    expect(second.state.id).toBe('ep2')
  })

  it('initTrackerState règle resumeBase selon startAt', () => {
    expect(initTrackerState('x', 0).resumeBase).toBe(0)
    expect(initTrackerState('x', 120).resumeBase).toBe(120)
  })
})
