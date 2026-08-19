import { describe, it, expect, vi, beforeEach } from 'vitest'

// `cmsList` est la seule dépendance externe (lecture Supabase) : on la mocke
// pour piloter les scénarios. `@/lib/live` (normalisation/partition/next) reste
// réel afin de tester l'intégration effective, pas une reformulation du mock.
vi.mock('@/lib/cms', () => ({
  cmsList: vi.fn(),
}))

import { cmsList } from '@/lib/cms'
import { loadLiveHubData } from '../load-lives'
import type { RawCmsLive } from '../types'

const mockedCmsList = vi.mocked(cmsList)

const NOW = new Date('2026-08-19T12:00:00Z')

function row(overrides: Partial<RawCmsLive> = {}): RawCmsLive {
  return { title: 'Émission', ...overrides }
}

beforeEach(() => {
  mockedCmsList.mockReset()
})

describe('loadLiveHubData', () => {
  it('renvoie une vue vide quand cmsList renvoie null (mode démo)', async () => {
    mockedCmsList.mockResolvedValue(null)

    const data = await loadLiveHubData(NOW)

    expect(data).toEqual({
      liveNow: null,
      nextLive: null,
      upcoming: [],
      replays: [],
      all: [],
      hasAny: false,
    })
    expect(mockedCmsList).toHaveBeenCalledWith('cms_lives', {
      publicOnly: true,
      orderBy: 'scheduled_at',
      ascending: false,
    })
  })

  it('renvoie une vue vide quand cmsList renvoie un tableau vide', async () => {
    mockedCmsList.mockResolvedValue([])

    const data = await loadLiveHubData(NOW)

    expect(data.hasAny).toBe(false)
    expect(data.liveNow).toBeNull()
    expect(data.nextLive).toBeNull()
    expect(data.upcoming).toEqual([])
    expect(data.replays).toEqual([])
    expect(data.all).toEqual([])
  })

  it('détecte un live en cours (is_live=true) → liveNow non-null, hasAny=true', async () => {
    mockedCmsList.mockResolvedValue([
      row({ id: 'l1', is_live: true, youtube_url: 'https://youtu.be/AbCdEfGhIjK' }),
    ])

    const data = await loadLiveHubData(NOW)

    expect(data.liveNow).not.toBeNull()
    expect(data.liveNow?.id).toBe('l1')
    expect(data.liveNow?.state).toBe('live')
    expect(data.hasAny).toBe(true)
  })

  it('un scheduled futur alimente upcoming et devient nextLive', async () => {
    mockedCmsList.mockResolvedValue([
      row({
        id: 'l2',
        status: 'scheduled',
        scheduled_at: '2026-09-01T10:00:00Z',
      }),
    ])

    const data = await loadLiveHubData(NOW)

    expect(data.liveNow).toBeNull()
    expect(data.upcoming).toHaveLength(1)
    expect(data.upcoming[0]?.id).toBe('l2')
    expect(data.nextLive?.id).toBe('l2')
    expect(data.hasAny).toBe(true)
  })

  it('un ended avec vidéo devient un replay', async () => {
    mockedCmsList.mockResolvedValue([
      row({
        id: 'l3',
        status: 'ended',
        scheduled_at: '2026-08-01T10:00:00Z',
        youtube_url: 'https://youtu.be/AbCdEfGhIjK',
      }),
    ])

    const data = await loadLiveHubData(NOW)

    expect(data.replays).toHaveLength(1)
    expect(data.replays[0]?.id).toBe('l3')
    expect(data.replays[0]?.state).toBe('replay')
    expect(data.hasAny).toBe(true)
  })

  it("un ended SANS vidéo n'apparaît ni en replay ni ailleurs", async () => {
    mockedCmsList.mockResolvedValue([
      row({
        id: 'l4',
        status: 'ended',
        scheduled_at: '2026-08-01T10:00:00Z',
      }),
    ])

    const data = await loadLiveHubData(NOW)

    expect(data.liveNow).toBeNull()
    expect(data.upcoming).toEqual([])
    expect(data.replays).toEqual([])
    expect(data.nextLive).toBeNull()
    expect(data.hasAny).toBe(false)
    // toujours présent dans `all` (ensemble brut normalisé, non filtré)
    expect(data.all).toHaveLength(1)
  })

  it('trie upcoming par date croissante et replays du plus récent au plus ancien', async () => {
    mockedCmsList.mockResolvedValue([
      row({ id: 'u-late', status: 'scheduled', scheduled_at: '2026-10-01T10:00:00Z' }),
      row({ id: 'u-early', status: 'scheduled', scheduled_at: '2026-09-01T10:00:00Z' }),
      row({
        id: 'r-old',
        status: 'ended',
        scheduled_at: '2026-07-01T10:00:00Z',
        youtube_url: 'https://youtu.be/AbCdEfGhIjK',
      }),
      row({
        id: 'r-recent',
        status: 'ended',
        scheduled_at: '2026-08-01T10:00:00Z',
        youtube_url: 'https://youtu.be/AbCdEfGhIjK',
      }),
    ])

    const data = await loadLiveHubData(NOW)

    expect(data.upcoming.map((l) => l.id)).toEqual(['u-early', 'u-late'])
    expect(data.replays.map((l) => l.id)).toEqual(['r-recent', 'r-old'])
    expect(data.nextLive?.id).toBe('u-early')
  })

  it('nextLive retombe sur le live en cours quand aucun upcoming', async () => {
    mockedCmsList.mockResolvedValue([
      row({ id: 'l1', is_live: true, youtube_url: 'https://youtu.be/AbCdEfGhIjK' }),
    ])

    const data = await loadLiveHubData(NOW)

    expect(data.nextLive?.id).toBe('l1')
  })
})
