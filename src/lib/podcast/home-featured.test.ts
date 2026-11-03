import { describe, expect, it } from 'vitest'
import {
  readTodayPodcastId,
  selectTodayPodcast,
  withTodayPodcastId,
} from './home-featured'

const episodes = [
  {
    id: 'ancien',
    title: 'Podcast ancien',
    status: 'published',
    published_at: '2026-10-01',
  },
  {
    id: 'recent',
    title: 'Podcast récent',
    status: 'published',
    published_at: '2026-11-01',
  },
  {
    id: 'brouillon',
    title: 'Podcast brouillon',
    status: 'draft',
    published_at: '2026-11-02',
  },
]

describe('Featured Podcast V1', () => {
  it('respecte le choix éditorial', () => {
    expect(selectTodayPodcast(episodes, 'ancien')?.id).toBe('ancien')
  })

  it('utilise le dernier publié sans sélection', () => {
    expect(selectTodayPodcast(episodes, null)?.id).toBe('recent')
  })

  it('ne présente jamais un brouillon', () => {
    expect(selectTodayPodcast(episodes, 'brouillon')?.id).toBe('recent')
  })

  it('gère les podcasts supprimés', () => {
    expect(selectTodayPodcast(episodes, 'supprime')?.id).toBe('recent')
  })

  it('n’invente aucun contenu', () => {
    expect(selectTodayPodcast([], null)).toBeNull()
  })

  it('lit la sélection dans la configuration', () => {
    expect(readTodayPodcastId({ today_podcast_id: 'ancien' })).toBe('ancien')
  })

  it('préserve les autres emplacements podcasts', () => {
    const config = {
      instant_ids: ['instant-1'],
      premium_ids: ['premium-1'],
      title: 'Podcasts',
    }

    expect(withTodayPodcastId(config, 'ancien')).toEqual({
      ...config,
      today_podcast_id: 'ancien',
    })
  })

  it('permet de revenir au choix automatique', () => {
    const config = withTodayPodcastId(
      { instant_ids: ['instant-1'] },
      null,
    )

    expect(readTodayPodcastId(config)).toBeNull()
    expect(config.instant_ids).toEqual(['instant-1'])
  })
})