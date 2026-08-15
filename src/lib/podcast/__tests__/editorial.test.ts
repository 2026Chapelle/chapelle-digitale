import { describe, it, expect } from 'vitest'
import {
  normalizeAccessLevel,
  normalizeDestinations,
  normalizeSerie,
  normalizePodcastEditorial,
  hasDestination,
  isFreeInstant,
  selectFeaturedEpisode,
  filterBySerie,
  listSeries,
  filterByDestination,
  DEFAULT_ACCESS_LEVEL,
  type EditorialEpisode,
  type PodcastEditorial,
} from '@/lib/podcast/editorial'

describe('normalizeAccessLevel', () => {
  it('accepte les niveaux valides', () => {
    expect(normalizeAccessLevel('public')).toBe('public')
    expect(normalizeAccessLevel('member')).toBe('member')
    expect(normalizeAccessLevel('premium')).toBe('premium')
  })
  it('retombe sur le défaut pour toute valeur inconnue/absente', () => {
    expect(normalizeAccessLevel('vip')).toBe(DEFAULT_ACCESS_LEVEL)
    expect(normalizeAccessLevel(null)).toBe(DEFAULT_ACCESS_LEVEL)
    expect(normalizeAccessLevel(undefined)).toBe(DEFAULT_ACCESS_LEVEL)
    expect(normalizeAccessLevel(3)).toBe(DEFAULT_ACCESS_LEVEL)
  })
})

describe('normalizeDestinations', () => {
  it('ignore null/non-string/vides et dédoublonne en préservant l’ordre', () => {
    expect(normalizeDestinations(['catalog', 'catalog', ' featured ', 2, null, '', 'home_instant']))
      .toEqual(['catalog', 'featured', 'home_instant'])
  })
  it('renvoie [] pour un non-tableau', () => {
    expect(normalizeDestinations(null)).toEqual([])
    expect(normalizeDestinations('catalog')).toEqual([])
    expect(normalizeDestinations(undefined)).toEqual([])
  })
})

describe('normalizeSerie', () => {
  it('trim et renvoie null si vide/non-string', () => {
    expect(normalizeSerie("  L'Instant Citadelle  ")).toBe("L'Instant Citadelle")
    expect(normalizeSerie('')).toBeNull()
    expect(normalizeSerie('   ')).toBeNull()
    expect(normalizeSerie(42)).toBeNull()
    expect(normalizeSerie(undefined)).toBeNull()
  })
})

describe('normalizePodcastEditorial — compat legacy', () => {
  it('ligne legacy sans colonnes → defaults sûrs', () => {
    expect(normalizePodcastEditorial({ id: '1', title: 'x' })).toEqual<PodcastEditorial>({
      serie: null,
      accessLevel: 'member',
      destinations: [],
      isFeatured: false,
    })
  })
  it('ligne complète 0-B', () => {
    expect(
      normalizePodcastEditorial({
        serie: 'Veilleurs',
        access_level: 'premium',
        destinations: ['catalog', 'featured'],
        is_featured: true,
      }),
    ).toEqual<PodcastEditorial>({
      serie: 'Veilleurs',
      accessLevel: 'premium',
      destinations: ['catalog', 'featured'],
      isFeatured: true,
    })
  })
  it('ne jette jamais sur null/undefined', () => {
    expect(normalizePodcastEditorial(null).accessLevel).toBe('member')
    expect(normalizePodcastEditorial(undefined).isFeatured).toBe(false)
  })
  it('is_featured n’est vrai que pour le booléen strict true', () => {
    expect(normalizePodcastEditorial({ is_featured: 'true' }).isFeatured).toBe(false)
    expect(normalizePodcastEditorial({ is_featured: 1 }).isFeatured).toBe(false)
  })
})

const ed = (p: Partial<PodcastEditorial> = {}): PodcastEditorial => ({
  serie: null,
  accessLevel: 'member',
  destinations: [],
  isFeatured: false,
  ...p,
})

describe('hasDestination / isFreeInstant', () => {
  it('hasDestination reflète l’appartenance', () => {
    expect(hasDestination(ed({ destinations: ['home_instant'] }), 'home_instant')).toBe(true)
    expect(hasDestination(ed({ destinations: ['catalog'] }), 'home_instant')).toBe(false)
  })
  it('isFreeInstant : public OU destination home_instant', () => {
    expect(isFreeInstant(ed({ accessLevel: 'public' }))).toBe(true)
    expect(isFreeInstant(ed({ destinations: ['home_instant'] }))).toBe(true)
    expect(isFreeInstant(ed({ accessLevel: 'member', destinations: ['catalog'] }))).toBe(false)
  })
})

// ── Sélection éditoriale ─────────────────────────────────────────────────────
const epi = (id: string, p: Partial<PodcastEditorial> = {}): EditorialEpisode => ({ id, editorial: ed(p) })

describe('selectFeaturedEpisode', () => {
  it('privilégie is_featured, puis destination featured, sinon null', () => {
    const list = [epi('1'), epi('2', { destinations: ['featured'] }), epi('3', { isFeatured: true })]
    expect(selectFeaturedEpisode(list)?.id).toBe('3')
    expect(selectFeaturedEpisode([epi('1'), epi('2', { destinations: ['featured'] })])?.id).toBe('2')
    expect(selectFeaturedEpisode([epi('1'), epi('2')])).toBeNull()
    expect(selectFeaturedEpisode([])).toBeNull()
  })
})

describe('filterBySerie', () => {
  const list = [epi('1', { serie: "L'Instant" }), epi('2', { serie: 'Veilleurs' }), epi('3', { serie: "L'Instant" })]
  it('filtre par émission, insensible à la casse', () => {
    expect(filterBySerie(list, "l'instant").map((e) => e.id)).toEqual(['1', '3'])
  })
  it('« all »/vide → tout', () => {
    expect(filterBySerie(list, 'all')).toHaveLength(3)
    expect(filterBySerie(list, '  ')).toHaveLength(3)
  })
})

describe('listSeries', () => {
  it('émissions distinctes dans l’ordre d’apparition', () => {
    const list = [epi('1', { serie: 'B' }), epi('2', { serie: 'A' }), epi('3', { serie: 'B' }), epi('4')]
    expect(listSeries(list)).toEqual(['B', 'A'])
  })
})

describe('filterByDestination', () => {
  it('ne garde que les épisodes ciblant la destination', () => {
    const list = [epi('1', { destinations: ['catalog'] }), epi('2', { destinations: ['home_premium'] })]
    expect(filterByDestination(list, 'home_premium').map((e) => e.id)).toEqual(['2'])
  })
})
