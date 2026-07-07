import { describe, it, expect } from 'vitest'
import { filterNewcomers, normalizeSearch, type NewcomerFilterItem } from '@/lib/pastoral/newcomer-filter'

const rows: NewcomerFilterItem[] = [
  { prenom: 'Élodie', nom: 'Kouassi', email: 'elodie@ex.com', telephone: '+225 07 00 00 01', source: 'nouveau_venu_form', status: 'new' },
  { prenom: 'Awa', nom: 'Diallo', email: 'awa.d@mail.com', telephone: '+221 77 12 34 56', source: 'live', status: 'contacted' },
  { prenom: 'Jean-Marc', nom: 'Bernard', email: null, telephone: '+33 6 11 22 33 44', source: 'invitation', status: 'converted' },
]

const ids = (l: NewcomerFilterItem[]) => l.map((x) => x.prenom)

describe('normalizeSearch', () => {
  it('minuscule + accents supprimés + trim', () => {
    expect(normalizeSearch('  ÉLodie  ')).toBe('elodie')
    expect(normalizeSearch('Ç')).toBe('c')
    expect(normalizeSearch(null)).toBe('')
  })
})

describe('filterNewcomers', () => {
  it('query vide = tout', () => {
    expect(filterNewcomers(rows, {})).toHaveLength(3)
    expect(filterNewcomers(rows, { query: '   ' })).toHaveLength(3)
  })

  it('filtre par statut', () => {
    expect(ids(filterNewcomers(rows, { status: 'new' }))).toEqual(['Élodie'])
    expect(filterNewcomers(rows, { status: 'archived' })).toHaveLength(0)
  })

  it('recherche prénom / nom / nom complet', () => {
    expect(ids(filterNewcomers(rows, { query: 'kouassi' }))).toEqual(['Élodie'])
    expect(ids(filterNewcomers(rows, { query: 'awa' }))).toEqual(['Awa'])
    expect(ids(filterNewcomers(rows, { query: 'awa diallo' }))).toEqual(['Awa'])
  })

  it('recherche email', () => {
    expect(ids(filterNewcomers(rows, { query: 'awa.d@mail' }))).toEqual(['Awa'])
  })

  it('recherche téléphone (espacé et chiffres seuls)', () => {
    expect(ids(filterNewcomers(rows, { query: '77 12' }))).toEqual(['Awa'])
    expect(ids(filterNewcomers(rows, { query: '2217712' }))).toEqual(['Awa'])
  })

  it('recherche source', () => {
    expect(ids(filterNewcomers(rows, { query: 'invitation' }))).toEqual(['Jean-Marc'])
  })

  it('casse ignorée', () => {
    expect(ids(filterNewcomers(rows, { query: 'DIALLO' }))).toEqual(['Awa'])
  })

  it('accents ignorés (query sans accent → match Élodie)', () => {
    expect(ids(filterNewcomers(rows, { query: 'elodie' }))).toEqual(['Élodie'])
  })

  it('combine statut + recherche', () => {
    expect(filterNewcomers(rows, { status: 'new', query: 'awa' })).toHaveLength(0)
    expect(ids(filterNewcomers(rows, { status: 'new', query: 'elodie' }))).toEqual(['Élodie'])
  })
})
