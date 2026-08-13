import { describe, it, expect } from 'vitest'
import {
  aggregateAudioAnalytics, listenerKey, timeBucket,
  isAudioEventType, isAudioSourceContext, isAudioAccessContext,
  type AudioEventRow, type EpisodeMeta,
} from '../audio-analytics'

// ── Fabrique d'événements ────────────────────────────────────────────────────
let seq = 0
function ev(p: Partial<AudioEventRow>): AudioEventRow {
  seq += 1
  return {
    podcast_id: p.podcast_id ?? 'ep1',
    user_id: p.user_id ?? null,
    session_key: p.session_key ?? null,
    event_type: p.event_type ?? 'play_start',
    position_seconds: p.position_seconds ?? null,
    duration_seconds: p.duration_seconds ?? null,
    percent_complete: p.percent_complete ?? null,
    playlist_id: p.playlist_id ?? null,
    source_context: p.source_context ?? null,
    access_context: p.access_context ?? null,
    occurred_at: p.occurred_at ?? `2026-08-1${(seq % 3) + 1}T10:00:00.000Z`,
  }
}

const EPISODES: EpisodeMeta[] = [
  { id: 'ep1', title: 'Instant Citadelle #1', serie: "L'Instant Citadelle", access_level: 'public' },
  { id: 'ep2', title: 'Veilleurs #1', serie: 'Veilleurs de la Nuit', access_level: 'member' },
  { id: 'ep3', title: 'Instant Citadelle #2', serie: "L'Instant Citadelle", access_level: 'public' },
]

describe('helpers', () => {
  it('listenerKey préfère user_id puis session_key', () => {
    expect(listenerKey({ user_id: 'u1', session_key: 's1' })).toBe('u:u1')
    expect(listenerKey({ user_id: null, session_key: 's1' })).toBe('s:s1')
    expect(listenerKey({ user_id: null, session_key: null })).toBeNull()
  })
  it('timeBucket jour et semaine', () => {
    expect(timeBucket('2026-08-13T10:00:00Z', 'day')).toBe('2026-08-13')
    expect(timeBucket('2026-08-13T10:00:00Z', 'week')).toMatch(/^2026-W\d{2}$/)
    expect(timeBucket('not-a-date', 'day')).toBeNull()
  })
  it('gardes de vocabulaire', () => {
    expect(isAudioEventType('play_start')).toBe(true)
    expect(isAudioEventType('pause')).toBe(false)
    expect(isAudioSourceContext('official_playlist')).toBe(true)
    expect(isAudioSourceContext('n_importe_quoi')).toBe(false)
    expect(isAudioAccessContext('premium')).toBe(true)
    expect(isAudioAccessContext('gratuit')).toBe(false)
  })
})

describe('dataset vide', () => {
  it('renvoie des zéros sans crash', () => {
    const a = aggregateAudioAnalytics([], EPISODES)
    expect(a.kpis.total_plays).toBe(0)
    expect(a.kpis.unique_listeners).toBe(0)
    expect(a.kpis.completion_rate).toBe(0)
    expect(a.kpis.resume_rate).toBe(0)
    expect(a.kpis.abandon_rate).toBe(0)
    expect(a.top_episodes).toEqual([])
    expect(a.top_series).toEqual([])
    expect(a.playlists).toEqual([])
    expect(a.trend).toEqual([])
  })
})

describe('KPIs de base', () => {
  it('compte plays et auditeurs uniques (membre + anon)', () => {
    const rows = [
      ev({ user_id: 'u1', event_type: 'play_start' }),
      ev({ user_id: 'u1', event_type: 'progress_checkpoint', percent_complete: 50, position_seconds: 300 }),
      ev({ user_id: 'u2', event_type: 'play_start' }),
      ev({ session_key: 's-anon', event_type: 'play_start' }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.total_plays).toBe(3)         // 3 play_start (checkpoint non compté)
    expect(a.kpis.unique_listeners).toBe(3)    // u1, u2, s-anon
    expect(a.kpis.started_sessions).toBe(3)
  })

  it('temps d\'écoute = position max, pas la somme (aucun double comptage seeks)', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', position_seconds: 0, duration_seconds: 600 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 25, position_seconds: 150, duration_seconds: 600 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 50, position_seconds: 300, duration_seconds: 600 }),
      // seek arrière puis re-checkpoint : ne doit pas gonfler le temps.
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 25, position_seconds: 150, duration_seconds: 600 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.total_listening_seconds).toBe(300) // max position, pas 150+300+150
  })

  it('complété → temps = durée entière', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'completed', position_seconds: 598, duration_seconds: 600 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.total_listening_seconds).toBe(600)
    expect(a.kpis.completion_rate).toBe(1)
  })
})

describe('complétion / reprise / abandon', () => {
  it('complétion via seuil 95% sans événement completed', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 100 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 95, position_seconds: 95, duration_seconds: 100 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.completion_rate).toBe(1)
    expect(a.kpis.abandon_rate).toBe(0)
  })

  it('reprise comptée par play_resume', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_resume', position_seconds: 300, duration_seconds: 600, percent_complete: 50 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.resume_rate).toBe(1)
    expect(a.kpis.total_plays).toBe(1)
  })

  it('abandon = démarré, non complété, progression < 95%', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 25, position_seconds: 150, duration_seconds: 600 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.abandon_rate).toBe(1)
    expect(a.kpis.completion_rate).toBe(0)
  })

  it('deux écoutes distinctes du même épisode par le même auditeur = 1 groupe', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.total_plays).toBe(2)        // deux démarrages
    expect(a.kpis.started_sessions).toBe(1)   // un seul (auditeur × épisode)
    expect(a.kpis.unique_listeners).toBe(1)
  })
})

describe('events non attribuables (ni user_id ni session_key)', () => {
  it('ne gonflent PAS le temps d\'écoute ni ne créent de faux abandon (anti-fragmentation)', () => {
    // 4 lignes sans identité pour le même épisode : sans le garde-fou, chaque
    // checkpoint créerait un groupe → temps ~2×3 et un abandon fantôme.
    const rows = [
      ev({ podcast_id: 'ep1', event_type: 'play_start', position_seconds: 0, duration_seconds: 600 }),
      ev({ podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 25, position_seconds: 150, duration_seconds: 600 }),
      ev({ podcast_id: 'ep1', event_type: 'progress_checkpoint', percent_complete: 50, position_seconds: 300, duration_seconds: 600 }),
      ev({ podcast_id: 'ep1', event_type: 'completed', percent_complete: 100, position_seconds: 600, duration_seconds: 600 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.kpis.total_plays).toBe(1)                    // le play reste compté globalement
    expect(a.kpis.unique_listeners).toBe(0)               // aucune identité → 0 unique
    expect(a.kpis.started_sessions).toBe(0)               // non regroupé → pas de session démarrée
    expect(a.kpis.total_listening_seconds).toBe(0)        // AUCUNE inflation
    expect(a.kpis.abandon_rate).toBe(0)                   // pas de faux abandon
    expect(a.kpis.completion_rate).toBe(0)
  })
})

describe('classements', () => {
  const rows = [
    // ep1 : 3 auditeurs, 1 complété
    ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
    ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'completed', position_seconds: 600, duration_seconds: 600 }),
    ev({ user_id: 'u2', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
    ev({ session_key: 'sX', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
    // ep2 : 1 auditeur
    ev({ user_id: 'u1', podcast_id: 'ep2', event_type: 'play_start', duration_seconds: 300 }),
  ]

  it('top épisodes trié par plays', () => {
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.top_episodes[0].podcast_id).toBe('ep1')
    expect(a.top_episodes[0].plays).toBe(3)
    expect(a.top_episodes[0].unique_listeners).toBe(3)
    expect(a.top_episodes[0].title).toBe('Instant Citadelle #1')
    expect(a.top_episodes[0].completion_rate).toBeCloseTo(1 / 3, 5)
  })

  it('top émissions agrège par série', () => {
    const a = aggregateAudioAnalytics(rows, EPISODES)
    const instant = a.top_series.find((s) => s.serie === "L'Instant Citadelle")
    expect(instant?.plays).toBe(3)   // ep1 (ep3 absent des données)
    const veilleurs = a.top_series.find((s) => s.serie === 'Veilleurs de la Nuit')
    expect(veilleurs?.plays).toBe(1)
  })
})

describe('playlists officielles', () => {
  it('agrège les écoutes rattachées à une playlist', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', playlist_id: 'pl1', source_context: 'official_playlist', duration_seconds: 600 }),
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'completed', playlist_id: 'pl1', position_seconds: 600, duration_seconds: 600 }),
      ev({ user_id: 'u2', podcast_id: 'ep2', event_type: 'play_start', playlist_id: 'pl1', duration_seconds: 300 }),
      // écoute hors playlist : ignorée du bloc playlists
      ev({ user_id: 'u3', podcast_id: 'ep1', event_type: 'play_start', duration_seconds: 600 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    expect(a.playlists).toHaveLength(1)
    expect(a.playlists[0].playlist_id).toBe('pl1')
    expect(a.playlists[0].plays).toBe(2)
    expect(a.playlists[0].unique_listeners).toBe(2)
    expect(a.playlists[0].completion_rate).toBe(0.5)
  })
})

describe('répartition par niveau d\'accès', () => {
  it('sépare public / member', () => {
    const rows = [
      ev({ user_id: 'u1', podcast_id: 'ep1', event_type: 'play_start', access_context: 'public', duration_seconds: 100, position_seconds: 50 }),
      ev({ session_key: 's1', podcast_id: 'ep1', event_type: 'play_start', access_context: 'public' }),
      ev({ user_id: 'u2', podcast_id: 'ep2', event_type: 'play_start', access_context: 'member', duration_seconds: 200 }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES)
    const pub = a.access_breakdown.find((x) => x.access_context === 'public')
    const mem = a.access_breakdown.find((x) => x.access_context === 'member')
    expect(pub?.plays).toBe(2)
    expect(mem?.plays).toBe(1)
  })
})

describe('tendance', () => {
  it('regroupe les plays par jour, trié', () => {
    const rows = [
      ev({ user_id: 'u1', event_type: 'play_start', occurred_at: '2026-08-11T10:00:00Z' }),
      ev({ user_id: 'u2', event_type: 'play_start', occurred_at: '2026-08-11T12:00:00Z' }),
      ev({ user_id: 'u3', event_type: 'play_start', occurred_at: '2026-08-12T09:00:00Z' }),
    ]
    const a = aggregateAudioAnalytics(rows, EPISODES, { granularity: 'day' })
    expect(a.trend).toHaveLength(2)
    expect(a.trend[0]).toMatchObject({ bucket: '2026-08-11', plays: 2 })
    expect(a.trend[1]).toMatchObject({ bucket: '2026-08-12', plays: 1 })
  })
})
