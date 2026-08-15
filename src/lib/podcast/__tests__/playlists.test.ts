import { describe, it, expect } from 'vitest'
import {
  resolvePlaylistCover, nextItemPosition, sortItems, computeReorder,
  parseDurationToSeconds, totalDurationSeconds, durationLabel,
  buildAddToPlaylistRows, type Playlist,
} from '@/lib/podcast/playlists'

const pl = (id: string, type: 'personal' | 'official' = 'personal'): Playlist => ({
  id, playlist_type: type, owner_user_id: type === 'personal' ? 'u1' : null,
  title: `PL ${id}`, description: null, cover_url: null, visibility: 'private',
})

describe('resolvePlaylistCover', () => {
  it('cover administrée prioritaire, sinon 1er épisode, sinon null', () => {
    expect(resolvePlaylistCover('/admin.jpg', '/ep.jpg')).toBe('/admin.jpg')
    expect(resolvePlaylistCover(null, '/ep.jpg')).toBe('/ep.jpg')
    expect(resolvePlaylistCover('  ', '/ep.jpg')).toBe('/ep.jpg')
    expect(resolvePlaylistCover(null, null)).toBeNull()
  })
})

describe('nextItemPosition', () => {
  it('0 si vide, sinon max+1', () => {
    expect(nextItemPosition([])).toBe(0)
    expect(nextItemPosition([{ position: 0 }, { position: 3 }, { position: 1 }])).toBe(4)
  })
})

describe('sortItems', () => {
  it('trie par position croissante, sans muter', () => {
    const src = [{ position: 2 }, { position: 0 }, { position: 1 }]
    expect(sortItems(src).map((i) => i.position)).toEqual([0, 1, 2])
    expect(src[0].position).toBe(2) // non muté
  })
})

describe('computeReorder', () => {
  it('assigne 0..n-1 selon l’ordre', () => {
    expect(computeReorder(['c', 'a', 'b'])).toEqual([
      { podcastId: 'c', position: 0 }, { podcastId: 'a', position: 1 }, { podcastId: 'b', position: 2 },
    ])
  })
})

describe('parseDurationToSeconds', () => {
  it('formats variés', () => {
    expect(parseDurationToSeconds('42 min')).toBe(2520)
    expect(parseDurationToSeconds('12:34')).toBe(754)
    expect(parseDurationToSeconds('1:02:03')).toBe(3723)
    expect(parseDurationToSeconds(3723)).toBe(3723)
    expect(parseDurationToSeconds('n/a')).toBeNull()
    expect(parseDurationToSeconds(null)).toBeNull()
  })
})

describe('buildAddToPlaylistRows (menu ⋯ « Ajouter à une playlist »)', () => {
  it('ne garde que les playlists PERSONNELLES + état « déjà présent »', () => {
    const rows = buildAddToPlaylistRows([pl('a'), pl('off', 'official'), pl('b')], ['b'])
    expect(rows.map((r) => r.playlist.id)).toEqual(['a', 'b']) // officielle exclue
    expect(rows.find((r) => r.playlist.id === 'b')?.contains).toBe(true)
    expect(rows.find((r) => r.playlist.id === 'a')?.contains).toBe(false)
  })
  it('accepte un Set comme un tableau ; robuste au vide/null', () => {
    expect(buildAddToPlaylistRows([pl('a')], new Set(['a']))[0].contains).toBe(true)
    expect(buildAddToPlaylistRows([pl('a')], [])[0].contains).toBe(false)
    expect(buildAddToPlaylistRows([], ['x'])).toEqual([])
  })
})

describe('totalDurationSeconds + durationLabel', () => {
  it('somme les durées connues, null si aucune', () => {
    expect(totalDurationSeconds(['42 min', '12:00', null])).toBe(2520 + 720)
    expect(totalDurationSeconds([null, 'x'])).toBeNull()
  })
  it('label lisible', () => {
    expect(durationLabel(2520 + 720)).toBe('54 min')
    expect(durationLabel(3600 + 720)).toBe('1 h 12')
    expect(durationLabel(null)).toBe('')
    expect(durationLabel(0)).toBe('')
  })
})
