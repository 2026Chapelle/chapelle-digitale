import { describe, it, expect, vi } from 'vitest'

// `@/lib/video` est un module produit par un autre chantier (Phase 1A) ;
// on le mocke ici pour construire des `NormalizedLive` déterministes sans
// dépendre de son implémentation réelle.
vi.mock('@/lib/video', () => ({
  resolveVideoSource: vi.fn(
    (input: { youtube_url?: string | null; video_url?: string | null }) => {
      const hasVideo = Boolean(input.youtube_url || input.video_url)
      return {
        kind: hasVideo ? 'youtube' : 'none',
        youtubeId: hasVideo ? 'abc123' : null,
        embedUrl: hasVideo ? 'https://www.youtube.com/embed/abc123' : null,
        fileUrl: null,
        thumbnailUrl: hasVideo ? 'https://img.youtube.com/vi/abc123/hqdefault.jpg' : null,
      }
    },
  ),
}))

import { normalizeLive } from '../normalize'
import {
  partitionLives,
  sortUpcoming,
  sortReplays,
  computeNextLive,
  nextWeeklyOccurrence,
} from '../schedule'
import type { RawCmsLive } from '../types'

const NOW = new Date('2026-08-19T12:00:00Z')

function live(overrides: Partial<RawCmsLive> = {}) {
  return normalizeLive({ title: 'Émission', ...overrides }, NOW)
}

describe('partitionLives', () => {
  it("répartit par état et ignore 'ended'", () => {
    const l1 = live({ id: 'l1', is_live: true })
    const l2 = live({ id: 'l2', status: 'scheduled', scheduled_at: '2026-09-01T10:00:00Z' })
    const l3 = live({
      id: 'l3',
      status: 'ended',
      scheduled_at: '2026-08-01T10:00:00Z',
      youtube_url: 'https://youtu.be/abc123',
    })
    const l4 = live({ id: 'l4', status: 'ended', scheduled_at: '2026-08-01T10:00:00Z' })

    const result = partitionLives([l1, l2, l3, l4], NOW)

    expect(result.live).toEqual([l1])
    expect(result.upcoming).toEqual([l2])
    expect(result.replays).toEqual([l3])
    // l4 (status ended, sans vidéo) n'apparaît dans aucun des 3 groupes.
    expect([...result.live, ...result.upcoming, ...result.replays]).not.toContainEqual(l4)
  })

  it('tableau vide -> 3 listes vides', () => {
    expect(partitionLives([], NOW)).toEqual({ live: [], upcoming: [], replays: [] })
  })
})

describe('sortUpcoming', () => {
  it('trie par scheduledAt croissant, nulls en dernier', () => {
    const a = live({ id: 'a', scheduled_at: '2026-09-10T10:00:00Z' })
    const b = live({ id: 'b', scheduled_at: '2026-09-01T10:00:00Z' })
    const c = live({ id: 'c', scheduled_at: null })
    const d = live({ id: 'd', scheduled_at: '2026-09-05T10:00:00Z' })

    const sorted = sortUpcoming([a, b, c, d])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it("n'altère pas le tableau d'entrée", () => {
    const a = live({ id: 'a', scheduled_at: '2026-09-10T10:00:00Z' })
    const b = live({ id: 'b', scheduled_at: '2026-09-01T10:00:00Z' })
    const input = [a, b]
    sortUpcoming(input)
    expect(input).toEqual([a, b])
  })
})

describe('sortReplays', () => {
  it('trie du plus récent au plus ancien, nulls en dernier', () => {
    const a = live({
      id: 'a',
      status: 'ended',
      scheduled_at: '2026-08-01T10:00:00Z',
      youtube_url: 'https://youtu.be/abc123',
    })
    const b = live({
      id: 'b',
      status: 'ended',
      scheduled_at: '2026-08-10T10:00:00Z',
      youtube_url: 'https://youtu.be/abc123',
    })
    const c = live({
      id: 'c',
      status: 'ended',
      scheduled_at: null,
      youtube_url: 'https://youtu.be/abc123',
    })
    const d = live({
      id: 'd',
      status: 'ended',
      scheduled_at: '2026-08-05T10:00:00Z',
      youtube_url: 'https://youtu.be/abc123',
    })

    const sorted = sortReplays([a, b, c, d])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('départage par sort_order (croissant) à date égale', () => {
    const scheduled_at = '2026-08-10T10:00:00Z'
    const a = live({
      id: 'a',
      status: 'ended',
      scheduled_at,
      sort_order: 2,
      youtube_url: 'https://youtu.be/abc123',
    })
    const b = live({
      id: 'b',
      status: 'ended',
      scheduled_at,
      sort_order: 1,
      youtube_url: 'https://youtu.be/abc123',
    })

    const sorted = sortReplays([a, b])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a'])
  })
})

describe('computeNextLive', () => {
  it('retourne le prochain upcoming au scheduledAt le plus proche', () => {
    const far = live({ id: 'far', status: 'scheduled', scheduled_at: '2026-10-01T10:00:00Z' })
    const near = live({ id: 'near', status: 'scheduled', scheduled_at: '2026-08-20T10:00:00Z' })

    expect(computeNextLive([far, near], NOW)?.id).toBe('near')
  })

  it("à défaut d'upcoming, retourne un live en cours", () => {
    const inProgress = live({ id: 'now', is_live: true })
    const replay = live({
      id: 'r',
      status: 'ended',
      scheduled_at: '2026-08-01T10:00:00Z',
      youtube_url: 'https://youtu.be/abc123',
    })

    expect(computeNextLive([replay, inProgress], NOW)?.id).toBe('now')
  })

  it("retourne null s'il n'y a ni upcoming ni live en cours", () => {
    const replay = live({
      id: 'r',
      status: 'ended',
      scheduled_at: '2026-08-01T10:00:00Z',
      youtube_url: 'https://youtu.be/abc123',
    })
    expect(computeNextLive([replay], NOW)).toBeNull()
    expect(computeNextLive([], NOW)).toBeNull()
  })

  it('un upcoming proche est préféré à un live en cours', () => {
    const inProgress = live({ id: 'now', is_live: true })
    const near = live({ id: 'near', status: 'scheduled', scheduled_at: '2026-08-20T10:00:00Z' })
    expect(computeNextLive([inProgress, near], NOW)?.id).toBe('near')
  })
})

describe('nextWeeklyOccurrence', () => {
  // NOW = mercredi 19 août 2026, 12:00 UTC (getDay() -> 3)
  it('même jour, plus tard dans la journée -> aujourd’hui', () => {
    const result = nextWeeklyOccurrence({ weekday: 3, hour: 18, minute: 0 }, NOW)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7) // août = index 7
    expect(result.getDate()).toBe(19)
    expect(result.getHours()).toBe(18)
  })

  it('même jour, mais heure déjà passée -> semaine suivante', () => {
    const result = nextWeeklyOccurrence({ weekday: 3, hour: 8, minute: 0 }, NOW)
    expect(result.getDate()).toBe(26)
    expect(result.getHours()).toBe(8)
  })

  it('jour de la semaine déjà passé -> semaine suivante', () => {
    // lundi (1) est déjà passé par rapport à mercredi (3)
    const result = nextWeeklyOccurrence({ weekday: 1, hour: 9, minute: 0 }, NOW)
    expect(result.getDate()).toBe(24) // lundi suivant
    expect(result.getDay()).toBe(1)
  })

  it('jour de la semaine à venir -> cette semaine', () => {
    // vendredi (5) est à venir par rapport à mercredi (3)
    const result = nextWeeklyOccurrence({ weekday: 5, hour: 9, minute: 0 }, NOW)
    expect(result.getDate()).toBe(21)
    expect(result.getDay()).toBe(5)
  })

  it('minute par défaut = 0 quand omise', () => {
    const result = nextWeeklyOccurrence({ weekday: 5, hour: 9 }, NOW)
    expect(result.getMinutes()).toBe(0)
  })
})
