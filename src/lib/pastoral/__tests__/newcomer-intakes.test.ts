import { describe, it, expect, vi } from 'vitest'

// newcomer-intakes-server importe newcomer-admin-client (supabaseAdmin + server-only).
vi.mock('server-only', () => ({}))

import { computeNewcomerStats, type NewcomerIntakeRow } from '@/lib/pastoral/newcomer-intakes-server'

const NOW = Date.parse('2026-07-07T12:00:00Z')
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 24 * 60 * 60 * 1000).toISOString()

const rows: NewcomerIntakeRow[] = [
  { id: 'a', prenom: 'Kevin', nom: 'A', source: 'nouveau_venu_form', status: 'new', created_at: iso(1) },
  { id: 'b', prenom: 'Awa', nom: null, source: 'nouveau_venu_form', status: 'to_review', created_at: iso(3) },
  { id: 'c', prenom: 'Jon', nom: 'M', source: 'nouveau_venu_form', status: 'contacted', created_at: iso(10) },
  { id: 'd', prenom: 'Marie', nom: 'D', source: 'nouveau_venu_form', status: 'converted', created_at: iso(20) },
  { id: 'e', prenom: 'Luc', nom: 'B', source: 'nouveau_venu_form', status: 'archived', created_at: iso(40) },
  { id: 'f', prenom: 'Esther', nom: 'N', source: 'nouveau_venu_form', status: 'duplicate', created_at: iso(2) },
]

describe('computeNewcomerStats', () => {
  it('compte le total et la répartition par statut', () => {
    const s = computeNewcomerStats(rows, NOW)
    expect(s.total).toBe(6)
    expect(s.by_status.new).toBe(1)
    expect(s.by_status.to_review).toBe(1)
    expect(s.by_status.contacted).toBe(1)
    expect(s.by_status.converted).toBe(1)
    expect(s.by_status.archived).toBe(1)
    expect(s.by_status.duplicate).toBe(1)
  })

  it('calcule les fenêtres 7j / 30j sur created_at', () => {
    const s = computeNewcomerStats(rows, NOW)
    // 7j : a(1) + f(2) + b(3) = 3 ; 30j : + c(10) + d(20) = 5 (e=40 exclu)
    expect(s.nouveaux_7j).toBe(3)
    expect(s.nouveaux_30j).toBe(5)
  })

  it('dérive a_traiter / contactes / integres', () => {
    const s = computeNewcomerStats(rows, NOW)
    expect(s.a_traiter).toBe(3) // new + to_review + contacted
    expect(s.contactes).toBe(1)
    expect(s.integres).toBe(1)
  })

  it('renvoie les dernières demandes triées desc et bornées', () => {
    const s = computeNewcomerStats(rows, NOW, 3)
    expect(s.derniers).toHaveLength(3)
    expect(s.derniers.map((d) => d.id)).toEqual(['a', 'f', 'b']) // 1j, 2j, 3j
  })

  it('gère les entrées vides / statuts inconnus sans planter', () => {
    const s = computeNewcomerStats(
      [{ id: 'x', prenom: '', nom: null, source: null, status: 'weird', created_at: null }] as NewcomerIntakeRow[],
      NOW,
    )
    expect(s.total).toBe(1)
    expect(s.a_traiter).toBe(0)
    expect(s.derniers[0].prenom).toBe('—')
  })

  it('renvoie des zéros pour une liste vide', () => {
    const s = computeNewcomerStats([], NOW)
    expect(s.total).toBe(0)
    expect(s.nouveaux_7j).toBe(0)
    expect(s.integres).toBe(0)
    expect(s.derniers).toEqual([])
  })
})
