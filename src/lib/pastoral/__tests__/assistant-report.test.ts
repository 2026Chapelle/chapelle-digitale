import { describe, it, expect } from 'vitest'
import { buildAssistantResponse } from '@/lib/pastoral/assistant-report'
import type { IntakeLite } from '@/lib/pastoral/newcomer-intelligence'

const NOW = Date.parse('2026-07-08T12:00:00Z')
const iso = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString()

const rows: IntakeLite[] = [
  { id: 'a', prenom: 'Kevin', nom: 'A', status: 'new', created_at: iso(1), metadata: null, assigned_to_profile_id: null },
  { id: 'b', prenom: 'Awa', nom: null, status: 'to_review', created_at: iso(40), metadata: null, assigned_to_profile_id: 'p1' },
  { id: 'c', prenom: 'Jon', nom: 'M', status: 'contacted', created_at: iso(10), processed_at: iso(6), metadata: { admin_note: 'ok' }, assigned_to_profile_id: null },
  { id: 'd', prenom: 'Marie', nom: 'D', status: 'converted', created_at: iso(20), metadata: { admin_note: 'suivie' }, converted_profile_id: null },
  { id: 'e', prenom: 'Luc', nom: 'B', status: 'converted', created_at: iso(25), metadata: { admin_note: 'ok' }, converted_profile_id: 'prof-9' },
]

describe('buildAssistantResponse — structure commune', () => {
  it('inclut toujours dataBasis et limites (mention données disponibles)', () => {
    for (const intent of ['rapport_global', 'suivis_prioritaires', 'nouveaux_venus', 'non_assignes', 'conversions_a_verifier', 'notes_manquantes', 'limites_donnees', 'unknown'] as const) {
      const r = buildAssistantResponse(intent, rows, NOW)
      expect(r.dataBasis).toContain('lecture seule')
      expect(r.limits.length).toBeGreaterThan(0)
      expect(r.title).toBeTruthy()
      expect(r.summary).toBeTruthy()
    }
  })
  it('les personnes concernées portent un href vers la fiche', () => {
    const r = buildAssistantResponse('suivis_prioritaires', rows, NOW)
    for (const p of r.people) expect(p.href).toBe(`/admin/nouveaux-venus/${p.id}`)
  })
})

describe('buildAssistantResponse — par intent', () => {
  it('non_assignes → seulement les actifs sans responsable', () => {
    const r = buildAssistantResponse('non_assignes', rows, NOW)
    const ids = r.people.map((p) => p.id).sort()
    expect(ids).toEqual(['a', 'c']) // a(new,null), c(contacted,null) ; b assigné ; d/e converted
  })
  it('conversions_a_verifier → converted sans profil lié', () => {
    const r = buildAssistantResponse('conversions_a_verifier', rows, NOW)
    const ids = r.people.map((p) => p.id)
    expect(ids).toEqual(['d'])          // d converted sans converted_profile_id
    expect(ids).not.toContain('e')      // e converted AVEC profil lié
  })
  it('notes_manquantes → actifs (non convertis) sans note pastorale', () => {
    const r = buildAssistantResponse('notes_manquantes', rows, NOW)
    const ids = r.people.map((p) => p.id).sort()
    expect(ids).toEqual(['a', 'b']) // a(new,sans note) + b(to_review,sans note) ; c a une note ; d/e convertis
  })
  it('nouveaux_venus → arrivées ≤ 7 jours', () => {
    const r = buildAssistantResponse('nouveaux_venus', rows, NOW)
    expect(r.people.map((p) => p.id)).toEqual(['a']) // seul a (1j) ; les autres > 7j
  })
  it('rapport_global → résumé chiffré + suggestions', () => {
    const r = buildAssistantResponse('rapport_global', rows, NOW)
    expect(r.summary).toMatch(/demande\(s\) au total/)
    expect(r.findings.length).toBeGreaterThan(0)
    expect(r.suggestions.length).toBeGreaterThan(0)
  })
  it('limites_donnees → aucune personne, explique l’absence de zone', () => {
    const r = buildAssistantResponse('limites_donnees', rows, NOW)
    expect(r.people).toEqual([])
    expect(r.findings.join(' ')).toMatch(/zone/i)
  })
  it('unknown → aucune personne, aucune invention, propose des exemples', () => {
    const r = buildAssistantResponse('unknown', rows, NOW)
    expect(r.intent).toBe('unknown')
    expect(r.people).toEqual([])
    expect(r.suggestions.length).toBeGreaterThan(0)
  })
  it('borne les personnes à 10 et expose le total', () => {
    const many: IntakeLite[] = Array.from({ length: 14 }, (_, i) => ({ id: `n${i}`, prenom: `P${i}`, nom: null, status: 'new', created_at: iso(2), metadata: null, assigned_to_profile_id: null }))
    const r = buildAssistantResponse('non_assignes', many, NOW)
    expect(r.people.length).toBe(10)
    expect(r.peopleTotal).toBe(14)
  })
})
