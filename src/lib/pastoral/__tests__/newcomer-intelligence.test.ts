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
    expect(r.quick.length).toBe(6)
    for (const q of r.quick) { expect(q.question).toBeTruthy(); expect(q.answer).toBeTruthy() }
  })
  it('gère une liste vide sans planter', () => {
    const r = computeNewcomerIntelligence([], NOW)
    expect(r.summary.total).toBe(0)
    expect(r.priorities).toEqual([])
    expect(r.recommendations).toEqual([])
    expect(r.quick.length).toBe(6)
  })
})

// ── V2.5-B.2-A — signaux enrichis (colonnes existantes uniquement) ──────────────
const enriched: IntakeLite[] = [
  { id: 'n1', prenom: 'Ada', nom: 'K', status: 'new', created_at: iso(2), metadata: null, assigned_to_profile_id: null },                         // actif, non assigné
  { id: 'n2', prenom: 'Ben', nom: 'L', status: 'to_review', created_at: iso(3), metadata: null, assigned_to_profile_id: 'prof-1' },               // actif, assigné
  { id: 'n3', prenom: 'Cyd', nom: 'M', status: 'contacted', created_at: iso(10), processed_at: iso(6), metadata: { admin_note: 'ok' }, assigned_to_profile_id: 'prof-2' }, // traité en 4j
  { id: 'n4', prenom: 'Dan', nom: 'O', status: 'converted', created_at: iso(30), processed_at: iso(24), metadata: { admin_note: 'suivi' }, converted_profile_id: null },   // converti SANS profil lié
  { id: 'n5', prenom: 'Eve', nom: 'P', status: 'converted', created_at: iso(40), processed_at: iso(30), metadata: { admin_note: 'suivi' }, converted_profile_id: 'prof-9' }, // converti AVEC profil lié
]

describe('computeNewcomerIntelligence — enrichissement V2.5-B.2-A', () => {
  const r = computeNewcomerIntelligence(enriched, NOW)

  it('compte assignés / non assignés sur les demandes actives', () => {
    // actifs = n1,n2,n3,n4,n5 (aucun duplicate/archived). Assignés = n2,n3.
    expect(r.summary.assignes).toBe(2)
    expect(r.summary.nonAssignes).toBe(3)
  })
  it('compte les conversions et celles à vérifier (sans profil lié)', () => {
    expect(r.summary.convertis).toBe(2)            // n4 + n5
    expect(r.summary.conversionsAVerifier).toBe(1) // n4 (converted_profile_id null)
  })
  it('calcule un délai moyen de premier contact à partir de processed_at', () => {
    // n3: 4j, n4: 6j, n5: 10j → moyenne ≈ 7
    expect(r.summary.delaiContactMoyenJours).toBe(7)
  })
  it('produit les recommandations enrichies prudentes', () => {
    const ids = r.recommendations.map((x) => x.id)
    expect(ids).toContain('assigner')
    expect(ids).toContain('conversion-verifier')
    for (const rec of r.recommendations) expect(rec.count).toBeGreaterThan(0)
  })
  it('relève la sévérité via le champ priority existant sans élargir la liste', () => {
    const urgent: IntakeLite[] = [{ id: 'u1', prenom: 'Zoe', nom: 'Q', status: 'to_review', created_at: iso(15), metadata: null, priority: 'urgent' }]
    const ru = computeNewcomerIntelligence(urgent, NOW)
    // 15 jours → normalement 'moyenne' ; priority urgent → relevé à 'haute'
    expect(ru.priorities).toHaveLength(1)
    expect(ru.priorities[0].severity).toBe('haute')
  })
  it('délai null quand aucune demande n’a été traitée', () => {
    const untouched: IntakeLite[] = [{ id: 'x', prenom: 'X', nom: null, status: 'new', created_at: iso(1), metadata: null }]
    expect(computeNewcomerIntelligence(untouched, NOW).summary.delaiContactMoyenJours).toBeNull()
  })
  it('reste rétro-compatible : rows sans champs enrichis → tout non assigné', () => {
    const r2 = computeNewcomerIntelligence(rows, NOW)
    expect(r2.summary.nonAssignes).toBeGreaterThan(0)
    expect(r2.summary.assignes).toBe(0)
  })
})

describe('computeNewcomerIntelligence — items cliquables des questions rapides', () => {
  const r = computeNewcomerIntelligence(rows, NOW)
  const q = (id: string) => r.quick.find((x) => x.id === id)!

  it('chaque question porte une liste items (éventuellement vide)', () => {
    for (const item of r.quick) expect(Array.isArray(item.items)).toBe(true)
  })
  it('« qui contacter » liste les non contactés actifs, exclut duplicate/archived', () => {
    const ids = q('q-contact').items.map((i) => i.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
    expect(ids).not.toContain('c') // déjà contacté
    expect(ids).not.toContain('e') // archived
    expect(ids).not.toContain('f') // duplicate
  })
  it('les items exposent reason / status / createdAt / severity (pour href et badges UI)', () => {
    const it = q('q-contact').items[0]
    expect(it.id).toBeTruthy()
    expect(it.name).toBeTruthy()
    expect(it.reason).toBeTruthy()
    expect(it.status).toBeTruthy()
    expect(it.createdAt).toBeTruthy()
    expect(['haute', 'moyenne', 'douce']).toContain(it.severity)
  })
  it('« intégrés ou en suivi » liste converted + contacted', () => {
    const ids = q('q-suivi').items.map((i) => i.id).sort()
    expect(ids).toEqual(['c', 'd'])
  })
  it('liste vide → items vides sur chaque question', () => {
    const empty = computeNewcomerIntelligence([], NOW)
    for (const item of empty.quick) expect(item.items).toEqual([])
  })
})
