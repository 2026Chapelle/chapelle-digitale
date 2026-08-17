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

describe('resolvePodcastHomeSlots — access-aware (P0 : disjonction par NIVEAU)', () => {
  type Lvl = 'public' | 'member' | 'premium'
  const lvl = (id: string, accessLevel: Lvl): HomeSlotEpisode => ({
    id,
    accessLevel,
    hasAudio: true,
  })

  it('P0 : instant privilégie le public, premium prend le vrai premium', () => {
    const { instant, premium } = resolvePodcastHomeSlots([lvl('1', 'public'), lvl('2', 'premium')])
    expect(instant?.id).toBe('1')
    expect(premium?.id).toBe('2')
  })

  it('P0 : instant ne retient JAMAIS un premium par repli quand un non-premium existe', () => {
    // premier de la liste = premium ; instant doit sauter au public.
    const { instant, premium } = resolvePodcastHomeSlots([lvl('1', 'premium'), lvl('2', 'public')])
    expect(instant?.id).toBe('2')
    expect(premium?.id).toBe('1')
    expect(instant?.id).not.toBe(premium?.id)
  })

  it('P0 : catalogue 100% public → premium NUL (jamais un public déguisé en Premium)', () => {
    const { instant, premium } = resolvePodcastHomeSlots([lvl('1', 'public'), lvl('2', 'public')])
    expect(instant?.id).toBe('1')
    expect(premium).toBeNull()
  })

  it('P0 : un membre n’est ni instant gratuit ni premium ; premium reste nul', () => {
    const { instant, premium } = resolvePodcastHomeSlots([lvl('1', 'member'), lvl('2', 'member')])
    // aucun public → instant retombe sur le premier non-premium (membre), jamais un premium.
    expect(instant?.id).toBe('1')
    expect(premium).toBeNull()
  })

  it('P0 : sélection mixte public/member/premium → instant public, premium premium', () => {
    const { instant, premium } = resolvePodcastHomeSlots([
      lvl('1', 'public'),
      lvl('2', 'member'),
      lvl('3', 'premium'),
    ])
    expect(instant?.id).toBe('1')
    expect(premium?.id).toBe('3')
  })

  it('la config admin reste ABSOLUE même en access-aware (teaser premium public assumé)', () => {
    // Admin place explicitement un public dans le slot premium → honoré (choix éditorial).
    const { instant, premium } = resolvePodcastHomeSlots(
      [lvl('1', 'public'), lvl('2', 'public'), lvl('3', 'premium')],
      { instantIds: ['1'], premiumIds: ['2'] },
    )
    expect(instant?.id).toBe('1')
    expect(premium?.id).toBe('2')
  })

  it('la destination home_premium prime sur le repli access-aware', () => {
    const list: HomeSlotEpisode[] = [
      { id: '1', accessLevel: 'public', hasAudio: true },
      { id: '2', accessLevel: 'member', hasAudio: true, destinations: ['home_premium'] },
      { id: '3', accessLevel: 'premium', hasAudio: true },
    ]
    const { instant, premium } = resolvePodcastHomeSlots(list)
    expect(instant?.id).toBe('1')
    // home_premium (ep2) prioritaire sur le repli qui aurait pris ep3.
    expect(premium?.id).toBe('2')
  })

  it('disjonction par id conservée en access-aware (premium ≠ instant)', () => {
    // Un seul épisode premium : il alimente instant (via non-premium indispo) ? Non —
    // ici public en tête donc instant=public, et le premium unique va en premium.
    const single: HomeSlotEpisode[] = [{ id: '1', accessLevel: 'premium', hasAudio: true }]
    const { instant, premium } = resolvePodcastHomeSlots(single)
    // aucun non-premium → instant retombe sur l'unique épisode (premium), premium exclut l'id → null.
    expect(instant?.id).toBe('1')
    expect(premium).toBeNull()
  })
})

/**
 * LOT E — Contrat de sélection pour la carte gratuite « L'Instant Citadelle ».
 *
 * Le composant PodcastHomeSection n'affiche la CTA primaire « Écouter maintenant »
 * QUE si l'épisode Instant résolu est librement jouable :
 *   instantEp && (accessLevel === 'public' || destinations.includes('home_instant')).
 * Ces tests verrouillent la sortie du résolveur qui pilote cette sélection : l'Instant
 * privilégie le public et n'est JAMAIS un épisode premium tant qu'un non-premium existe.
 */
describe('resolvePodcastHomeSlots — LOT E : carte gratuite jouable (jamais premium)', () => {
  type Lvl = 'public' | 'member' | 'premium'
  const lvl = (id: string, accessLevel: Lvl): HomeSlotEpisode => ({ id, accessLevel, hasAudio: true })

  // Reproduit la garde exacte du composant (source unique de vérité du contrat).
  const freelyPlayable = (e: HomeSlotEpisode | null): boolean =>
    Boolean(e && (e.accessLevel === 'public' || (e.destinations ?? []).includes('home_instant')))

  it('instant EST un épisode public quand il en existe un (public préféré pour le slot gratuit)', () => {
    const { instant } = resolvePodcastHomeSlots([
      lvl('1', 'member'),
      lvl('2', 'premium'),
      lvl('3', 'public'),
    ])
    expect(instant?.accessLevel).toBe('public')
    expect(instant?.id).toBe('3')
    expect(freelyPlayable(instant)).toBe(true) // la CTA « Écouter maintenant » s'afficherait
  })

  it('instant N’EST JAMAIS un épisode premium sur une liste mixte incluant du premium', () => {
    const { instant } = resolvePodcastHomeSlots([
      lvl('1', 'premium'),
      lvl('2', 'member'),
      lvl('3', 'premium'),
      lvl('4', 'public'),
    ])
    expect(instant?.accessLevel).not.toBe('premium')
    expect(instant?.id).toBe('4')
    expect(freelyPlayable(instant)).toBe(true)
  })

  it('destination home_instant rend l’instant librement jouable même sans niveau public', () => {
    const list: HomeSlotEpisode[] = [
      { id: '1', accessLevel: 'member', hasAudio: true, destinations: ['home_instant'] },
      { id: '2', accessLevel: 'premium', hasAudio: true },
    ]
    const { instant } = resolvePodcastHomeSlots(list)
    expect(instant?.id).toBe('1')
    expect(freelyPlayable(instant)).toBe(true)
  })

  it('liste 100% premium → l’instant résolu n’est PAS présenté comme gratuit (garde=false)', () => {
    // Aucun non-premium disponible : le résolveur retombe sur un premium (disjonction par id),
    // MAIS la garde du composant refuse alors la CTA « Écouter maintenant » → fallback secondaire.
    const { instant } = resolvePodcastHomeSlots([lvl('1', 'premium'), lvl('2', 'premium')])
    expect(instant).not.toBeNull()
    expect(freelyPlayable(instant)).toBe(false) // pas de bouton de lecture cassé sur du premium
  })

  it('dès qu’un non-premium existe, le résolveur ne place jamais un premium en instant', () => {
    const { instant } = resolvePodcastHomeSlots([
      lvl('1', 'premium'),
      lvl('2', 'member'), // non-premium présent → instant ne doit pas être premium
    ])
    expect(instant?.accessLevel).not.toBe('premium')
    expect(instant?.id).toBe('2')
  })
})
