import { describe, it, expect } from 'vitest'
import { healthIndex, classify, classificationLabel, type MemberActivity } from '@/lib/health'

const activity = (o: Partial<MemberActivity> = {}): MemberActivity => ({
  prayers: 0, completions: 0, events: 0, formationsTerminees: 0,
  scoreEngagement: 0, lastActivityDays: null, accountAgeDays: 0, ...o,
})

describe('healthIndex', () => {
  it('rouge à réengager si inactif et compte ancien', () => {
    const r = healthIndex(activity({ lastActivityDays: null, accountAgeDays: 60 }))
    expect(r.color).toBe('rouge')
    expect(r.label).toBe('À réengager')
  })
  it('rouge si dernière activité > 60 jours', () => {
    expect(healthIndex(activity({ lastActivityDays: 90 })).color).toBe('rouge')
  })
  it('orange fragile entre 31 et 60 jours', () => {
    expect(healthIndex(activity({ lastActivityDays: 45 })).color).toBe('orange')
  })
  it('vert engagé pour une forte activité récente', () => {
    const r = healthIndex(activity({
      prayers: 10, completions: 20, events: 10, formationsTerminees: 5,
      scoreEngagement: 100, lastActivityDays: 5,
    }))
    expect(r.color).toBe('vert')
    expect(r.label).toBe('Engagé')
  })
  it('jaune à suivre pour une activité modérée récente', () => {
    const r = healthIndex(activity({ prayers: 2, scoreEngagement: 20, lastActivityDays: 10 }))
    expect(r.color).toBe('jaune')
  })
})

describe('classify', () => {
  it('responsable selon le rôle', () => {
    expect(classify(activity({ role: 'pasteur' }))).toBe('responsable')
  })
  it('membre si intégration validée', () => {
    expect(classify(activity({ estMembre: true }))).toBe('membre')
  })
  it('membre via socle d’engagement (formation terminée + prière)', () => {
    expect(classify(activity({ formationsTerminees: 1, prayers: 1 }))).toBe('membre')
  })
  it('fidèle si activité récente et diversifiée', () => {
    expect(classify(activity({ prayers: 1, events: 1, lastActivityDays: 10 }))).toBe('fidele')
  })
  it('fidèle si récent et score d’engagement suffisant', () => {
    expect(classify(activity({ scoreEngagement: 40, lastActivityDays: 5 }))).toBe('fidele')
  })
  it('inscrit par défaut (aucune activité récente)', () => {
    expect(classify(activity({ lastActivityDays: null }))).toBe('inscrit')
  })
})

describe('classificationLabel', () => {
  it('renvoie le libellé FR', () => {
    expect(classificationLabel('responsable')).toBe('Responsable')
    expect(classificationLabel('fidele')).toBe('Fidèle')
  })
})
