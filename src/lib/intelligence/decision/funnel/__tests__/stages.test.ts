/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 1 · Tests de la table statique des étapes.
 * Vérité prouvée : couverture/ordre canonique, honnêteté des sources, et
 * déclaration correcte instrumenté vs non instrumenté (activation / parcours_start
 * / conversion NON instrumentés — jamais fabriqués).
 */

import { describe, it, expect } from 'vitest'
import {
  DECISION_FUNNEL_STAGE_DEFS,
  getStageDef,
  isStageInstrumented,
  orderedStageDefs,
} from '../stages'
import { DECISION_FUNNEL_STAGE_ORDER } from '../../contract'

describe('stages/definition-table', () => {
  it('STAGES_ORDER couvre exactement DECISION_FUNNEL_STAGE_ORDER dans le bon ordre', () => {
    const defKeys = orderedStageDefs().map((d) => d.key)
    expect(defKeys).toEqual([...DECISION_FUNNEL_STAGE_ORDER])
    // Aucune clé en double, aucune clé orpheline.
    expect(new Set(DECISION_FUNNEL_STAGE_DEFS.map((d) => d.key)).size).toBe(
      DECISION_FUNNEL_STAGE_ORDER.length,
    )
  })

  it('chaque étape porte label, définition, source et cohorte non vides', () => {
    for (const def of DECISION_FUNNEL_STAGE_DEFS) {
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.definition.length).toBeGreaterThan(0)
      expect(def.source.length).toBeGreaterThan(0)
      expect(def.cohort.length).toBeGreaterThan(0)
      expect(def.metricKey.length).toBeGreaterThan(0)
    }
  })

  it('les étapes instrumentées pointent une source réelle + countKey', () => {
    const instrumented = DECISION_FUNNEL_STAGE_DEFS.filter(isStageInstrumented)
    // CITADELLE_VISIT, SIGNUP, ENGAGEMENT, PROGRESSION.
    expect(instrumented.map((d) => d.key).sort()).toEqual(
      ['CITADELLE_VISIT', 'ENGAGEMENT', 'PROGRESSION', 'SIGNUP'].sort(),
    )
    for (const def of instrumented) {
      expect(def.source).not.toBe('—')
      expect(typeof def.countKey).toBe('string')
    }
  })

  it('ACTIVATION est NON instrumentée avec une raison explicite (jamais un proxy fabriqué)', () => {
    const def = getStageDef('ACTIVATION')
    expect(def.kind).toBe('uninstrumented')
    expect(def.source).toBe('—')
    expect(def.cohort).toBe('unavailable')
    if (def.kind === 'uninstrumented') {
      expect(def.reason).toMatch(/activation/i)
      expect(def.reason.length).toBeGreaterThan(20)
    }
  })

  it('PARCOURS_START est NON instrumentée : complétions ≠ démarrages', () => {
    const def = getStageDef('PARCOURS_START')
    expect(def.kind).toBe('uninstrumented')
    expect(def.source).toBe('—')
    if (def.kind === 'uninstrumented') {
      expect(def.reason).toMatch(/complétions|démarrage/i)
    }
  })

  it('CONVERSION est NON instrumentée et de cohorte composite hétérogène', () => {
    const def = getStageDef('CONVERSION')
    expect(def.kind).toBe('uninstrumented')
    expect(def.cohort).toBe('composite')
    if (def.kind === 'uninstrumented') {
      expect(def.reason).toMatch(/hétérogène|non sommable|dons|prière/i)
    }
  })

  it('aucune source de PLATEFORME (YouTube/Meta) dans les étapes du funnel', () => {
    for (const def of DECISION_FUNNEL_STAGE_DEFS) {
      expect(def.source.toLowerCase()).not.toMatch(/youtube|meta|facebook|instagram/)
    }
  })

  it('getStageDef jette sur une clé inconnue', () => {
    // @ts-expect-error clé volontairement invalide
    expect(() => getStageDef('NOPE')).toThrow()
  })
})
