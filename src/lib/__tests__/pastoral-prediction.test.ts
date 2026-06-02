import { describe, it, expect } from 'vitest'
import {
  churnRisk, followUpAction, formationAbandonRisk, absenceRisk, needsFollowUp,
} from '@/lib/pastoral-prediction'
import { member, NOW, daysAgo } from './fixtures'

describe('churnRisk', () => {
  it('oriente l’intégration pour un nouveau compte sans signal', () => {
    const p = churnRisk(member({ created_at: daysAgo(3) }), NOW)
    expect(p.niveau).toBe('moyen')
    expect(p.action).toBe('integration_accompagnement')
  })
  it('reste faible pour un nouveau compte avec un signal', () => {
    const p = churnRisk(member({ created_at: daysAgo(3), formations: 1 }), NOW)
    expect(p.niveau).toBe('faible')
    expect(p.action).toBe('observation')
  })
  it('est critique pour un membre ancien totalement inactif', () => {
    const p = churnRisk(member({ created_at: daysAgo(60) }), NOW)
    expect(p.score).toBeGreaterThanOrEqual(75)
    expect(p.niveau).toBe('critique')
    expect(p.action).toBe('contact_personnel')
  })
  it('est faible pour un membre ancien très actif', () => {
    const m = member({
      created_at: daysAgo(60), derniere_connexion: daysAgo(2), connexions: 5,
      active_days_30: 10, prieres: 3, formations: 2, events: 2, dons: 1,
    })
    const p = churnRisk(m, NOW)
    expect(p.niveau).toBe('faible')
  })
  it('priorise l’assignation d’un intercesseur si prière sans suivi', () => {
    const m = member({ created_at: daysAgo(60), derniere_connexion: daysAgo(2), prieres_sans_suivi: 1, connexions: 5 })
    expect(churnRisk(m, NOW).action).toBe('assigner_intercession')
  })
})

describe('followUpAction', () => {
  it('intercession prime sur tout le reste', () => {
    expect(followUpAction(member({ prieres_sans_suivi: 1 }), 'critique')).toBe('assigner_intercession')
  })
  it('contact personnel pour un risque critique', () => {
    expect(followUpAction(member(), 'critique')).toBe('contact_personnel')
  })
  it('observation pour un risque faible', () => {
    expect(followUpAction(member(), 'faible')).toBe('observation')
  })
})

describe('formationAbandonRisk', () => {
  it('nul si la formation est terminée', () => {
    const r = formationAbandonRisk(100, 0, 30)
    expect(r.score).toBe(0)
    expect(r.raison).toBe('Terminée')
  })
  it('critique si jamais commencée et inactive', () => {
    const r = formationAbandonRisk(0, null, 10)
    expect(r.score).toBeGreaterThanOrEqual(75)
    expect(r.niveau).toBe('critique')
    expect(r.raison).toBe('jamais commencée')
  })
  it('faible si progression conforme et accès récent', () => {
    const r = formationAbandonRisk(60, 1, 10)
    expect(r.niveau).toBe('faible')
  })
})

describe('absenceRisk', () => {
  it('critique sans aucune activité ni événement', () => {
    const r = absenceRisk(member(), NOW)
    expect(r.score).toBeGreaterThanOrEqual(75)
    expect(r.niveau).toBe('critique')
  })
  it('faible si présence récente et régulière', () => {
    const m = member({ derniere_connexion: daysAgo(2), events: 3, active_days_30: 10 })
    expect(absenceRisk(m, NOW).niveau).toBe('faible')
  })
})

describe('needsFollowUp', () => {
  it('renvoie une prédiction pour un membre à risque', () => {
    const fu = needsFollowUp(member({ created_at: daysAgo(60) }), NOW)
    expect(fu).not.toBeNull()
    expect(fu!.niveau).toBe('critique')
  })
  it('null pour un membre actif sans risque', () => {
    const m = member({
      created_at: daysAgo(60), derniere_connexion: daysAgo(2), connexions: 5,
      active_days_30: 10, prieres: 3, formations: 2, events: 2, dons: 1,
    })
    expect(needsFollowUp(m, NOW)).toBeNull()
  })
})
