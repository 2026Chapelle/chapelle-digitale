import { describe, it, expect } from 'vitest'
import {
  toSpineEpisode, sortSpineEpisodes, groupEpisodesBySeason, countEpisodesForSeries,
  resolveCover, seasonDisplayTitle, pickFirstPlayable, hasSpecialEdition, buildSeriesCard,
  resolveActiveSeasonNumber,
  type SpineEpisode, type PublicSeason, type PublicSeries,
} from '@/lib/podcast/spine-helpers'

function ep(partial: Partial<SpineEpisode> & { id: string }): SpineEpisode {
  return {
    title: partial.id, accessLevel: 'public', destinations: [], isFeatured: false, hasAudio: true,
    showId: null, seriesId: null, seasonId: null, episodeType: 'standard',
    ...partial,
  }
}

describe('toSpineEpisode', () => {
  it('mappe une ligne brute en épisode sûr (sans audio_url)', () => {
    const e = toSpineEpisode({
      id: 'x', title: 'T', description: 'D', cover_url: 'c.jpg', duration: '6 min',
      published_at: '2026-08-18', serie: 'L\'Instant', saison: 2, episode: 7,
      access_level: 'member', destinations: ['home_instant'], is_featured: true, has_audio: true,
      show_id: 's1', series_id: 'se1', season_id: 'sa2', episode_type: 'special',
      a_retenir: 'AR', prayer_text: 'PR', declaration_text: 'DC',
      audio_url: 'SECRET.mp3', youtube_url: 'yt',
    })
    expect(e).not.toHaveProperty('audio_url')
    expect(e).not.toHaveProperty('audioUrl')
    expect(e.showId).toBe('s1'); expect(e.seriesId).toBe('se1'); expect(e.seasonId).toBe('sa2')
    expect(e.episodeType).toBe('special'); expect(e.accessLevel).toBe('member')
    expect(e.saison).toBe(2); expect(e.episode).toBe(7)
    expect(e.aRetenir).toBe('AR'); expect(e.prayerText).toBe('PR'); expect(e.declarationText).toBe('DC')
  })
  it('legacy (FK absents, episode_type absent) → nulls + standard', () => {
    const e = toSpineEpisode({ id: 'y', title: 'Legacy', serie: 'Mystères' })
    expect(e.showId).toBeNull(); expect(e.seriesId).toBeNull(); expect(e.seasonId).toBeNull()
    expect(e.episodeType).toBe('standard'); expect(e.accessLevel).toBe('member') // défaut
  })
  it('episode_type inconnu → standard', () => {
    expect(toSpineEpisode({ id: 'z', episode_type: 'bonus' }).episodeType).toBe('standard')
  })
})

describe('sortSpineEpisodes', () => {
  it('trie par episode nº asc, puis date, jamais aléatoire', () => {
    const list = [ep({ id: 'c', episode: 3 }), ep({ id: 'a', episode: 1 }), ep({ id: 'b', episode: 2 })]
    expect(sortSpineEpisodes(list).map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })
  it('sans numéro → départage par published_at asc', () => {
    const list = [ep({ id: 'late', publishedAt: '2026-08-18' }), ep({ id: 'early', publishedAt: '2026-08-10' })]
    expect(sortSpineEpisodes(list).map((e) => e.id)).toEqual(['early', 'late'])
  })
  it('est stable (ne mute pas l\'entrée)', () => {
    const list = [ep({ id: 'b', episode: 2 }), ep({ id: 'a', episode: 1 })]
    sortSpineEpisodes(list)
    expect(list.map((e) => e.id)).toEqual(['b', 'a'])
  })
})

describe('groupEpisodesBySeason', () => {
  it('regroupe par seasonId, ignore les legacy (seasonId null)', () => {
    const list = [
      ep({ id: 'a1', seasonId: 'S1', episode: 1 }),
      ep({ id: 'legacy', seasonId: null, episode: 1 }),
      ep({ id: 'a2', seasonId: 'S1', episode: 2 }),
      ep({ id: 'b1', seasonId: 'S2', episode: 1 }),
    ]
    const g = groupEpisodesBySeason(list)
    expect(g.get('S1')!.map((e) => e.id)).toEqual(['a1', 'a2'])
    expect(g.get('S2')!.map((e) => e.id)).toEqual(['b1'])
    expect(g.has('null')).toBe(false)
    expect(Array.from(g.keys()).sort()).toEqual(['S1', 'S2'])
  })
})

describe('countEpisodesForSeries', () => {
  it('compte via seriesId (legacy exclu)', () => {
    const list = [ep({ id: 'a', seriesId: 'SE' }), ep({ id: 'b', seriesId: 'SE' }), ep({ id: 'c', seriesId: null })]
    expect(countEpisodesForSeries(list, 'SE')).toBe(2)
  })
})

describe('resolveCover (fallback saison → série → émission)', () => {
  it('prend la couverture de la saison en priorité', () => {
    expect(resolveCover({ cover_url: 'sea.jpg' }, { cover_url: 'ser.jpg' }, { cover_url: 'show.jpg' })).toBe('sea.jpg')
  })
  it('retombe sur la série puis l\'émission', () => {
    expect(resolveCover({ cover_url: null }, { cover_url: 'ser.jpg' }, { cover_url: 'show.jpg' })).toBe('ser.jpg')
    expect(resolveCover(null, null, { cover_url: 'show.jpg' })).toBe('show.jpg')
    expect(resolveCover(null, null, null)).toBeNull()
  })
})

describe('seasonDisplayTitle', () => {
  const base: PublicSeason = { id: 's', series_id: 'x', season_number: 3 }
  it('utilise le thème CMS si présent', () => {
    expect(seasonDisplayTitle({ ...base, title: 'La grâce qui accélère' })).toBe('La grâce qui accélère')
  })
  it('fallback « Saison N » si pas de thème', () => {
    expect(seasonDisplayTitle(base)).toBe('Saison 3')
    expect(seasonDisplayTitle({ ...base, title: '  ' })).toBe('Saison 3')
  })
})

describe('pickFirstPlayable', () => {
  const s1public = ep({ id: 'p', episode: 1, accessLevel: 'public' })
  const s2member = ep({ id: 'm', episode: 2, accessLevel: 'member' })
  const s3premium = ep({ id: 'pr', episode: 3, accessLevel: 'premium' })
  it('visiteur → premier public', () => {
    expect(pickFirstPlayable([s2member, s1public], { isMember: false, hasPremium: false })?.id).toBe('p')
  })
  it('visiteur sans public → null', () => {
    expect(pickFirstPlayable([s2member, s3premium], { isMember: false, hasPremium: false })).toBeNull()
  })
  it('membre → premier accessible (public ou member) dans l\'ordre', () => {
    expect(pickFirstPlayable([s2member, s1public], { isMember: true, hasPremium: false })?.id).toBe('p')
    expect(pickFirstPlayable([s2member], { isMember: true, hasPremium: false })?.id).toBe('m')
  })
  it('premium exige le droit premium', () => {
    expect(pickFirstPlayable([s3premium], { isMember: true, hasPremium: false })).toBeNull()
    expect(pickFirstPlayable([s3premium], { isMember: true, hasPremium: true })?.id).toBe('pr')
  })
  it('ignore un épisode sans audio', () => {
    expect(pickFirstPlayable([ep({ id: 'na', accessLevel: 'public', hasAudio: false })], { isMember: false, hasPremium: false })).toBeNull()
  })
})

describe('hasSpecialEdition', () => {
  it('vrai seulement si un épisode special existe', () => {
    expect(hasSpecialEdition([ep({ id: 'a' })])).toBe(false)
    expect(hasSpecialEdition([ep({ id: 'a' }), ep({ id: 'b', episodeType: 'special' })])).toBe(true)
  })
})

describe('resolveActiveSeasonNumber (URL ?saison=N source de vérité)', () => {
  const avail = [1, 2]
  it('paramètre valide → cette saison', () => {
    expect(resolveActiveSeasonNumber('1', avail, 1)).toBe(1)
    expect(resolveActiveSeasonNumber('2', avail, 1)).toBe(2)
    expect(resolveActiveSeasonNumber(2, avail, 1)).toBe(2)
  })
  it('?saison=999 (hors disponibles / draft) → fallback', () => {
    expect(resolveActiveSeasonNumber('999', avail, 1)).toBe(1)
  })
  it('?saison=abc (non numérique) → fallback', () => {
    expect(resolveActiveSeasonNumber('abc', avail, 2)).toBe(2)
  })
  it('?saison= (vide) / null / undefined → fallback', () => {
    expect(resolveActiveSeasonNumber('', avail, 1)).toBe(1)
    expect(resolveActiveSeasonNumber(null, avail, 2)).toBe(2)
    expect(resolveActiveSeasonNumber(undefined, avail, 1)).toBe(1)
  })
  it('fallback invalide → première saison disponible', () => {
    expect(resolveActiveSeasonNumber('999', avail, 42)).toBe(1)
  })
  it('numérique fractionnaire refusé (pas d\'invention)', () => {
    expect(resolveActiveSeasonNumber('1.5', avail, 2)).toBe(2)
  })
})

describe('buildSeriesCard', () => {
  it('calcule seasonsCount + episodesCount réels', () => {
    const series: PublicSeries = { id: 'SE', show_id: 'SH', slug: 'grace', title: 'La grâce' }
    const seasons: PublicSeason[] = [
      { id: 'a', series_id: 'SE', season_number: 1 }, { id: 'b', series_id: 'SE', season_number: 2 },
    ]
    const eps = [ep({ id: '1', seriesId: 'SE' }), ep({ id: '2', seriesId: 'SE' }), ep({ id: '3', seriesId: 'OTHER' })]
    const card = buildSeriesCard(series, seasons, eps, 'L\'Instant Citadelle')
    expect(card.seasonsCount).toBe(2)
    expect(card.episodesCount).toBe(2)
    expect(card.showTitle).toBe('L\'Instant Citadelle')
    expect(card.slug).toBe('grace')
  })
})
