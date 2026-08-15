import { describe, it, expect } from 'vitest'
import { deriveJourneyStage, journeyBadge } from '@/lib/pastoral/newcomer-journey'
import type { TriageResult } from '@/lib/pastoral/newcomer-triage'

// Fabrique un TriageResult minimal pour les tests (seuls bucket/isOverdue/followUpDue comptent).
const tri = (over: Partial<Pick<TriageResult, 'bucket' | 'isOverdue' | 'followUpDue'>> = {}) => ({
  bucket: over.bucket ?? 'todo',
  isOverdue: over.isOverdue ?? false,
  followUpDue: over.followUpDue ?? false,
})

describe('deriveJourneyStage — mapping statut + triage', () => {
  it('new récent → received (étape 1, non urgent)', () => {
    const m = deriveJourneyStage('new', tri({ bucket: 'todo' }))
    expect(m.stage).toBe('received')
    expect(m.step).toBe(1)
    expect(m.isUrgent).toBe(false)
    expect(m.orientations).toContain('welcome')
  })

  it('new en retard → to_contact (urgent)', () => {
    const m = deriveJourneyStage('new', tri({ bucket: 'todo', isOverdue: true }))
    expect(m.stage).toBe('to_contact')
    expect(m.isUrgent).toBe(true)
  })

  it('to_review en retard → to_contact', () => {
    expect(deriveJourneyStage('to_review', tri({ isOverdue: true })).stage).toBe('to_contact')
  })

  it('contacted récent → contacted (non urgent)', () => {
    const m = deriveJourneyStage('contacted', tri({ bucket: 'inprogress' }))
    expect(m.stage).toBe('contacted')
    expect(m.isUrgent).toBe(false)
    expect(m.orientations).toEqual(expect.arrayContaining(['culte', 'cellule', 'parcours']))
  })

  it('contacted + followUpDue → follow_up (urgent)', () => {
    const m = deriveJourneyStage('contacted', tri({ bucket: 'inprogress', followUpDue: true }))
    expect(m.stage).toBe('follow_up')
    expect(m.isUrgent).toBe(true)
  })

  it('converted → integrated', () => {
    expect(deriveJourneyStage('converted', tri({ bucket: 'closed' })).stage).toBe('integrated')
  })

  it('duplicate / archived → closed (sans orientation)', () => {
    expect(deriveJourneyStage('duplicate', tri({ bucket: 'closed' })).stage).toBe('closed')
    const m = deriveJourneyStage('archived', tri({ bucket: 'closed' }))
    expect(m.stage).toBe('closed')
    expect(m.orientations).toEqual([])
  })

  it('statut inconnu → repli prudent selon la phase', () => {
    expect(deriveJourneyStage('???', tri({ bucket: 'todo' })).stage).toBe('received')
    expect(deriveJourneyStage('???', tri({ bucket: 'closed' })).stage).toBe('closed')
    expect(deriveJourneyStage('???', tri({ bucket: 'inprogress' })).stage).toBe('contacted')
  })
})

describe('deriveJourneyStage — checklist LECTURE SEULE (aucune invention)', () => {
  it('new sans note : rien de coché', () => {
    const m = deriveJourneyStage('new', tri())
    expect(m.checklist.find((c) => c.label.startsWith('Premier contact'))?.done).toBe(false)
    expect(m.checklist.find((c) => c.label.startsWith('Besoin pastoral'))?.done).toBe(false)
  })

  it('contacted avec note : contact + note cochés, intégration non', () => {
    const m = deriveJourneyStage('contacted', tri({ bucket: 'inprogress' }), { hasNote: true })
    expect(m.checklist.find((c) => c.label.startsWith('Premier contact'))?.done).toBe(true)
    expect(m.checklist.find((c) => c.label.startsWith('Besoin pastoral'))?.done).toBe(true)
    expect(m.checklist.find((c) => c.label.startsWith('Intégration'))?.done).toBe(false)
  })

  it('converted : intégration + orientation cochées', () => {
    const m = deriveJourneyStage('converted', tri({ bucket: 'closed' }), { hasNote: true })
    expect(m.checklist.find((c) => c.label.startsWith('Intégration'))?.done).toBe(true)
    expect(m.checklist.find((c) => c.label.startsWith('Orientation'))?.done).toBe(true)
  })
})

describe('journeyBadge', () => {
  it('résume étape + urgence pour la liste', () => {
    const b = journeyBadge(deriveJourneyStage('contacted', tri({ followUpDue: true })))
    expect(b.step).toBe(4)
    expect(b.label).toBe('Relance douce')
    expect(b.isUrgent).toBe(true)
  })
})

describe('déterminisme', () => {
  it('mêmes entrées → même sortie', () => {
    const a = deriveJourneyStage('contacted', tri({ followUpDue: true }), { hasNote: true })
    const b = deriveJourneyStage('contacted', tri({ followUpDue: true }), { hasNote: true })
    expect(a).toEqual(b)
  })
})
