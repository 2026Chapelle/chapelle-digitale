import { describe, it, expect } from 'vitest'
import {
  GROWTH_LADDER_FR,
  COMMUNITY_LADDER_FR,
  GROWTH_LABELS_FR,
  COMMUNITY_LABELS_FR,
  RECOGNITION_PENDING_LABEL,
  nextGrowthLabel,
  nextCommunityLabel,
} from '@/lib/canonical/validation-service'
import { GROWTH_LEVEL_ORDER, COMMUNITY_STATUS_ORDER } from '@/lib/canonical/types'
import * as constants from '@/lib/constants'

/**
 * COHÉRENCE SÉMANTIQUE « PARCOURS DU ROYAUME » — anti-régression.
 *
 * Empêche le retour des taxonomies MIXTES fondant les 4 axes en une seule échelle.
 * Verrouille : source canonique pour croissance/appartenance, séparation stricte du
 * ministère (pastor/cell_leader), et suppression de l'ancienne échelle PARCOURS_DISCIPLE.
 */

// Termes qui NE SONT PAS des niveaux de croissance (appartenance ou ministère/legacy).
// NB : « Berger » est volontairement absent — c'est un niveau de croissance canonique
// (shepherd) AUTANT qu'un ministère (axes distincts, même libellé FR).
const FORBIDDEN_IN_GROWTH = [
  'Pasteur', 'Leader de cellule', 'Leader de Cellule',
  'Membre', 'Contact', 'Nouvel Arrivant', 'Nouveau membre', 'Intégration', 'En intégration',
]

describe('Axes séparés — sources canoniques', () => {
  it('MEMBER_GROWTH_SOURCE=CANONICAL : la frise croissance = ordre canonique', () => {
    expect(GROWTH_LADDER_FR.map((g) => g.key)).toEqual(GROWTH_LEVEL_ORDER)
    expect(GROWTH_LADDER_FR.map((g) => g.label)).toEqual(
      GROWTH_LEVEL_ORDER.map((k) => GROWTH_LABELS_FR[k]),
    )
  })

  it('MEMBER_COMMUNITY_SOURCE=CANONICAL : la frise appartenance = ordre canonique', () => {
    expect(COMMUNITY_LADDER_FR.map((c) => c.key)).toEqual(COMMUNITY_STATUS_ORDER)
    expect(COMMUNITY_LADDER_FR.map((c) => c.label)).toEqual(
      COMMUNITY_STATUS_ORDER.map((k) => COMMUNITY_LABELS_FR[k]),
    )
  })
})

describe('Le ministère n’est jamais un niveau de croissance', () => {
  it('PASTOR_AS_GROWTH_STAGE=NO & CELL_LEADER_AS_GROWTH_STAGE=NO', () => {
    expect(GROWTH_LEVEL_ORDER).not.toContain('pastor')
    expect(GROWTH_LEVEL_ORDER).not.toContain('cell_leader')
  })

  it('MEMBER_AS_GROWTH_STAGE=NO & CONTACT_AS_GROWTH_STAGE=NO : aucun terme interdit dans la frise croissance', () => {
    const labels = GROWTH_LADDER_FR.map((g) => g.label)
    for (const forbidden of FORBIDDEN_IN_GROWTH) {
      expect(labels).not.toContain(forbidden)
    }
  })

  it('Les deux frises ne partagent aucun libellé (axes disjoints hormis « Visiteur »)', () => {
    const growth = new Set(GROWTH_LADDER_FR.map((g) => g.label))
    const shared = COMMUNITY_LADDER_FR.map((c) => c.label).filter((l) => growth.has(l))
    expect(shared).toEqual(['Visiteur']) // seul point de départ commun légitime
  })
})

describe('Échelle mixte supprimée', () => {
  it('MIXED_CANONICAL_LADDER=NONE : PARCOURS_DISCIPLE n’est plus exporté', () => {
    expect((constants as Record<string, unknown>).PARCOURS_DISCIPLE).toBeUndefined()
  })

  it('Aucune constante exportée ne fond « Pasteur » et « Membre » dans une même liste', () => {
    for (const value of Object.values(constants as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue
      const blob = JSON.stringify(value)
      const mixed = blob.includes('Pasteur') && blob.includes('Membre')
      expect(mixed).toBe(false)
    }
  })
})

describe('Reconnaissance en attente — jamais une valeur legacy', () => {
  it('le libellé « en attente » est neutre', () => {
    expect(RECOGNITION_PENDING_LABEL).toBe('En cours de reconnaissance')
    expect(FORBIDDEN_IN_GROWTH).not.toContain(RECOGNITION_PENDING_LABEL)
  })

  it('les prochaines étapes restent bornées (jamais au-delà du sommet de l’axe)', () => {
    expect(nextGrowthLabel('shepherd')).toBeNull()
    expect(nextGrowthLabel(null)).toBe('Nouveau croyant')
    expect(nextGrowthLabel('visitor')).toBe('Nouveau croyant')
    expect(nextCommunityLabel('member')).toBeNull()
    expect(nextCommunityLabel('visitor')).toBe('Contact')
  })
})
