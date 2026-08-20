import { describe, it, expect } from 'vitest'
import { weekdayLabels, formatStartTime, scheduleLabel, normalizeProgram } from '../programs'

describe('weekdayLabels', () => {
  it('mappe les jours dans l’ordre fourni', () => {
    expect(weekdayLabels([1, 3, 5])).toEqual(['Lun', 'Mer', 'Ven'])
    expect(weekdayLabels([0])).toEqual(['Dim'])
  })
  it('ignore les valeurs hors domaine', () => {
    expect(weekdayLabels([7, -1, 2])).toEqual(['Mar'])
  })
})

describe('formatStartTime', () => {
  it('normalise une heure SQL time en HH:MM', () => {
    expect(formatStartTime('05:30:00')).toBe('05:30')
    expect(formatStartTime('5:30')).toBe('05:30')
    expect(formatStartTime('19:30')).toBe('19:30')
  })
  it('null/invalide → null', () => {
    expect(formatStartTime(null)).toBeNull()
    expect(formatStartTime('')).toBeNull()
    expect(formatStartTime('abc')).toBeNull()
  })
})

describe('scheduleLabel', () => {
  it('jours + heure', () => {
    expect(scheduleLabel({ weekdays: [1, 3, 5], startTime: '05:30', scheduleNote: null })).toBe('Lun, Mer, Ven · 05:30')
  })
  it('jours seuls', () => {
    expect(scheduleLabel({ weekdays: [0], startTime: null, scheduleNote: null })).toBe('Dim')
  })
  it('irrégulier → note', () => {
    expect(scheduleLabel({ weekdays: [], startTime: null, scheduleNote: 'Selon programmation' })).toBe('Selon programmation')
  })
  it('rien → null', () => {
    expect(scheduleLabel({ weekdays: [], startTime: null, scheduleNote: null })).toBeNull()
  })
})

describe('normalizeProgram', () => {
  it('normalise une ligne brute + construit l’embed playlist', () => {
    const p = normalizeProgram({
      id: 'p1', slug: 'matinale', title: 'Matinale',
      weekdays: ['1', '3', '5'], start_time: '05:30:00', timezone: 'Africa/Abidjan',
      youtube_playlist_id: 'PLxABC', description: '  ', image_url: null, is_active: true, status: 'published',
    })
    expect(p.weekdays).toEqual([1, 3, 5])
    expect(p.startTime).toBe('05:30')
    expect(p.description).toBeNull()
    expect(p.playlistId).toBe('PLxABC')
    expect(p.playlistEmbedUrl).toContain('videoseries?list=PLxABC')
  })
  it('sans playlist → embed null', () => {
    const p = normalizeProgram({ slug: 's', title: 'T', youtube_playlist_id: null })
    expect(p.playlistId).toBeNull()
    expect(p.playlistEmbedUrl).toBeNull()
    expect(p.timezone).toBe('Africa/Abidjan')
  })
})
