import { describe, it, expect } from 'vitest'
import {
  listPublicPrayerCards,
  toPublicPrayerCard,
  listMemberPrayers,
  getFullPrayer,
  listPrayerCategories,
  filterPrayers,
} from '@/lib/prayers/library'

describe('Bibliothèque de Prières — projection publique', () => {
  it("toPublicPrayerCard n'expose JAMAIS content / guideSteps / takeaway / pdf", () => {
    const cards = listPublicPrayerCards()
    expect(cards.length).toBe(6)
    for (const c of cards) {
      expect(c).not.toHaveProperty('content')
      expect(c).not.toHaveProperty('guideSteps')
      expect(c).not.toHaveProperty('takeaway')
      expect(c).not.toHaveProperty('pdf')
      expect(c.locked).toBe(true)
    }
  })

  it('les champs nécessaires à la carte publique sont présents', () => {
    for (const c of listPublicPrayerCards()) {
      expect(c.id).toBeTruthy()
      expect(c.title).toBeTruthy()
      expect(c.category).toBeTruthy()
      expect(c.excerpt).toBeTruthy()
      expect(typeof c.durationMinutes).toBe('number')
      expect(c.intention).toBeTruthy()
      expect(c.recommendedMoment).toBeTruthy()
    }
  })

  it("aucune carte publique ne contient le texte du contenu complet", () => {
    const full = getFullPrayer('priere-travail')
    expect(full).not.toBeNull()
    const json = JSON.stringify(listPublicPrayerCards())
    expect(json.includes(full!.content)).toBe(false)
  })
})

describe('Bibliothèque de Prières — accès membre / détail', () => {
  it('6 prières présentes côté membre', () => {
    expect(listMemberPrayers().length).toBe(6)
  })

  it('getFullPrayer(id) retourne le contenu complet et les champs du détail', () => {
    const p = getFullPrayer('priere-delivrance')
    expect(p).not.toBeNull()
    expect(p!.content.length).toBeGreaterThan(50)
    expect(Array.isArray(p!.guideSteps)).toBe(true)
    expect(p!.guideSteps.length).toBeGreaterThan(0)
    expect(p!.takeaway).toBeTruthy()
    expect(p!.recommendedMoment).toBeTruthy()
    expect(p!.level).toBeTruthy()
  })

  it('id inconnu => null', () => {
    expect(getFullPrayer('inexistant')).toBeNull()
    expect(getFullPrayer('')).toBeNull()
  })

  it('listMemberPrayers inclut le contenu mais pas de PDF', () => {
    for (const p of listMemberPrayers()) {
      expect(p.content).toBeTruthy()
      expect(p).not.toHaveProperty('pdf')
    }
  })
})

describe('Bibliothèque de Prières — catégories & filtre', () => {
  it('listPrayerCategories retourne des catégories uniques', () => {
    const cats = listPrayerCategories()
    expect(cats.length).toBeGreaterThan(0)
    expect(new Set(cats).size).toBe(cats.length)
  })

  it('filterPrayers filtre par catégorie et par recherche (casse/accents ignorés)', () => {
    const cards = listPublicPrayerCards()
    expect(filterPrayers(cards, {}).length).toBe(6)
    expect(filterPrayers(cards, { category: 'Travail' }).map((c) => c.id)).toEqual(['priere-travail'])
    expect(filterPrayers(cards, { query: 'DELIVRANCE' }).map((c) => c.id)).toEqual(['priere-delivrance'])
    expect(filterPrayers(cards, { query: 'famille' }).map((c) => c.id)).toEqual(['priere-famille'])
    expect(filterPrayers(cards, { query: '   ' }).length).toBe(6)
  })
})
