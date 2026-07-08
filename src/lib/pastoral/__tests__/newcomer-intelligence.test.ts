import { describe, it, expect } from 'vitest'
import { computeNewcomerIntelligence, type IntakeLite } from '@/lib/pastoral/newcomer-intelligence'

const NOW = Date.parse('2026-07-08T12:00:00Z')
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 24 * 60 * 60 * 1000).toISOString()

const rows: IntakeLite[] = [
  { id: 'a', prenom: 'Kevin', nom: 'A', status: 'new', created_at: iso(1), metadata: null },              // récent, non contacté, sans note
  { id: 'b', prenom: 'Awa', nom: null, status: 'to_review', created_at: iso(40), metadata: null },         // ancien, non contacté
  { id: 'c', prenom: 'Jon', nom: 'M', status: 'contacted', created_at: iso(10), metadata: null },          // contacté sans note
  { id: 'd', prenom: 'Marie', nom: 'D', status: 'converted', created_at: iso(20), metadata: { admin_note: 'Intégrée cellule' } }, // intégrée + note
  { id: 'e', prenom: 'Luc', nom: 'B', status: 'archived', created_at: iso(60), metadata: null },           // archivé → hors priorité
  { id: 'f', prenom: 'Esther', nom: 'N', status: 'duplicate', created_at: iso(2), metadata: null },        // doublon → hors priorité
]

describe('computeNewcomerIntelligence — synthèse', () => {
  const r = computeNewcomerIntelligence(rows, NOW)
  it('compte les cartes de synthèse', () => {
    expect(r.summary.total).toBe(6)
    expect(r.summary.aContacter).toBe(2)        // a (new) + b (to_review)
    expect(r.summary.contactes).toBe(1)         // c
    expect(r.summary.integresOuSuivi).toBe(2)   // d (converted) + c (contacted)
    expect(r.summary.avecNote).toBe(1)          // d
    expect(r.summary.nouveaux7j).toBe(2)        // a(1) + f(2)
  })
})

describe('computeNewcomerIntelligence — priorités', () => {
  const r = computeNewcomerIntelligence(rows, NOW)
  it('exclut duplicate et archived des priorités', () => {
    const ids = r.priorities.map((p) => p.id)
    expect(ids).not.toContain('e')
    expect(ids).not.toContain('f')
  })
  it('inclut les demandes actives à suivre, triées par sévérité', () => {
    const ids = r.priorities.map((p) => p.id)
    expect(ids).toContain('a') // récent non contacté → haute
    expect(ids).toContain('b') // ancien non contacté → haute
    expect(ids).toContain('c') // contacté sans note → douce
    expect(ids).not.toContain('d') // converti avec note → aucune attention requise
    // les hautes sévérités passent avant les douces
    expect(r.priorities[0].severity).toBe('haute')
    expect(r.priorities[r.priorities.length - 1].severity).toBe('douce')
  })
  it('emploie un langage prudent (aucun jugement négatif)', () => {
    const txt = r.priorities.map((p) => p.reason).join(' ').toLowerCase()
    for (const bad of ['mauvais', 'faible', 'zone morte', 'cas grave', 'grave']) {
      expect(txt.includes(bad)).toBe(false)
    }
  })
})

describe('computeNewcomerIntelligence — recommandations & questions', () => {
  it('ne produit que des recommandations avec count > 0', () => {
    const r = computeNewcomerIntelligence(rows, NOW)
    expect(r.recommendations.length).toBeGreaterThan(0)
    for (const rec of r.recommendations) expect(rec.count).toBeGreaterThan(0)
    expect(r.recommendations.map((x) => x.id)).toContain('contacter')
    expect(r.recommendations.map((x) => x.id)).toContain('relance') // b > 30j
  })
  it('fournit des réponses rapides déterministes', () => {
    const r = computeNewcomerIntelligence(rows, NOW)
    expect(r.quick.length).toBe(4)
    for (const q of r.quick) { expect(q.question).toBeTruthy(); expect(q.answer).toBeTruthy() }
  })
  it('gère une liste vide sans planter', () => {
    const r = computeNewcomerIntelligence([], NOW)
    expect(r.summary.total).toBe(0)
    expect(r.priorities).toEqual([])
    expect(r.recommendations).toEqual([])
    expect(r.quick.length).toBe(4)
  })
})
