import { describe, it, expect } from 'vitest'
import { GUIDES, HELP_CATEGORIES, searchGuides, guideForPath } from '@/lib/help/guides'

describe('catalogue des guides', () => {
  it('chaque guide a tous les champs requis non vides', () => {
    for (const g of GUIDES) {
      expect(g.id).toBeTruthy()
      expect(g.title).toBeTruthy()
      expect(g.objectif).toBeTruthy()
      expect(g.quand).toBeTruthy()
      expect(g.etapes.length).toBeGreaterThan(0)
      expect(g.erreurs.length).toBeGreaterThan(0)
      expect(g.href.startsWith('/')).toBe(true)
      expect(g.tip).toBeTruthy()
      expect(HELP_CATEGORIES).toContain(g.category)
    }
  })
  it('les identifiants sont uniques', () => {
    const ids = GUIDES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('chaque catégorie a au moins un guide', () => {
    for (const c of HELP_CATEGORIES) expect(GUIDES.some((g) => g.category === c)).toBe(true)
  })
})

describe('searchGuides', () => {
  it('vide → tous les guides', () => {
    expect(searchGuides('').length).toBe(GUIDES.length)
  })
  it('filtre par terme (présence/réunion)', () => {
    const r = searchGuides('présence')
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((g) => JSON.stringify(g).toLowerCase().includes('présen'))).toBe(true)
  })
  it('multi-termes en ET', () => {
    expect(searchGuides('groupe plateforme').some((g) => g.id === 'groupes')).toBe(true)
  })
  it('terme absent → vide', () => {
    expect(searchGuides('zzzqqq-introuvable').length).toBe(0)
  })
})

describe('guideForPath', () => {
  it('chemin exact', () => {
    expect(guideForPath('/admin/dashboard')?.id).toBe('tableau-de-bord')
    expect(guideForPath('/admin/groupes')?.id).toBe('groupes')
    expect(guideForPath('/admin/reunions')?.id).toBe('presences')
  })
  it('fiche membre via préfixe /admin/membres/*', () => {
    expect(guideForPath('/admin/membres/123e4567-e89b-12d3-a456-426614174000')?.id).toBe('fiche-360')
  })
  it('liste membres (exact) ≠ fiche', () => {
    expect(guideForPath('/admin/membres')?.id).toBe('membres')
  })
  it('chemin sans guide → null', () => {
    expect(guideForPath('/admin/inconnu')).toBeNull()
  })
})
