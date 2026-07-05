import { describe, it, expect } from 'vitest'
import { conversionsOverTime, topTransitions } from '@/lib/pastoral/metrics'

describe('conversionsOverTime', () => {
  const rows = [
    { nouveau_statut: 'membre_actif', created_at: '2026-05-03T10:00:00Z' },
    { nouveau_statut: 'membre_actif', created_at: '2026-05-20T10:00:00Z' },
    { nouveau_statut: 'disciple', created_at: '2026-05-25T10:00:00Z' },
    { nouveau_statut: 'disciple', created_at: '2026-06-02T10:00:00Z' },
  ]
  it('regroupe par mois avec ventilation par statut', () => {
    const r = conversionsOverTime(rows, 'month')
    expect(r.map((x) => x.period)).toEqual(['2026-05', '2026-06'])
    const mai = r.find((x) => x.period === '2026-05')!
    expect(mai.total).toBe(3)
    expect(mai.byStatut).toEqual({ membre_actif: 2, disciple: 1 })
    expect(r.find((x) => x.period === '2026-06')!.byStatut).toEqual({ disciple: 1 })
  })
  it('ignore les dates invalides / absentes ; liste vide → []', () => {
    expect(conversionsOverTime([{ nouveau_statut: 'x', created_at: 'nope' }], 'month')).toEqual([])
    expect(conversionsOverTime([{ nouveau_statut: 'x' }], 'month')).toEqual([])
    expect(conversionsOverTime([], 'month')).toEqual([])
  })
  it('statut nul → clé «—»', () => {
    const r = conversionsOverTime([{ nouveau_statut: null, created_at: '2026-06-01T00:00:00Z' }], 'month')
    expect(r[0].byStatut['—']).toBe(1)
  })
})

describe('topTransitions', () => {
  const rows = [
    { ancien_statut: 'visiteur', nouveau_statut: 'membre_actif' },
    { ancien_statut: 'visiteur', nouveau_statut: 'membre_actif' },
    { ancien_statut: 'membre_actif', nouveau_statut: 'disciple' },
  ]
  it('agrège et trie les transitions décroissant', () => {
    const r = topTransitions(rows)
    expect(r[0]).toEqual({ from: 'visiteur', to: 'membre_actif', count: 2 })
    expect(r[1]).toEqual({ from: 'membre_actif', to: 'disciple', count: 1 })
  })
  it('respecte la limite ; ancien nul → «—» ; vide → []', () => {
    expect(topTransitions(rows, 1).length).toBe(1)
    expect(topTransitions([{ ancien_statut: null, nouveau_statut: 'membre_actif' }])[0].from).toBe('—')
    expect(topTransitions([])).toEqual([])
  })
})
