import { describe, it, expect } from 'vitest'
import { weekdayLabels, formatStartTime, scheduleLabel, normalizeProgram, programWeeklySlots } from '../programs'

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

describe('programWeeklySlots', () => {
  it('éclate les programmes en créneaux/jour, triés par jour puis heure', () => {
    const progs = [
      normalizeProgram({ slug: 'matinale', title: 'Matinale', weekdays: [1, 3, 5], start_time: '05:30:00' }),
      normalizeProgram({ slug: 'culte', title: 'Culte', weekdays: [0], start_time: '10:30:00' }),
    ]
    const s = programWeeklySlots(progs)
    expect(s).toHaveLength(4)
    expect(s[0]).toMatchObject({ label: 'Culte', jour: 'Dimanche', heure: '10h30', dayIndex: 0, hour: 10, min: 30 })
    expect(s[1]).toMatchObject({ label: 'Matinale', jour: 'Lundi', heure: '05h30', dayIndex: 1 })
    expect(s.map((x) => x.dayIndex)).toEqual([0, 1, 3, 5])
  })
  it('ignore les programmes sans heure ou irréguliers', () => {
    const progs = [
      normalizeProgram({ slug: 'a', title: 'A', weekdays: [2], start_time: null }),
      normalizeProgram({ slug: 'b', title: 'B', weekdays: [], start_time: '09:00:00' }),
    ]
    expect(programWeeklySlots(progs)).toEqual([])
  })
})
