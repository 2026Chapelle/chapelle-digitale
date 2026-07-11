import { describe, it, expect } from 'vitest'
import { computePercentWatched, isWatchedEnough, remainingToWatch, isPdfUnlocked, WATCH_THRESHOLD, resolveVideoSource, hasPlayableVideo, extractYouTubeId, resolveYouTubeId, youtubeThumbnail } from '@/lib/formations/video-validation'

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
  // Régression P2 : une URL YouTube collée dans video_url (youtube_id vide) reste jouable.
  it('reconnaît une vidéo YouTube saisie par URL dans video_url', () => {
    expect(hasPlayableVideo({ source_video: 'youtube', video_url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(true)
    expect(hasPlayableVideo({ source_video: 'youtube', video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(true)
    // Vrai bug historique : source youtube + URL non-YouTube et pas d'ID → non jouable.
    expect(hasPlayableVideo({ source_video: 'youtube', video_url: 'https://example.com/x.mp4' })).toBe(false)
  })
})

describe('extractYouTubeId', () => {
  it('extrait l’ID des formats courants', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('renvoie null si non dérivable', () => {
    expect(extractYouTubeId(null)).toBeNull()
    expect(extractYouTubeId('')).toBeNull()
    expect(extractYouTubeId('https://example.com/video.mp4')).toBeNull()
  })
})

describe('resolveYouTubeId', () => {
  it('privilégie youtube_id, sinon dérive de video_url', () => {
    expect(resolveYouTubeId({ youtube_id: 'dQw4w9WgXcQ' })).toBe('dQw4w9WgXcQ')
    expect(resolveYouTubeId({ video_url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe('dQw4w9WgXcQ')
    expect(resolveYouTubeId({ youtube_id: '', video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe('dQw4w9WgXcQ')
    expect(resolveYouTubeId({})).toBeNull()
  })
  it('accepte un youtube_id déjà stocké sous forme d’URL (rétro-compatible)', () => {
    expect(resolveYouTubeId({ youtube_id: 'https://youtu.be/dQw4w9WgXcQ' })).toBe('dQw4w9WgXcQ')
  })
})

describe('youtubeThumbnail', () => {
  it('construit la miniature hqdefault pour une vidéo YouTube', () => {
    expect(youtubeThumbnail({ source_video: 'youtube', youtube_id: 'dQw4w9WgXcQ' }))
      .toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(youtubeThumbnail({ source_video: 'youtube', video_url: 'https://youtu.be/dQw4w9WgXcQ' }))
      .toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })
  it('renvoie null hors YouTube ou sans ID', () => {
    expect(youtubeThumbnail({ source_video: 'internal', video_path: 'videos/x.mp4' })).toBeNull()
    expect(youtubeThumbnail({ source_video: 'none' })).toBeNull()
    expect(youtubeThumbnail({ source_video: 'youtube' })).toBeNull()
  })
})
