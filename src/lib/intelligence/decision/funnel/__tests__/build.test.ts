/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 1 · Tests du builder PUR du funnel.
 * Prouve les gardes de vérité (FROZEN_CONTRACT) :
 *  FUNNEL_REALITY, FUNNEL_MISSING_STAGE (manquant ≠ 0), FUNNEL_RATE_DENOMINATOR
 *  (dénom indisponible/0 → aucun faux %), REAL_ZERO_PRESERVED, scope citadelle only.
 */

import { describe, it, expect } from 'vitest'
import { buildDecisionFunnel, type FunnelBuildInput } from '../build'
import type { ConversionCounts } from '../../../conversions/categories'
import type { DecisionPeriod, DecisionFunnelStageKey } from '../../contract'
import { DECISION_FUNNEL_STAGE_ORDER } from '../../contract'

const PERIOD: DecisionPeriod = {
  label: "Aujourd'hui (UTC)",
  sinceIso: '2026-08-23T00:00:00.000Z',
  untilIso: '2026-08-23T12:00:00.000Z',
}
const NOW = '2026-08-23T12:00:00.000Z'

function counts(overrides: Partial<ConversionCounts> = {}): ConversionCounts {
  return {
    pageViews: 500,
    signups: 40,
    podcastPlays: 120,
    moduleCompletions: 15,
    eventRegistrations: 8,
    prayerRequests: 5,
    donationsConfirmed: 3,
    ...overrides,
  }
}

function realInput(overrides: Partial<ConversionCounts> = {}): FunnelBuildInput {
  return { counts: counts(overrides), period: PERIOD, nowIso: NOW }
}

function stageByKey(payload: ReturnType<typeof buildDecisionFunnel>, key: DecisionFunnelStageKey) {
  const s = payload.stages.find((st) => st.key === key)
  if (!s) throw new Error(`étape absente: ${key}`)
  return s
}

describe('buildDecisionFunnel/FUNNEL_REALITY', () => {
  it('produit les 7 étapes dans l\'ordre canonique gelé', () => {
    const p = buildDecisionFunnel(realInput())
    expect(p.stages.map((s) => s.key)).toEqual([...DECISION_FUNNEL_STAGE_ORDER])
    expect(p.stages).toHaveLength(7)
  })

  it('les étapes instrumentées portent leur vraie valeur (REAL)', () => {
    const p = buildDecisionFunnel(realInput())
    expect(stageByKey(p, 'CITADELLE_VISIT')).toMatchObject({ status: 'REAL', value: 500 })
    expect(stageByKey(p, 'SIGNUP')).toMatchObject({ status: 'REAL', value: 40 })
    expect(stageByKey(p, 'ENGAGEMENT')).toMatchObject({ status: 'REAL', value: 120 })
    expect(stageByKey(p, 'PROGRESSION')).toMatchObject({ status: 'REAL', value: 15 })
  })

  it('generatedAt = horloge injectée (déterminisme, aucune I/O)', () => {
    const p = buildDecisionFunnel(realInput())
    expect(p.generatedAt).toBe(NOW)
    expect(p.demoMode).toBe(false)
  })
})

describe('buildDecisionFunnel/FUNNEL_MISSING_STAGE', () => {
  it('une étape NON instrumentée est UNAVAILABLE avec value=null (JAMAIS 0)', () => {
    const p = buildDecisionFunnel(realInput())
    for (const key of ['ACTIVATION', 'PARCOURS_START', 'CONVERSION'] as const) {
      const s = stageByKey(p, key)
      expect(s.status).toBe('UNAVAILABLE')
      expect(s.value).toBeNull()
      expect(s.value).not.toBe(0)
      expect(s.reason && s.reason.length).toBeGreaterThan(0)
    }
  })

  it('PARCOURS_START reste indisponible même quand les complétions existent (starts ≠ completions)', () => {
    const p = buildDecisionFunnel(realInput({ moduleCompletions: 999 }))
    const s = stageByKey(p, 'PARCOURS_START')
    expect(s.status).toBe('UNAVAILABLE')
    expect(s.value).toBeNull()
  })
})

describe('buildDecisionFunnel/FUNNEL_RATE_DENOMINATOR', () => {
  it('cohortes voisines distinctes ⇒ TOUS les taux UNAVAILABLE (aucun faux %)', () => {
    const p = buildDecisionFunnel(realInput())
    expect(p.rates).toHaveLength(6) // 7 étapes → 6 taux consécutifs
    for (const r of p.rates) {
      expect(r.availability).toBe('UNAVAILABLE')
      expect(r.rate).toBeNull()
      expect(r.reason && r.reason.length).toBeGreaterThan(0)
    }
  })

  it('le taux vers une étape indisponible est UNAVAILABLE (dénom/num non réel), jamais 0 %', () => {
    const p = buildDecisionFunnel(realInput())
    // SIGNUP(REAL) → ACTIVATION(UNAVAILABLE)
    const r = p.rates.find((x) => x.fromKey === 'SIGNUP' && x.toKey === 'ACTIVATION')!
    expect(r.availability).toBe('UNAVAILABLE')
    expect(r.rate).toBeNull()
  })

  it('aucun taux n\'est un NaN/Infinity/0 fabriqué', () => {
    const p = buildDecisionFunnel(realInput({ pageViews: 0, signups: 0 }))
    for (const r of p.rates) {
      expect(r.rate === null || Number.isFinite(r.rate)).toBe(true)
    }
  })

  it('primaryDropOffKey est null quand aucun taux n\'est réellement calculable', () => {
    const p = buildDecisionFunnel(realInput())
    expect(p.primaryDropOffKey).toBeNull()
  })
})

describe('buildDecisionFunnel/REAL_ZERO_PRESERVED', () => {
  it('un compte réel de 0 reste REAL (pas UNAVAILABLE)', () => {
    const p = buildDecisionFunnel(realInput({ signups: 0, pageViews: 0, podcastPlays: 0, moduleCompletions: 0 }))
    for (const key of ['CITADELLE_VISIT', 'SIGNUP', 'ENGAGEMENT', 'PROGRESSION'] as const) {
      const s = stageByKey(p, key)
      expect(s.status).toBe('REAL')
      expect(s.value).toBe(0)
    }
  })
})

describe('buildDecisionFunnel/SCOPE_CITADELLE_ONLY', () => {
  it('scope est toujours citadelle (réel ou démo)', () => {
    expect(buildDecisionFunnel(realInput()).scope).toBe('citadelle')
    expect(buildDecisionFunnel({ counts: null, period: PERIOD, nowIso: NOW }).scope).toBe('citadelle')
    expect(buildDecisionFunnel({ counts: counts(), period: PERIOD, nowIso: NOW, demo: true }).scope).toBe('citadelle')
  })

  it('aucune source de plateforme n\'apparaît dans les étapes', () => {
    const p = buildDecisionFunnel(realInput())
    for (const s of p.stages) {
      expect(s.source.toLowerCase()).not.toMatch(/youtube|meta|facebook|instagram/)
    }
  })
})

describe('buildDecisionFunnel/DEMO_MODE', () => {
  it('mode démo (counts=null) : aucune valeur réelle présentée, demoMode=true', () => {
    const p = buildDecisionFunnel({ counts: null, period: PERIOD, nowIso: NOW })
    expect(p.demoMode).toBe(true)
    for (const s of p.stages) {
      expect(s.value).toBeNull()
      expect(s.status).not.toBe('REAL')
    }
    for (const r of p.rates) {
      expect(r.rate).toBeNull()
    }
  })

  it('demo:true avec counts présents ne présente AUCUN nombre comme réel', () => {
    const p = buildDecisionFunnel({ counts: counts(), period: PERIOD, nowIso: NOW, demo: true })
    expect(p.demoMode).toBe(true)
    for (const s of p.stages) {
      expect(s.value).toBeNull()
      expect(s.status).toBe('UNAVAILABLE')
    }
  })
})
