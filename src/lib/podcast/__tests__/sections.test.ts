import { describe, it, expect } from 'vitest'
import {
  parsePodcastHero,
  selectFeatured,
  selectNewReleases,
  selectPremium,
  buildEmissions,
  isPremium,
  type VoixEpisode,
} from '@/lib/podcast/sections'

const ep = (id: string, p: Partial<VoixEpisode> = {}): VoixEpisode => ({ id, title: 'T' + id, ...p })

describe('parsePodcastHero', () => {
  it('null si rien d’exploitable (ni titre ni image)', () => {
    expect(parsePodcastHero(null)).toBeNull()
    expect(parsePodcastHero({})).toBeNull()
    expect(parsePodcastHero({ cta_label: 'Voir' })).toBeNull()
  })
  it('mappe les colonnes existantes', () => {
    expect(parsePodcastHero({
      subtitle: 'À la une', title: 'Retraite 2026', body: 'Trois jours de prière',
      image_url: '/x.jpg', cta_label: 'Découvrir', cta_href: '/evenements',
    })).toEqual({
      eyebrow: 'À la une', title: 'Retraite 2026', description: 'Trois jours de prière',
      image: '/x.jpg', ctaLabel: 'Découvrir', ctaHref: '/evenements',
    })
  })
  it('exploitable avec image seule (titre absent)', () => {
    expect(parsePodcastHero({ image_url: '/x.jpg' })?.image).toBe('/x.jpg')
  })
})

describe('selectFeatured', () => {
  it('retient is_featured et la destination featured, respecte l’ordre + limite', () => {
    const list = [ep('1'), ep('2', { isFeatured: true }), ep('3', { destinations: ['featured'] }), ep('4', { isFeatured: true })]
    expect(selectFeatured(list).map((e) => e.id)).toEqual(['2', '3', '4'])
    expect(selectFeatured(list, 2).map((e) => e.id)).toEqual(['2', '3'])
  })
  it('liste vide si aucun featured', () => {
    expect(selectFeatured([ep('1'), ep('2')])).toEqual([])
  })
})

describe('selectNewReleases', () => {
  const list = [ep('1'), ep('2'), ep('3'), ep('4')] // supposé déjà trié desc par l’appelant
  it('exclut les ids fournis (dé-duplication vs featured) + limite', () => {
    expect(selectNewReleases(list, { excludeIds: ['1', '3'], limit: 5 }).map((e) => e.id)).toEqual(['2', '4'])
  })
  it('repli sur la liste complète si tout est exclu (petit catalogue)', () => {
    expect(selectNewReleases(list, { excludeIds: ['1', '2', '3', '4'] }).map((e) => e.id)).toEqual(['1', '2', '3', '4'])
  })
})

describe('buildEmissions', () => {
  it('regroupe par série, cover de repli = 1re cover, tri par nb décroissant', () => {
    const list = [
      ep('1', { serie: "L'Instant Citadelle", cover: null }),
      ep('2', { serie: "L'Instant Citadelle", cover: '/c2.jpg' }),
      ep('3', { serie: 'Veilleurs', cover: '/c3.jpg' }),
      ep('4', { serie: '  ' }),         // série vide → ignorée
      ep('5', {}),                       // pas de série → ignorée
    ]
    const em = buildEmissions(list)
    expect(em.map((e) => e.serie)).toEqual(["L'Instant Citadelle", 'Veilleurs'])
    expect(em[0]).toEqual({ serie: "L'Instant Citadelle", cover: '/c2.jpg', count: 2 })
    expect(em[1]).toEqual({ serie: 'Veilleurs', cover: '/c3.jpg', count: 1 })
  })
  it('liste vide si aucune série', () => {
    expect(buildEmissions([ep('1'), ep('2')])).toEqual([])
  })
  it('porte la 1re description non vide par série (promesse du dernier épisode si trié desc)', () => {
    const list = [
      ep('1', { serie: 'Veilleurs', description: '' }),               // vide → ignorée
      ep('2', { serie: 'Veilleurs', description: 'Trois jours de prière' }), // 1re non vide
      ep('3', { serie: 'Veilleurs', description: 'Autre promesse' }), // ignorée (déjà une)
    ]
    expect(buildEmissions(list)[0].description).toBe('Trois jours de prière')
  })
  it('description undefined quand aucun épisode n’en fournit (jamais fabriquée)', () => {
    const em = buildEmissions([ep('1', { serie: 'Veilleurs' }), ep('2', { serie: 'Veilleurs', description: '   ' })])
    expect(em[0].description).toBeUndefined()
  })
})

describe('selectPremium', () => {
  it('retient les épisodes réellement premium (access_level ou destination home_premium), ordre + limite', () => {
    const list = [
      ep('1'),
      ep('2', { accessLevel: 'premium' }),
      ep('3', { accessLevel: 'member' }),
      ep('4', { destinations: ['home_premium'] }),
      ep('5', { accessLevel: 'public', destinations: ['catalog'] }),
      ep('6', { accessLevel: 'premium' }),
    ]
    expect(selectPremium(list).map((e) => e.id)).toEqual(['2', '4', '6'])
  })
  it('respecte la limite (défaut 4)', () => {
    const list = [
      ep('1', { accessLevel: 'premium' }),
      ep('2', { accessLevel: 'premium' }),
      ep('3', { accessLevel: 'premium' }),
      ep('4', { accessLevel: 'premium' }),
      ep('5', { accessLevel: 'premium' }),
    ]
    expect(selectPremium(list).map((e) => e.id)).toEqual(['1', '2', '3', '4'])
    expect(selectPremium(list, { limit: 2 }).map((e) => e.id)).toEqual(['1', '2'])
  })
  it('exclut les ids fournis (dé-duplication vs À la une)', () => {
    const list = [
      ep('1', { accessLevel: 'premium' }),
      ep('2', { accessLevel: 'premium' }),
      ep('3', { destinations: ['home_premium'] }),
    ]
    expect(selectPremium(list, { excludeIds: ['1'] }).map((e) => e.id)).toEqual(['2', '3'])
  })
  it('liste vide si aucun épisode premium (jamais de fausse donnée)', () => {
    expect(selectPremium([ep('1'), ep('2', { accessLevel: 'member' })])).toEqual([])
    expect(selectPremium([])).toEqual([])
  })
})

describe('isPremium', () => {
  it('vrai seulement pour access_level premium', () => {
    expect(isPremium(ep('1', { accessLevel: 'premium' }))).toBe(true)
    expect(isPremium(ep('1', { accessLevel: 'member' }))).toBe(false)
    expect(isPremium(ep('1'))).toBe(false)
  })
})
