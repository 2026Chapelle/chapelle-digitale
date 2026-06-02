import { describe, it, expect } from 'vitest'
import {
  lastActivityDays, accountAgeDays, engagementScore, engagementLevel,
  conversionStage, memberAlerts,
} from '@/lib/pastoral-intelligence'
import { member, NOW, daysAgo } from './fixtures'

describe('lastActivityDays', () => {
  it('renvoie null sans aucune date connue', () => {
    expect(lastActivityDays(member(), NOW)).toBeNull()
  })
  it('compte les jours depuis derniere_connexion', () => {
    expect(lastActivityDays(member({ derniere_connexion: daysAgo(5) }), NOW)).toBe(5)
  })
  it('prend la date la plus récente entre connexion et session', () => {
    const m = member({ derniere_connexion: daysAgo(10), last_seen: daysAgo(2) })
    expect(lastActivityDays(m, NOW)).toBe(2)
  })
  it('ignore une date invalide', () => {
    expect(lastActivityDays(member({ derniere_connexion: 'pas-une-date' }), NOW)).toBeNull()
  })
})

describe('accountAgeDays', () => {
  it('vaut 0 sans created_at', () => {
    expect(accountAgeDays(member(), NOW)).toBe(0)
  })
  it('compte les jours depuis la création', () => {
    expect(accountAgeDays(member({ created_at: daysAgo(30) }), NOW)).toBe(30)
  })
})

describe('engagementScore', () => {
  it('vaut 0 sans aucun signal', () => {
    expect(engagementScore(member())).toBe(0)
  })
  it('agrège les signaux (récence + diversité)', () => {
    // active_days 5 (×3=15) + breadth 1 (×8) + prieres 2 (×2=4) = 27
    expect(engagementScore(member({ active_days_30: 5, prieres: 2 }))).toBe(27)
  })
  it('plafonne à 100', () => {
    const m = member({
      active_days_30: 20, prieres: 10, formations: 5, lives: 10,
      downloads: 10, events: 10, dons: 5,
    })
    expect(engagementScore(m)).toBe(100)
  })
})

describe('engagementLevel', () => {
  it('inactif si aucune activité et compte ancien', () => {
    expect(engagementLevel(member({ created_at: daysAgo(40) }), NOW)).toBe('inactif')
  })
  it('a_suivre si aucune activité mais compte récent', () => {
    expect(engagementLevel(member({ created_at: daysAgo(3) }), NOW)).toBe('a_suivre')
  })
  it('inactif si silencieux > 60 jours', () => {
    expect(engagementLevel(member({ derniere_connexion: daysAgo(70) }), NOW)).toBe('inactif')
  })
  it('en_risque si silencieux entre 31 et 60 jours', () => {
    expect(engagementLevel(member({ derniere_connexion: daysAgo(40) }), NOW)).toBe('en_risque')
  })
  it('tres_engage si récent et score élevé', () => {
    const m = member({
      derniere_connexion: daysAgo(1), active_days_30: 20, prieres: 10,
      formations: 5, lives: 10, downloads: 10, events: 10, dons: 5,
    })
    expect(engagementLevel(m, NOW)).toBe('tres_engage')
  })
  it('stable si récent et score moyen-bas', () => {
    // score 27 (< 35) et récent → stable
    const m = member({ derniere_connexion: daysAgo(1), active_days_30: 5, prieres: 2 })
    expect(engagementLevel(m, NOW)).toBe('stable')
  })
})

describe('conversionStage', () => {
  it('leader pour un rôle de direction', () => {
    expect(conversionStage({ role: 'pasteur', membre_statut: null, parcours_etape: 0 })).toBe('leader')
  })
  it('serviteur pour un formateur', () => {
    expect(conversionStage({ role: 'formateur', membre_statut: null, parcours_etape: 0 })).toBe('serviteur')
  })
  it('disciple si parcours avancé', () => {
    expect(conversionStage({ role: null, membre_statut: null, parcours_etape: 5 })).toBe('disciple')
  })
  it('membre selon le statut', () => {
    expect(conversionStage({ role: null, membre_statut: 'membre', parcours_etape: 0 })).toBe('membre')
  })
  it('inscrit par défaut (compte sans statut)', () => {
    expect(conversionStage({ role: null, membre_statut: null, parcours_etape: 0 })).toBe('inscrit')
  })
})

describe('memberAlerts', () => {
  it('signale une prière sans suivi', () => {
    const types = memberAlerts(member({ prieres_sans_suivi: 2 }), NOW).map((a) => a.type)
    expect(types).toContain('priere_sans_suivi')
  })
  it('signale une formation abandonnée', () => {
    const types = memberAlerts(member({ formations_abandonnees: 1 }), NOW).map((a) => a.type)
    expect(types).toContain('formation_abandonnee')
  })
  it('signale un nouveau membre sans intégration', () => {
    const m = member({ created_at: daysAgo(3) })
    const types = memberAlerts(m, NOW).map((a) => a.type)
    expect(types).toContain('nouveau_sans_integration')
  })
  it('signale une absence de 30j pour un membre réel', () => {
    const m = member({ membre_statut: 'membre', created_at: daysAgo(120), derniere_connexion: daysAgo(40) })
    const types = memberAlerts(m, NOW).map((a) => a.type)
    expect(types).toContain('absent_30j')
  })
  it('signale absence 7j + baisse pour un membre actif récemment silencieux', () => {
    const m = member({
      membre_statut: 'membre', created_at: daysAgo(120),
      derniere_connexion: daysAgo(10), connexions: 5,
    })
    const types = memberAlerts(m, NOW).map((a) => a.type)
    expect(types).toContain('absent_7j')
    expect(types).toContain('baisse_activite')
  })
  it('aucune alerte pour un inscrit récent actif', () => {
    const m = member({ created_at: daysAgo(3), derniere_connexion: daysAgo(1), prieres: 1 })
    expect(memberAlerts(m, NOW)).toHaveLength(0)
  })
})
