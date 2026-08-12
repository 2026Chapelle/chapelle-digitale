import { describe, it, expect } from 'vitest'
import {
  parsePodcastSlotConfig,
  resolvePodcastHomeSlots,
  type HomeSlotEpisode,
} from '@/lib/podcast/home-slots'

const ep = (id: string, audioUrl: string | null = 'https://x/a.mp3'): HomeSlotEpisode => ({ id, audioUrl })

describe('parsePodcastSlotConfig', () => {
  it('renvoie une config vide pour null/undefined/non-objet', () => {
    expect(parsePodcastSlotConfig(null)).toEqual({ instantIds: [], premiumIds: [] })
    expect(parsePodcastSlotConfig(undefined)).toEqual({ instantIds: [], premiumIds: [] })
    expect(parsePodcastSlotConfig('nope')).toEqual({ instantIds: [], premiumIds: [] })
  })

  it('lit les deux conventions de nommage (snake_case et camelCase)', () => {
    expect(parsePodcastSlotConfig({ instant_ids: ['a'], premium_ids: ['b'] })).toEqual({
      instantIds: ['a'],
      premiumIds: ['b'],
    })
    expect(parsePodcastSlotConfig({ instantIds: ['a'], premiumIds: ['b'] })).toEqual({
      instantIds: ['a'],
      premiumIds: ['b'],
    })
  })

  it('ignore les entrées non-string, vides et espacées', () => {
    expect(parsePodcastSlotConfig({ instant_ids: ['  a  ', 2, null, '', '  '] })).toEqual({
      instantIds: ['a'],
      premiumIds: [],
    })
  })
})

describe('resolvePodcastHomeSlots — repli sans config', () => {
  it('liste vide → deux slots nuls', () => {
    expect(resolvePodcastHomeSlots([])).toEqual({ instant: null, premium: null })
  })

  it('un seul épisode → instant renseigné, premium null (jamais de doublon)', () => {
    const { instant, premium } = resolvePodcastHomeSlots([ep('1')])
    expect(instant?.id).toBe('1')
    expect(premium).toBeNull()
  })

  it('deux épisodes → instant et premium DISTINCTS', () => {
    const { instant, premium } = resolvePodcastHomeSlots([ep('1'), ep('2')])
    expect(instant?.id).toBe('1')
    expect(premium?.id).toBe('2')
    expect(instant?.id).not.toBe(premium?.id)
  })

  it('instant privilégie le premier épisode avec audioUrl', () => {
    const { instant } = resolvePodcastHomeSlots([ep('1', null), ep('2', 'https://x/2.mp3')])
    expect(instant?.id).toBe('2')
  })
})

describe('resolvePodcastHomeSlots — config explicite', () => {
  const episodes = [ep('1'), ep('2'), ep('3'), ep('4')]

  it('respecte les ids configurés pour chaque slot', () => {
    const { instant, premium } = resolvePodcastHomeSlots(episodes, {
      instantIds: ['3'],
      premiumIds: ['1'],
    })
    expect(instant?.id).toBe('3')
    expect(premium?.id).toBe('1')
  })

  it('premium ignore un id identique à instant et prend le suivant configuré', () => {
    const { instant, premium } = resolvePodcastHomeSlots(episodes, {
      instantIds: ['2'],
      premiumIds: ['2', '4'],
    })
    expect(instant?.id).toBe('2')
    expect(premium?.id).toBe('4')
  })

  it('id configuré absent → repli déterministe, toujours disjoint', () => {
    const { instant, premium } = resolvePodcastHomeSlots(episodes, {
      instantIds: ['999'],
      premiumIds: ['999'],
    })
    expect(instant?.id).toBe('1')
    expect(premium?.id).toBe('2')
    expect(instant?.id).not.toBe(premium?.id)
  })

  it('config instant seule → premium retombe sur un épisode distinct', () => {
    const { instant, premium } = resolvePodcastHomeSlots(episodes, {
      instantIds: ['4'],
      premiumIds: [],
    })
    expect(instant?.id).toBe('4')
    expect(premium?.id).toBe('1')
  })
})

describe('resolvePodcastHomeSlots — destinations éditoriales (PODCAST-0B)', () => {
  const withDest = (id: string, dest: string[]): HomeSlotEpisode => ({
    id,
    audioUrl: 'https://x/a.mp3',
    destinations: dest,
  })

  it('sans config, la destination home_instant/home_premium pilote les emplacements', () => {
    const list = [withDest('1', ['catalog']), withDest('2', ['home_premium']), withDest('3', ['home_instant'])]
    const { instant, premium } = resolvePodcastHomeSlots(list)
    expect(instant?.id).toBe('3')
    expect(premium?.id).toBe('2')
  })

  it('la config du bloc d’accueil reste PRIORITAIRE sur les destinations', () => {
    const list = [withDest('1', ['home_instant']), withDest('2', ['home_premium']), ep('3')]
    const { instant } = resolvePodcastHomeSlots(list, { instantIds: ['3'], premiumIds: [] })
    expect(instant?.id).toBe('3') // la config prime sur la destination home_instant de l’épisode 1
  })

  it('premium via destination reste toujours distinct de instant', () => {
    const list = [withDest('1', ['home_instant', 'home_premium'])]
    const { instant, premium } = resolvePodcastHomeSlots(list)
    expect(instant?.id).toBe('1')
    expect(premium).toBeNull()
  })

  it('épisodes sans destinations → comportement 0-A strictement inchangé', () => {
    const { instant, premium } = resolvePodcastHomeSlots([ep('1'), ep('2')])
    expect(instant?.id).toBe('1')
    expect(premium?.id).toBe('2')
  })
})
