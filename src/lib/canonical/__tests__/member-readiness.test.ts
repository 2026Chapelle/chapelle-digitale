import { describe, it, expect } from 'vitest'
import { computeMemberReadiness, effectiveCurrentStatut } from '@/lib/canonical/member-readiness'

/**
 * PARCOURS DU ROYAUME — chaîne COMPLÉTION → READY_FOR_REVIEW en lecture seule.
 * Vérifie que le membre passe « en attente de reconnaissance » à partir des faits
 * pédagogiques, sans jamais exposer de valeur cible ni exprimer « promu ».
 */
describe('computeMemberReadiness (lecture seule, borné ≤ disciple)', () => {
  it('aucun parcours complété → NOT_READY', () => {
    const r = computeMemberReadiness({
      current_statut: 'visiteur',
      parcours: [{ slug: 'nouveau-croyant', complete: false, done: 1, total: 4 }],
    })
    expect(r.pending).toBe(false)
    expect(r.status).toBe('NOT_READY')
  })

  it('un parcours complété avec cible strictement supérieure → READY_FOR_REVIEW', () => {
    const r = computeMemberReadiness({
      current_statut: 'visiteur',
      parcours: [{ slug: 'nouveau-croyant', complete: true, done: 4, total: 4 }],
    })
    expect(r.pending).toBe(true)
    expect(r.status).toBe('READY_FOR_REVIEW')
  })

  it('statut courant déjà au plafond de la cible → pas de readiness (monotone)', () => {
    const r = computeMemberReadiness({
      current_statut: 'disciple',
      parcours: [{ slug: 'je-stabilise-ma-foi', complete: true, done: 5, total: 5 }],
    })
    expect(r.pending).toBe(false)
  })

  it('parcours hors barème (aucune cible) même complété → pas de readiness', () => {
    const r = computeMemberReadiness({
      current_statut: 'visiteur',
      parcours: [{ slug: 'un-parcours-non-integration', complete: true, done: 3, total: 3 }],
    })
    expect(r.pending).toBe(false)
  })

  it('statut initial nul + parcours d’intégration complété → READY_FOR_REVIEW', () => {
    const r = computeMemberReadiness({
      current_statut: null,
      parcours: [{ slug: 'je-decouvre-la-maison', complete: true, done: 6, total: 6 }],
    })
    expect(r.pending).toBe(true)
  })

  it('la reconnaissance canonique confirmée fait RETOMBER pending (anti-bannière collante)', () => {
    // membre_statut legacy resté « visiteur », mais un berger a reconnu la croissance
    // canonique « disciple » → plus aucune readiness en attente.
    const r = computeMemberReadiness({
      current_statut: 'visiteur',
      current_growth_canonical: 'disciple',
      parcours: [{ slug: 'je-stabilise-ma-foi', complete: true, done: 5, total: 5 }],
    })
    expect(r.pending).toBe(false)
  })

  it('reconnaissance canonique intermédiaire : encore en attente si une cible reste au-dessus', () => {
    const r = computeMemberReadiness({
      current_statut: 'visiteur',
      current_growth_canonical: 'new_believer', // rang legacy nouveau_membre (1)
      parcours: [{ slug: 'je-stabilise-ma-foi', complete: true, done: 5, total: 5 }], // cible disciple (3)
    })
    expect(r.pending).toBe(true)
  })

  it('effectiveCurrentStatut prend le rang le plus élevé (legacy ∨ canonique)', () => {
    expect(effectiveCurrentStatut('visiteur', 'disciple')).toBe('disciple')
    expect(effectiveCurrentStatut('disciple', 'new_believer')).toBe('disciple') // legacy plus haut conservé
    expect(effectiveCurrentStatut('visiteur', null)).toBe('visiteur')
    expect(effectiveCurrentStatut(null, null)).toBeNull()
  })

  it('la vue caviardée n’expose QUE pending/status — aucune valeur cible', () => {
    const r = computeMemberReadiness({
      current_statut: 'visiteur',
      parcours: [{ slug: 'nouveau-croyant', complete: true, done: 4, total: 4 }],
    })
    expect(Object.keys(r).sort()).toEqual(['pending', 'status'])
    // jamais un champ exprimant « promu » / une cible.
    expect(JSON.stringify(r)).not.toMatch(/promoted|promu|disciple|membre_actif|nouveau_membre/i)
  })
})
