import { describe, it, expect } from 'vitest'
import {
  listPublicPrayerCards,
  toPublicPrayerCard,
  listMemberPrayers,
  getFullPrayer,
  listPrayerCategories,
} from '@/lib/prayers/library'

describe('Bibliothèque de Prières — projection publique', () => {
  it("toPublicPrayerCard n'expose JAMAIS le contenu complet ni le PDF", () => {
    const cards = listPublicPrayerCards()
    expect(cards.length).toBeGreaterThan(0)
    for (const c of cards) {
      expect(c).not.toHaveProperty('content')
      expect(c).not.toHaveProperty('pdf')
      expect(c.locked).toBe(true)
      // champs publics attendus présents
      expect(c.title).toBeTruthy()
      expect(c.category).toBeTruthy()
      expect(c.excerpt).toBeTruthy()
    }
  })

  it('listPublicPrayerCards retourne une carte par prière', () => {
    const cards = listPublicPrayerCards()
    const members = listMemberPrayers()
    expect(cards.length).toBe(members.length)
  })

  it("une carte publique sérialisée ne contient aucun texte de contenu complet", () => {
    const full = getFullPrayer('priere-travail')
    expect(full).not.toBeNull()
    const card = toPublicPrayerCard({
      id: 'priere-travail', title: 't', category: 'Travail', summary: 's', excerpt: 'e',
      content: full!.content, coverIcon: '💼', accessLevel: 'member',
    })
    const json = JSON.stringify(card)
    expect(json.includes(full!.content)).toBe(false)
  })
})

describe('Bibliothèque de Prières — accès membre', () => {
  it('getFullPrayer(id) retourne le contenu complet', () => {
    const p = getFullPrayer('priere-delivrance')
    expect(p).not.toBeNull()
    expect(p!.content.length).toBeGreaterThan(50)
    expect(p!.title).toBeTruthy()
  })

  it('id inconnu => null', () => {
    expect(getFullPrayer('inexistant')).toBeNull()
    expect(getFullPrayer('')).toBeNull()
  })

  it('listMemberPrayers inclut le contenu mais pas de PDF', () => {
    const list = listMemberPrayers()
    expect(list.length).toBeGreaterThan(0)
    for (const p of list) {
      expect(p.content).toBeTruthy()
      expect(p).not.toHaveProperty('pdf')
    }
  })
})

describe('Bibliothèque de Prières — catégories', () => {
  it('listPrayerCategories retourne des catégories uniques', () => {
    const cats = listPrayerCategories()
    expect(cats.length).toBeGreaterThan(0)
    expect(new Set(cats).size).toBe(cats.length)
  })
})
