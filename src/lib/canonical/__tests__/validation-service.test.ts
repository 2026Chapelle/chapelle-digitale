import { describe, it, expect } from 'vitest'
import {
  isValidatableAxis, isValidAxisValue, axisOptions, labelForAxisValue,
  checkValidationIntent, VALIDATABLE_AXES, JUSTIFICATION_MAX,
} from '@/lib/canonical/validation-service'

describe('validation-service — vocabulaire fermé par axe', () => {
  it('les 2 axes validables sont growth_level et community_status', () => {
    expect(VALIDATABLE_AXES).toEqual(['growth_level', 'community_status'])
    expect(isValidatableAxis('growth_level')).toBe(true)
    expect(isValidatableAxis('community_status')).toBe(true)
    expect(isValidatableAxis('ministry_role')).toBe(false)
    expect(isValidatableAxis('learning')).toBe(false)
  })

  it('growth_level : accepte le vocab canonique, refuse le reste', () => {
    for (const v of ['visitor', 'new_believer', 'disciple', 'servant', 'leader', 'worker', 'responsible', 'shepherd']) {
      expect(isValidAxisValue('growth_level', v)).toBe(true)
    }
    expect(isValidAxisValue('growth_level', 'pastor')).toBe(false) // pastor = ministère, pas croissance
    expect(isValidAxisValue('growth_level', 'member')).toBe(false) // valeur d'un autre axe
    expect(isValidAxisValue('growth_level', '')).toBe(false)
  })

  it('community_status : accepte le vocab canonique, refuse le reste', () => {
    for (const v of ['visitor', 'contact', 'integrating', 'member']) {
      expect(isValidAxisValue('community_status', v)).toBe(true)
    }
    expect(isValidAxisValue('community_status', 'disciple')).toBe(false)
  })

  it('axisOptions expose clé + libellé FR dans l’ordre canonique', () => {
    const g = axisOptions('growth_level')
    expect(g[0]).toEqual({ value: 'visitor', label: 'Visiteur' })
    expect(g.find((o) => o.value === 'new_believer')?.label).toBe('Nouveau croyant')
    const c = axisOptions('community_status')
    expect(c.map((o) => o.value)).toEqual(['visitor', 'contact', 'integrating', 'member'])
  })

  it('labelForAxisValue : libellé FR ou tiret', () => {
    expect(labelForAxisValue('growth_level', 'shepherd')).toBe('Berger')
    expect(labelForAxisValue('community_status', 'integrating')).toBe('En intégration')
    expect(labelForAxisValue('growth_level', null)).toBe('—')
    expect(labelForAxisValue('growth_level', undefined)).toBe('—')
  })
})

describe('validation-service — checkValidationIntent (garde applicative alignée sur les CHECK DB)', () => {
  const base = { profileId: 'p1', axis: 'growth_level', newValue: 'disciple', justification: 'Baptisé + parcours 1 complété, marche stable.' }

  it('accepte une intention complète et normalise (trim)', () => {
    const res = checkValidationIntent({ ...base, profileId: '  p1  ', justification: '  ok  ' })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.intent.profileId).toBe('p1')
      expect(res.intent.justification).toBe('ok')
      expect(res.intent.axis).toBe('growth_level')
      expect(res.intent.newValue).toBe('disciple')
    }
  })

  it('refuse un membre manquant', () => {
    const res = checkValidationIntent({ ...base, profileId: '   ' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe('INVALID_INPUT')
  })

  it('refuse un axe non supporté', () => {
    expect(checkValidationIntent({ ...base, axis: 'ministry_role' }).ok).toBe(false)
    expect(checkValidationIntent({ ...base, axis: 'learning' }).ok).toBe(false)
  })

  it('refuse une valeur hors vocabulaire de l’axe', () => {
    expect(checkValidationIntent({ ...base, newValue: 'pastor' }).ok).toBe(false)
    expect(checkValidationIntent({ ...base, axis: 'community_status', newValue: 'disciple' }).ok).toBe(false)
  })

  it('refuse une justification vide ou uniquement des espaces (jamais de validation anonyme muette)', () => {
    expect(checkValidationIntent({ ...base, justification: '' }).ok).toBe(false)
    expect(checkValidationIntent({ ...base, justification: '    ' }).ok).toBe(false)
  })

  it('refuse une justification trop longue', () => {
    const res = checkValidationIntent({ ...base, justification: 'x'.repeat(JUSTIFICATION_MAX + 1) })
    expect(res.ok).toBe(false)
  })

  it('accepte pile la longueur maximale', () => {
    expect(checkValidationIntent({ ...base, justification: 'x'.repeat(JUSTIFICATION_MAX) }).ok).toBe(true)
  })
})
