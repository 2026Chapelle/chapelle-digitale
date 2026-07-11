import { describe, it, expect } from 'vitest'
import {
  deriveDisplayType, isParcoursType, formationGroup,
  selectHomeFormations, selectHomeEvents,
  validateFeaturedInput, exceedsFeaturedLimit, hasDuplicateOrder,
  FEATURED_LIMITS, type FormationRow, type EventRow,
} from '@/lib/cms/featured'

const UUID = '11111111-1111-1111-1111-111111111111'

const f = (p: Partial<FormationRow>): FormationRow => ({ id: Math.random().toString(36).slice(2), statut: 'publie', ...p })

describe('deriveDisplayType / groupe', () => {
  it('reconnaît type=parcours comme Parcours', () => {
    expect(deriveDisplayType('parcours')).toBe('Parcours')
    expect(isParcoursType('parcours')).toBe(true)
    expect(formationGroup('parcours')).toBe('parcours')
  })
  it('autres types → Formation/Enseignement/Programme, groupe formations', () => {
    expect(deriveDisplayType('cours')).toBe('Formation')
    expect(deriveDisplayType('masterclass')).toBe('Enseignement')
    expect(deriveDisplayType('certification')).toBe('Programme')
    expect(deriveDisplayType(null)).toBe('Formation')
    expect(formationGroup('cours')).toBe('formations')
    expect(isParcoursType('cours')).toBe(false)
  })
})

describe('selectHomeFormations', () => {
  it('sans vedette → repli déterministe (plus récent), max 3', () => {
    const rows = [
      f({ id: 'a', created_at: '2026-01-01' }),
      f({ id: 'b', created_at: '2026-03-01' }),
      f({ id: 'c', created_at: '2026-02-01' }),
      f({ id: 'd', created_at: '2026-04-01' }),
    ]
    const out = selectHomeFormations(rows, 3)
    expect(out.map((x) => x.id)).toEqual(['d', 'b', 'c'])
  })
  it('avec vedettes → uniquement les vedettes triées par featured_order', () => {
    const rows = [
      f({ id: 'a', is_featured: true, featured_order: 2 }),
      f({ id: 'b', is_featured: false, created_at: '2026-05-01' }),
      f({ id: 'c', is_featured: true, featured_order: 1 }),
    ]
    const out = selectHomeFormations(rows, 3)
    expect(out.map((x) => x.id)).toEqual(['c', 'a'])
  })
  it('sélection partielle NON complétée (1 vedette → 1 carte)', () => {
    const rows = [
      f({ id: 'a', is_featured: true, featured_order: 0 }),
      f({ id: 'b', is_featured: false, created_at: '2026-05-01' }),
      f({ id: 'c', is_featured: false, created_at: '2026-06-01' }),
    ]
    expect(selectHomeFormations(rows, 3).map((x) => x.id)).toEqual(['a'])
  })
  it('borne à la limite (max 3 même si 5 vedettes)', () => {
    const rows = [1, 2, 3, 4, 5].map((n) => f({ id: `f${n}`, is_featured: true, featured_order: n }))
    expect(selectHomeFormations(rows, 3)).toHaveLength(3)
  })
  it('fusionne les types (parcours + formation) dans le même tri', () => {
    const rows = [
      f({ id: 'p', type: 'parcours', is_featured: true, featured_order: 1 }),
      f({ id: 'c', type: 'cours', is_featured: true, featured_order: 2 }),
    ]
    expect(selectHomeFormations(rows, 3).map((x) => x.id)).toEqual(['p', 'c'])
  })
})

describe('selectHomeEvents', () => {
  const e = (p: Partial<EventRow>): EventRow => ({ id: Math.random().toString(36).slice(2), status: 'published', ...p })
  it('sans vedette → repli (ordre entrant) tronqué à fallbackLimit', () => {
    const rows = [e({ id: 'a', starts_at: '2026-01-01' }), e({ id: 'b', starts_at: '2026-02-01' })]
    expect(selectHomeEvents(rows, 6, 1).map((x) => x.id)).toEqual(['a'])
  })
  it('avec vedettes → uniquement les vedettes triées par sort_order puis starts_at', () => {
    const rows = [
      e({ id: 'a', is_featured: true, sort_order: 2, starts_at: '2026-01-01' }),
      e({ id: 'b', is_featured: false, starts_at: '2026-01-02' }),
      e({ id: 'c', is_featured: true, sort_order: 1, starts_at: '2026-05-01' }),
    ]
    expect(selectHomeEvents(rows, 6).map((x) => x.id)).toEqual(['c', 'a'])
  })
  it('borne à 6 événements en vedette', () => {
    const rows = Array.from({ length: 9 }, (_, i) => e({ id: `e${i}`, is_featured: true, sort_order: i }))
    expect(selectHomeEvents(rows, 6)).toHaveLength(6)
  })
})

describe('validateFeaturedInput', () => {
  it('accepte une entrée valide', () => {
    const r = validateFeaturedInput({ resource: 'formations', id: UUID, is_featured: true, order: 2 })
    expect(r.ok).toBe(true)
  })
  it('refuse une ressource non autorisée', () => {
    expect(validateFeaturedInput({ resource: 'parcours', id: UUID, is_featured: true, order: 0 }).ok).toBe(false)
    expect(validateFeaturedInput({ resource: 'profiles', id: UUID, is_featured: true, order: 0 }).ok).toBe(false)
  })
  it('refuse un identifiant invalide', () => {
    expect(validateFeaturedInput({ resource: 'formations', id: 'not-a-uuid', is_featured: true, order: 0 }).ok).toBe(false)
  })
  it('refuse is_featured non booléen', () => {
    expect(validateFeaturedInput({ resource: 'formations', id: UUID, is_featured: 'yes', order: 0 }).ok).toBe(false)
  })
  it('refuse un ordre non entier', () => {
    expect(validateFeaturedInput({ resource: 'formations', id: UUID, is_featured: true, order: 1.5 }).ok).toBe(false)
  })
  it('refuse un ordre négatif pour formations', () => {
    expect(validateFeaturedInput({ resource: 'formations', id: UUID, is_featured: true, order: -1 }).ok).toBe(false)
  })
  it('tolère un ordre entier négatif pour cms_events (règle sort_order existante)', () => {
    expect(validateFeaturedInput({ resource: 'cms_events', id: UUID, is_featured: true, order: -3 }).ok).toBe(true)
  })
})

describe('exceedsFeaturedLimit', () => {
  it('respecte les limites 3/3/6', () => {
    expect(FEATURED_LIMITS).toEqual({ formations: 3, parcours: 3, events: 6 })
    expect(exceedsFeaturedLimit('formations', 3, true)).toBe(true)   // 4e refusée
    expect(exceedsFeaturedLimit('formations', 2, true)).toBe(false)  // 3e OK
    expect(exceedsFeaturedLimit('parcours', 3, true)).toBe(true)     // 4e parcours refusé
    expect(exceedsFeaturedLimit('events', 6, true)).toBe(true)       // 7e événement refusé
    expect(exceedsFeaturedLimit('events', 5, true)).toBe(false)
  })
  it('ne bloque jamais une désactivation', () => {
    expect(exceedsFeaturedLimit('formations', 9, false)).toBe(false)
  })
})

describe('hasDuplicateOrder', () => {
  it('détecte un ordre dupliqué parmi les vedettes actives', () => {
    expect(hasDuplicateOrder([1, 2, 3], 2, true)).toBe(true)
    expect(hasDuplicateOrder([1, 2, 3], 4, true)).toBe(false)
  })
  it('ignore le contrôle si le contenu est désactivé', () => {
    expect(hasDuplicateOrder([1, 2, 3], 2, false)).toBe(false)
  })
})
