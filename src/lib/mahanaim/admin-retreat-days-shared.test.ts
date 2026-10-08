import { describe, expect, it } from 'vitest'
import { getMissingRetreatDayFields } from './admin-retreat-days-shared'

describe('getMissingRetreatDayFields', () => {
  it('lists content fields that have not been filled in', () => {
    expect(getMissingRetreatDayFields({ title: 'Jour 1', prayers: [], declarations: ['Je crois'] })).toEqual([
      'Référence biblique',
      'Texte biblique',
      'Méditation',
      'Objectif',
      'Prières',
      'Action pratique',
    ])
  })

  it('reports no missing fields when every content field is filled', () => {
    expect(getMissingRetreatDayFields({
      title: 'Jour 1', scripture_reference: 'Actes 1:8', scripture_text: 'Texte', meditation: 'Méditation',
      objective: 'Objectif', prayers: ['Prier'], declarations: ['Je crois'], action: 'Mettre en pratique',
    })).toEqual([])
  })
})
