/**
 * CITADELLE INTELLIGENCE — 5B · Tests d'INTÉGRATION du moteur de signaux.
 *
 * Gardes prouvées :
 *  - ≤ 5 signaux publiés ;
 *  - ACTION_PRIORITY_GUARD : ≤ 1 action prioritaire, HIGH uniquement, sinon
 *    hasActionPriority=false ;
 *  - DECISION_SAMPLE_GUARD : LOW/INSUFFICIENT jamais action prioritaire ;
 *  - tout signal publié porte evidence + source + period + scope ;
 *  - drop-off non mesurable ⇒ pas de DROP_OFF, un DATA_QUALITY à la place ;
 *  - propagation honnête du mode démo.
 */

import { describe, it, expect } from 'vitest'
import type {
  DecisionChannelsPayload,
  DecisionFunnelPayload,
  DecisionPeriod,
  DataQualityContext,
} from '../../contract'
import type { YouTubeTrends } from '../../../connectors/youtube/types'
import { evaluateSignals } from '../engine'
import { MAX_SIGNALS } from '../priority'
import type { SignalsBuildInput } from '../rules'

const PERIOD: DecisionPeriod = {
  label: "Aujourd'hui (UTC)",
  sinceIso: '2026-08-23T00:00:00Z',
  untilIso: '2026-08-23T12:00:00Z',
}

function funnelHealthy(): DecisionFunnelPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    stages: [
      { key: 'CITADELLE_VISIT', label: 'Visites Citadelle', status: 'REAL', value: 1000, definition: 'v', source: 'analytics_events', cohort: 'pageviews', freshness: 'NEAR_REALTIME' },
      { key: 'SIGNUP', label: 'Inscriptions', status: 'REAL', value: 200, definition: 's', source: 'profiles', cohort: 'new_persons', freshness: 'SYNCED' },
      { key: 'ACTIVATION', label: 'Activation', status: 'REAL', value: 40, definition: 'a', source: 'audio_listening_events', cohort: 'new_persons', freshness: 'SYNCED' },
    ],
    rates: [
      { fromKey: 'CITADELLE_VISIT', toKey: 'SIGNUP', rate: 0.2, availability: 'REAL' },
      { fromKey: 'SIGNUP', toKey: 'ACTIVATION', rate: 0.2, availability: 'REAL' },
    ],
    primaryDropOffKey: 'ACTIVATION',
  }
}

function funnelUnmeasurable(): DecisionFunnelPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    stages: [
      { key: 'CITADELLE_VISIT', label: 'Visites Citadelle', status: 'REAL', value: 800, definition: 'v', source: 'analytics_events', cohort: 'pageviews', freshness: 'NEAR_REALTIME' },
      { key: 'ACTIVATION', label: 'Activation', status: 'UNAVAILABLE', value: null, definition: 'a', source: 'audio_listening_events', cohort: 'unavailable', freshness: 'SYNCED', reason: 'non instrumenté' },
    ],
    rates: [{ fromKey: 'CITADELLE_VISIT', toKey: 'ACTIVATION', rate: null, availability: 'UNAVAILABLE', reason: 'aval non instrumenté' }],
    primaryDropOffKey: null,
  }
}

function channels(): DecisionChannelsPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    citadelle: [],
    unattributed: { signups: 0, progressions: 0 },
    internalVisitsExcluded: 0,
    platformContext: [],
    rankings: [],
  }
}

function dataQuality(toInstrument: DataQualityContext['toInstrument'] = []): DataQualityContext {
  return {
    generatedAt: PERIOD.untilIso,
    reliable: [],
    partial: [],
    toInstrument,
    coverage: { available: 3, partial: 1, gap: 2, total: 6 },
  }
}

function trends(current: number, previous: number, delta: number): YouTubeTrends {
  const stub = { current: 0, previous: null, trend: 'flat' as const }
  return {
    views: { current, previous, trend: delta > 0 ? 'up' : 'down', delta },
    watchTimeMinutes: stub,
    subscribersNet: stub,
    averageViewDurationSec: stub,
  }
}

function base(over: Partial<SignalsBuildInput> = {}): SignalsBuildInput {
  return {
    funnel: funnelHealthy(),
    channels: channels(),
    dataQuality: dataQuality(),
    period: PERIOD,
    scope: 'citadelle',
    nowIso: PERIOD.untilIso,
    ...over,
  }
}

describe('evaluateSignals — invariants de payload', () => {
  it('renvoie la période/portée/horloge et jamais plus de 5 signaux', () => {
    // Contexte riche pour déclencher plus de 5 règles.
    const ch = channels()
    ch.rankings = [
      {
        key: 'top_traffic_attributed',
        label: 'Trafic',
        metricLabel: 'Visites',
        period: PERIOD,
        available: true,
        rows: [
          { source: 'youtube', label: 'YouTube', value: 300 },
          { source: 'direct', label: 'Direct', value: 100 },
        ],
      },
    ]
    const payload = evaluateSignals(
      base({
        channels: ch,
        youtubeTrends: trends(500, 400, 0.25),
        seoInsufficient: true,
        dataQuality: dataQuality([{ label: 'Activation', detail: 'non instrumentée' }]),
        connectorStatuses: [{ channel: 'meta_facebook', label: 'Meta', state: 'BLOCKED' }],
        content: { mostViewedYouTube: { title: 'X', views: 900, source: 'youtube_analytics' } },
        nowIso: PERIOD.untilIso,
      }),
    )
    expect(payload.signals.length).toBeLessThanOrEqual(MAX_SIGNALS)
    expect(payload.period).toEqual(PERIOD)
    expect(payload.scope).toBe('citadelle')
    expect(payload.generatedAt).toBe(PERIOD.untilIso)
  })

  it('chaque signal publié porte evidence + source + period + scope', () => {
    const payload = evaluateSignals(base())
    expect(payload.signals.length).toBeGreaterThan(0)
    for (const s of payload.signals) {
      expect(s.evidence.length).toBeGreaterThanOrEqual(1)
      expect(s.source.length).toBeGreaterThan(0)
      expect(s.period).toEqual(PERIOD)
      expect(s.scope).toBeTruthy()
    }
  })

  it('propage honnêtement le mode démo', () => {
    expect(evaluateSignals(base({ demo: true })).demoMode).toBe(true)
    expect(evaluateSignals(base()).demoMode).toBe(false)
  })
})

describe('ACTION_PRIORITY_GUARD', () => {
  it('sélectionne au plus UNE action prioritaire, de confiance HIGH', () => {
    const payload = evaluateSignals(base())
    const priorities = payload.signals.filter((s) => s.isActionPriority)
    expect(priorities.length).toBeLessThanOrEqual(1)
    if (payload.actionPriority.hasActionPriority) {
      expect(priorities.length).toBe(1)
      expect(priorities[0].confidence).toBe('HIGH')
      expect(priorities[0].id).toBe(payload.actionPriority.signalId)
      // Doit être une catégorie réellement actionnable.
      expect(['DROP_OFF', 'CONVERSION', 'CHANNEL_OPPORTUNITY', 'SEO_OPPORTUNITY']).toContain(
        priorities[0].category,
      )
    }
  })

  it('avec funnel sain : l’action prioritaire est le DROP_OFF (urgence > conversion)', () => {
    const payload = evaluateSignals(base())
    expect(payload.actionPriority.hasActionPriority).toBe(true)
    const chosen = payload.signals.find((s) => s.isActionPriority)!
    expect(chosen.category).toBe('DROP_OFF')
  })

  it('aucune action prioritaire si aucun signal HIGH actionnable (état de succès valide)', () => {
    // Uniquement des signaux informatifs : SEO insuffisant + connecteur bloqué.
    const payload = evaluateSignals(
      base({
        funnel: funnelUnmeasurable(),
        seoInsufficient: true,
        connectorStatuses: [{ channel: 'meta_facebook', label: 'Meta', state: 'BLOCKED' }],
      }),
    )
    expect(payload.actionPriority.hasActionPriority).toBe(false)
    expect(payload.actionPriority.signalId).toBeNull()
    expect(payload.signals.every((s) => s.isActionPriority !== true)).toBe(true)
  })

  it('LOW/INSUFFICIENT ne devient jamais action prioritaire', () => {
    const payload = evaluateSignals(
      base({ dataQuality: dataQuality([{ label: 'Activation', detail: 'non instrumentée' }]) }),
    )
    for (const s of payload.signals) {
      if (s.confidence === 'LOW' || s.confidence === 'INSUFFICIENT_DATA') {
        expect(s.isActionPriority).not.toBe(true)
      }
    }
  })
})

describe('no fabricated drop-off', () => {
  it('funnel non mesurable : aucun DROP_OFF, un DATA_QUALITY présent', () => {
    const payload = evaluateSignals(base({ funnel: funnelUnmeasurable() }))
    expect(payload.signals.some((s) => s.category === 'DROP_OFF')).toBe(false)
    expect(payload.signals.some((s) => s.category === 'DATA_QUALITY')).toBe(true)
  })
})

describe('GROWTH sous seuil', () => {
  it('n’émet pas de GROWTH/DECLINE sans franchir les seuils', () => {
    const payload = evaluateSignals(base({ youtubeTrends: trends(5, 2, 1.5) }))
    expect(payload.signals.some((s) => s.category === 'GROWTH' || s.category === 'DECLINE')).toBe(false)
  })
})
