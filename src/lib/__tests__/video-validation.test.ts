import { describe, it, expect } from 'vitest'
import { computePercentWatched, isWatchedEnough, remainingToWatch, isPdfUnlocked, WATCH_THRESHOLD, resolveVideoSource, hasPlayableVideo } from '@/lib/formations/video-validation'

describe('computePercentWatched', () => {
  it('renvoie 0 sans durée', () => {
    expect(computePercentWatched(50, 0)).toBe(0)
  })
  it('calcule le pourcentage', () => {
    expect(computePercentWatched(90, 100)).toBe(90)
    expect(computePercentWatched(45, 90)).toBe(50)
  })
  it('borne à 100 et ignore le négatif', () => {
    expect(computePercentWatched(200, 100)).toBe(100)
    expect(computePercentWatched(-10, 100)).toBe(0)
  })
})

describe('isWatchedEnough (seuil 90)', () => {
  it('exige le seuil', () => {
    expect(WATCH_THRESHOLD).toBe(90)
    expect(isWatchedEnough(89)).toBe(false)
    expect(isWatchedEnough(90)).toBe(true)
    expect(isWatchedEnough(100)).toBe(true)
  })
})

describe('remainingToWatch', () => {
  it('calcule le restant', () => {
    expect(remainingToWatch(0)).toBe(90)
    expect(remainingToWatch(50)).toBe(40)
    expect(remainingToWatch(90)).toBe(0)
    expect(remainingToWatch(100)).toBe(0)
  })
})

describe('isPdfUnlocked', () => {
  it('déverrouille seulement si inscrit, non verrouillé et module validé', () => {
    expect(isPdfUnlocked({ enrolled: true, locked: false, completed: true })).toBe(true)
    expect(isPdfUnlocked({ enrolled: true, locked: false, completed: false })).toBe(false)
    expect(isPdfUnlocked({ enrolled: false, locked: false, completed: true })).toBe(false)
    expect(isPdfUnlocked({ enrolled: true, locked: true, completed: true })).toBe(false)
  })
})

describe('resolveVideoSource (hybride)', () => {
  it('respecte source_video explicite', () => {
    expect(resolveVideoSource({ source_video: 'internal', youtube_id: 'abc' })).toBe('internal')
    expect(resolveVideoSource({ source_video: 'none', youtube_id: 'abc' })).toBe('none')
  })
  it('déduit de l’existant (rétro-compatible)', () => {
    expect(resolveVideoSource({ youtube_id: 'abc' })).toBe('youtube')
    expect(resolveVideoSource({ video_path: 'videos/x.mp4' })).toBe('internal')
    expect(resolveVideoSource({})).toBe('none')
  })
})

describe('hasPlayableVideo', () => {
  it('vrai selon la source', () => {
    expect(hasPlayableVideo({ source_video: 'youtube', youtube_id: 'abc' })).toBe(true)
    expect(hasPlayableVideo({ source_video: 'youtube' })).toBe(false)
    expect(hasPlayableVideo({ source_video: 'internal', video_path: 'videos/x.mp4' })).toBe(true)
    expect(hasPlayableVideo({ source_video: 'internal' })).toBe(false)
    expect(hasPlayableVideo({ source_video: 'none', youtube_id: 'abc' })).toBe(false)
  })
})
