/**
 * Tests du modèle canonique PUR (types EN + adapter + readiness + signals).
 * Aucune écriture, aucune DB. Prouve : mapping déterministe, cas ambigus marqués
 * requires_review (aucune promotion implicite), readiness ≠ promotion, signaux
 * factuels sans score spirituel.
 */
import { describe, it, expect } from 'vitest'
import { legacyToCanonicalView } from '@/lib/canonical/legacy-adapter'
import { evaluateJourneyReadiness } from '@/lib/canonical/journey-readiness'
import {
  pedagogicalCriteriaSignal, newcomerWithoutSupportSignal, isForbiddenSpiritualVerdict,
} from '@/lib/canonical/pastoral-signals'

const T0 = '2026-08-19T00:00:00.000Z'

describe('Canonical adapter — mapping legacy(FR) → canonique(EN) déterministe', () => {
  it('visiteur = seul état SÛR (confirmed sur growth ET community, clés EN)', () => {
    const v = legacyToCanonicalView({ membre_statut: 'visiteur', role: 'visiteur' })
    expect(v.growth).toEqual({ level: 'visitor', confidence: 'confirmed' })
    expect(v.community).toEqual({ status: 'visitor', confidence: 'confirmed' })
    expect(v.ministry_roles).toEqual([])
    expect(v.source).toBe('legacy_fallback')
  })

  it("membre_actif ne devient JAMAIS disciple — growth requires_review (interdit explicite)", () => {
    const v = legacyToCanonicalView({ membre_statut: 'membre_actif', role: 'membre' })
    expect(v.growth.level).toBeNull()
    expect(v.growth.confidence).toBe('requires_review')
    expect(v.growth.level).not.toBe('disciple')
    expect(v.community.confidence).toBe('requires_review')
  })

  it('nouveau_membre / disciple (auto-promus) → requires_review, non blanchis', () => {
    for (const s of ['nouveau_membre', 'disciple']) {
      const v = legacyToCanonicalView({ membre_statut: s })
      expect(v.growth.confidence).toBe('requires_review')
      expect(v.growth.level).toBeNull()
    }
  })

  it('leader_cellule/berger/pasteur → décomposés en ministry EN (fuite d’axe récupérée)', () => {
    expect(legacyToCanonicalView({ membre_statut: 'leader_cellule' }).ministry_roles).toContain('cell_leader')
    expect(legacyToCanonicalView({ membre_statut: 'berger' }).ministry_roles).toContain('shepherd')
    const p = legacyToCanonicalView({ membre_statut: 'pasteur' })
    expect(p.ministry_roles).toContain('pastor')
    expect(p.growth.level).toBeNull() // pastor n'est pas un growth_level
    expect(p.notes.some((n) => n.includes('pasteur'))).toBe(true)
  })

  it("role='leader' est ambigu → non mappé, note émise (pas de fausse équivalence)", () => {
    const v = legacyToCanonicalView({ membre_statut: 'membre_actif', role: 'leader' })
    expect(v.ministry_roles).not.toContain('cell_leader')
    expect(v.notes.some((n) => n.includes('leader'))).toBe(true)
  })

  it('rôles fonctionnels non ambigus (formateur, responsable_integration) → ministry EN', () => {
    expect(legacyToCanonicalView({ role: 'formateur' }).ministry_roles).toContain('trainer')
    expect(legacyToCanonicalView({ role: 'responsable_integration' }).ministry_roles).toContain('integration_lead')
  })

  it('parcours_disciple_etape relu en LEARNING seulement (jamais growth/community)', () => {
    const v = legacyToCanonicalView({ membre_statut: 'visiteur', parcours_disciple_etape: 3 })
    expect(v.learning.parcoursDiscipleEtape).toBe(3)
    expect(v.growth.level).toBe('visitor')
  })

  it('membre_statut absent → requires_review, jamais une valeur inventée', () => {
    const v = legacyToCanonicalView({})
    expect(v.growth.confidence).toBe('requires_review')
    expect(v.community.confidence).toBe('requires_review')
    expect(v.growth.level).toBeNull()
  })
})

describe('Journey readiness — READY_FOR_REVIEW ≠ PROMOTED', () => {
  it('parcours complété + cible supérieure bornée → READY_FOR_REVIEW (SEMI_AUTOMATIC)', () => {
    const r = evaluateJourneyReadiness({
      member_id: 'm1',
      current_statut: 'membre_actif',
      completed_parcours_slug: 'je-stabilise-ma-foi',
      parcours: [{ slug: 'je-stabilise-ma-foi', complete: true, done: 6, total: 6 }],
    })
    expect(r.candidate_level).toBe('disciple')
    expect(r.transition_class).toBe('SEMI_AUTOMATIC')
    expect(r.status).toBe('READY_FOR_REVIEW')
    expect(r.missing).toEqual([])
  })

  it('aucune sortie n’exprime « promu »', () => {
    const r = evaluateJourneyReadiness({
      member_id: 'm1', current_statut: 'visiteur',
      completed_parcours_slug: 'nouveau-croyant',
      parcours: [{ slug: 'nouveau-croyant', complete: true, done: 3, total: 3 }],
    })
    expect(['NOT_READY', 'READY_FOR_REVIEW']).toContain(r.status)
    expect((r as unknown as Record<string, unknown>).promoted).toBeUndefined()
    expect((r as unknown as Record<string, unknown>).new_statut).toBeUndefined()
  })

  it('parcours non complété → NOT_READY, critère manquant explicité', () => {
    const r = evaluateJourneyReadiness({
      member_id: 'm1', current_statut: 'membre_actif',
      completed_parcours_slug: 'je-stabilise-ma-foi',
      parcours: [{ slug: 'je-stabilise-ma-foi', complete: false, done: 2, total: 6 }],
    })
    expect(r.status).toBe('NOT_READY')
    expect(r.missing.length).toBeGreaterThan(0)
  })

  it('aucune cible supérieure (déjà au niveau) → NOT_READY, transition AUTOMATIC', () => {
    const r = evaluateJourneyReadiness({
      member_id: 'm1', current_statut: 'disciple',
      completed_parcours_slug: 'je-stabilise-ma-foi',
      parcours: [{ slug: 'je-stabilise-ma-foi', complete: true, done: 6, total: 6 }],
    })
    expect(r.candidate_level).toBeNull()
    expect(r.transition_class).toBe('AUTOMATIC')
    expect(r.status).toBe('NOT_READY')
  })
})

describe('Pastoral signals — factuels, sans verdict ni score spirituel', () => {
  it('critères pédagogiques accomplis → signal info (formation + prière)', () => {
    const s = pedagogicalCriteriaSignal({ member_id: 'm1', formationsTerminees: 1, prayers: 2, generated_at: T0 })
    expect(s).not.toBeNull()
    expect(s!.type).toBe('criteres_pedagogiques_accomplis')
    expect(s!.severity).toBe('info')
    expect(Object.keys(s!).every((k) => !isForbiddenSpiritualVerdict(k))).toBe(true)
  })

  it('critères non atteints → aucun signal', () => {
    expect(pedagogicalCriteriaSignal({ member_id: 'm1', formationsTerminees: 0, prayers: 5, generated_at: T0 })).toBeNull()
    expect(pedagogicalCriteriaSignal({ member_id: 'm1', formationsTerminees: 3, prayers: 0, generated_at: T0 })).toBeNull()
  })

  it('nouveau sans accompagnement → signal haute ; sinon null', () => {
    const fire = newcomerWithoutSupportSignal({ member_id: 'm1', accountAgeDays: 3, hasAnyActivity: false, isAssigned: false, generated_at: T0 })
    expect(fire?.type).toBe('nouveau_sans_accompagnement')
    expect(newcomerWithoutSupportSignal({ member_id: 'm1', accountAgeDays: 3, hasAnyActivity: false, isAssigned: true, generated_at: T0 })).toBeNull()
    expect(newcomerWithoutSupportSignal({ member_id: 'm1', accountAgeDays: 90, hasAnyActivity: false, isAssigned: false, generated_at: T0 })).toBeNull()
  })

  it('garde-fou lexical : détecte les clés de verdict spirituel interdit', () => {
    expect(isForbiddenSpiritualVerdict('spiritual_score')).toBe(true)
    expect(isForbiddenSpiritualVerdict('engagement')).toBe(false)
  })
})
