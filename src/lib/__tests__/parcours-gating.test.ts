import { describe, it, expect } from 'vitest'
import { computeParcoursLock, isFormationComplete, type ParcoursSequenceItem } from '@/lib/formations/parcours-gating'

const SEQ: ParcoursSequenceItem[] = [
  { formationId: 'nouveau-croyant', ordre: 1 },
  { formationId: 'je-decouvre-la-maison', ordre: 2 },
  { formationId: 'je-stabilise-ma-foi', ordre: 3 },
  { formationId: 'je-deviens-disciple-actif', ordre: 4 },
]

describe('isFormationComplete', () => {
  it('exige au moins un module publié', () => {
    expect(isFormationComplete(0, 0)).toBe(false)
  })
  it('vrai quand tous les modules publiés sont complétés', () => {
    expect(isFormationComplete(6, 6)).toBe(true)
    expect(isFormationComplete(6, 7)).toBe(true) // tolère un surplus
  })
  it('faux quand il reste des modules', () => {
    expect(isFormationComplete(6, 5)).toBe(false)
  })
})

describe('computeParcoursLock', () => {
  it('déverrouille une formation hors séquence', () => {
    const r = computeParcoursLock('formation-libre', SEQ, [])
    expect(r.unlocked).toBe(true)
    expect(r.previousFormationId).toBeNull()
  })

  it('déverrouille la première de la séquence', () => {
    const r = computeParcoursLock('nouveau-croyant', SEQ, [])
    expect(r.unlocked).toBe(true)
    expect(r.reason).toBeNull()
  })

  it('verrouille tant que la formation précédente n’est pas terminée', () => {
    const r = computeParcoursLock('je-stabilise-ma-foi', SEQ, ['nouveau-croyant'])
    expect(r.unlocked).toBe(false)
    expect(r.reason).toBe('prev_parcours_incomplet')
    expect(r.previousFormationId).toBe('je-decouvre-la-maison')
  })

  it('déverrouille quand la formation précédente est terminée', () => {
    const r = computeParcoursLock('je-stabilise-ma-foi', SEQ, ['je-decouvre-la-maison'])
    expect(r.unlocked).toBe(true)
    expect(r.reason).toBeNull()
    expect(r.previousFormationId).toBe('je-decouvre-la-maison')
  })

  it('ne dépend que de la formation IMMÉDIATEMENT précédente', () => {
    // P2 (ordre 3) terminé mais P1 (ordre 2) pas pertinent ici : on regarde l'ordre 3 < 4
    const r = computeParcoursLock('je-deviens-disciple-actif', SEQ, ['je-stabilise-ma-foi'])
    expect(r.unlocked).toBe(true)
    expect(r.previousFormationId).toBe('je-stabilise-ma-foi')
  })

  it('fonctionne avec une séquence non triée', () => {
    const shuffled = [...SEQ].reverse()
    const r = computeParcoursLock('je-decouvre-la-maison', shuffled, [])
    expect(r.unlocked).toBe(false)
    expect(r.previousFormationId).toBe('nouveau-croyant')
  })
})
