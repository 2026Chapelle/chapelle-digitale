/**
 * CITADELLE INTELLIGENCE — 5B · Tests de GEL du contrat (invariants partagés).
 * Ces tests protègent le vocabulaire que tous les agents 5B partagent.
 */

import { describe, it, expect } from 'vitest'
import {
  DECISION_AVAILABILITIES,
  DECISION_FUNNEL_STAGE_ORDER,
  DECISION_SIGNAL_CATEGORIES,
  DECISION_AVAILABILITY_LABEL_FR,
  DECISION_AVAILABILITY_COLOR,
  DECISION_SCOPE_LABEL_FR,
  DECISION_NO_VALUE,
  decisionRendersNumber,
  type DecisionAvailability,
  type DecisionScope,
} from '../contract'
import {
  confidenceFromSample,
  isConfidentEnough,
  canBeActionPriority,
  RATE_SAMPLE_THRESHOLDS,
  MIN_COMPARABLE_CHANNELS_FOR_RANKING,
} from '../thresholds'

describe('5B contract — disponibilité', () => {
  it('gèle exactement les 5 disponibilités canoniques', () => {
    expect([...DECISION_AVAILABILITIES]).toEqual([
      'REAL',
      'NO_DATA',
      'PARTIAL',
      'UNAVAILABLE',
      'NOT_APPLICABLE',
    ])
  })

  it('seul REAL rend un nombre (0 réel inclus) ; tout le reste → placeholder', () => {
    const others: DecisionAvailability[] = ['NO_DATA', 'PARTIAL', 'UNAVAILABLE', 'NOT_APPLICABLE']
    expect(decisionRendersNumber('REAL')).toBe(true)
    for (const a of others) expect(decisionRendersNumber(a)).toBe(false)
    expect(DECISION_NO_VALUE).toBe('—')
  })

  it('libellés & couleurs couvrent chaque disponibilité', () => {
    for (const a of DECISION_AVAILABILITIES) {
      expect(DECISION_AVAILABILITY_LABEL_FR[a]).toBeTruthy()
      expect(DECISION_AVAILABILITY_COLOR[a]).toMatch(/^#/)
    }
  })

  it('libellés de portée couvrent le vocabulaire SCOPE 5A', () => {
    const scopes: DecisionScope[] = ['citadelle', 'institutional', 'global', 'external_or_unknown']
    for (const s of scopes) expect(DECISION_SCOPE_LABEL_FR[s]).toBeTruthy()
  })
})

describe('5B contract — funnel canonique', () => {
  it('gèle les 7 étapes verticales dans l\'ordre', () => {
    expect([...DECISION_FUNNEL_STAGE_ORDER]).toEqual([
      'CITADELLE_VISIT',
      'SIGNUP',
      'ACTIVATION',
      'ENGAGEMENT',
      'PARCOURS_START',
      'PROGRESSION',
      'CONVERSION',
    ])
  })
})

describe('5B contract — signaux', () => {
  it('gèle les 9 catégories de signaux', () => {
    expect(DECISION_SIGNAL_CATEGORIES).toContain('DROP_OFF')
    expect(DECISION_SIGNAL_CATEGORIES).toContain('DATA_QUALITY')
    expect(DECISION_SIGNAL_CATEGORIES).toHaveLength(9)
  })
})

describe('5B thresholds — gardes d\'échantillon', () => {
  it('confidenceFromSample est monotone et documentée', () => {
    expect(confidenceFromSample(null)).toBe('INSUFFICIENT_DATA')
    expect(confidenceFromSample(0)).toBe('INSUFFICIENT_DATA')
    expect(confidenceFromSample(RATE_SAMPLE_THRESHOLDS.insufficientBelow - 1)).toBe('INSUFFICIENT_DATA')
    expect(confidenceFromSample(RATE_SAMPLE_THRESHOLDS.insufficientBelow)).toBe('LOW')
    expect(confidenceFromSample(RATE_SAMPLE_THRESHOLDS.lowBelow)).toBe('MEDIUM')
    expect(confidenceFromSample(RATE_SAMPLE_THRESHOLDS.mediumBelow)).toBe('HIGH')
  })

  it('LOW/INSUFFICIENT ne sont jamais « assez confiants » ni action prioritaire', () => {
    expect(isConfidentEnough('LOW')).toBe(false)
    expect(isConfidentEnough('INSUFFICIENT_DATA')).toBe(false)
    expect(isConfidentEnough('MEDIUM')).toBe(true)
    expect(isConfidentEnough('HIGH')).toBe(true)
    expect(canBeActionPriority('MEDIUM')).toBe(false)
    expect(canBeActionPriority('HIGH')).toBe(true)
  })

  it('classement exige au moins 2 canaux comparables', () => {
    expect(MIN_COMPARABLE_CHANNELS_FOR_RANKING).toBeGreaterThanOrEqual(2)
  })
})
