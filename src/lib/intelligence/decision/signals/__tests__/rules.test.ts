/**
 * CITADELLE INTELLIGENCE — 5B · Tests des RÈGLES déterministes de signaux.
 *
 * Vérité prouvée :
 *  - DECISION_SIGNAL_EVIDENCE : tout signal porte evidence+source+period+scope ;
 *  - DECISION_SAMPLE_GUARD : petit échantillon ⇒ confiance dégradée, pas d'action ;
 *  - pas de GROWTH/DECLINE sans tendance native + seuils ;
 *  - drop-off non mesurable ⇒ DATA_QUALITY, jamais un drop-off fabriqué ;
 *  - CONTENT/CONNECTOR/SEO honnêtes, jamais présentés comme recommandations.
 */

import { describe, it, expect } from 'vitest'
import type {
  DecisionChannelsPayload,
  DecisionFunnelPayload,
  DecisionPeriod,
  DataQualityContext,
} from '../../contract'
import type { YouTubeTrends } from '../../../connectors/youtube/types'
import {
  ruleDropOff,
  ruleConversion,
  ruleChannelOpportunity,
  ruleYouTubeTrend,
  ruleSeoInsufficient,
  ruleDataQualityGaps,
  ruleConnectorStatus,
  ruleContentSignal,
  SIGNAL_IDS,
  type SignalsBuildInput,
} from '../rules'

/* ── Fixtures partagées ───────────────────────────────────────────────── */

const PERIOD: DecisionPeriod = {
  label: "Aujourd'hui (UTC)",
  sinceIso: '2026-08-23T00:00:00Z',
  untilIso: '2026-08-23T12:00:00Z',
}

/** Funnel REAL avec fuite claire visite(1000)→signup(200)→activation(40). */
function funnelHealthy(): DecisionFunnelPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    stages: [
      {
        key: 'CITADELLE_VISIT',
        label: 'Visites Citadelle',
        status: 'REAL',
        value: 1000,
        definition: 'Pages vues Citadelle',
        source: 'analytics_events',
        cohort: 'pageviews',
        freshness: 'NEAR_REALTIME',
      },
      {
        key: 'SIGNUP',
        label: 'Inscriptions',
        status: 'REAL',
        value: 200,
        definition: 'Profils créés',
        source: 'profiles',
        cohort: 'new_persons',
        freshness: 'SYNCED',
      },
      {
        key: 'ACTIVATION',
        label: 'Activation',
        status: 'REAL',
        value: 40,
        definition: 'Première action',
        source: 'audio_listening_events',
        cohort: 'new_persons',
        freshness: 'SYNCED',
      },
    ],
    rates: [
      { fromKey: 'CITADELLE_VISIT', toKey: 'SIGNUP', rate: 0.2, availability: 'REAL' },
      { fromKey: 'SIGNUP', toKey: 'ACTIVATION', rate: 0.2, availability: 'REAL' },
    ],
    primaryDropOffKey: 'ACTIVATION',
  }
}

/** Funnel avec ACTIVATION non instrumentée + aucun point de fuite affirmable. */
function funnelUnmeasurable(): DecisionFunnelPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    stages: [
      {
        key: 'CITADELLE_VISIT',
        label: 'Visites Citadelle',
        status: 'REAL',
        value: 800,
        definition: 'Pages vues',
        source: 'analytics_events',
        cohort: 'pageviews',
        freshness: 'NEAR_REALTIME',
      },
      {
        key: 'ACTIVATION',
        label: 'Activation',
        status: 'UNAVAILABLE',
        value: null,
        definition: 'Première action',
        source: 'audio_listening_events',
        cohort: 'unavailable',
        freshness: 'SYNCED',
        reason: 'Événement d’activation non instrumenté',
      },
    ],
    rates: [
      {
        fromKey: 'CITADELLE_VISIT',
        toKey: 'ACTIVATION',
        rate: null,
        availability: 'UNAVAILABLE',
        reason: 'Étape aval non instrumentée',
      },
    ],
    primaryDropOffKey: null,
  }
}

function emptyChannels(): DecisionChannelsPayload {
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

function emptyDataQuality(): DataQualityContext {
  return {
    generatedAt: PERIOD.untilIso,
    reliable: [],
    partial: [],
    toInstrument: [],
    coverage: { available: 3, partial: 1, gap: 2, total: 6 },
  }
}

function baseInput(over: Partial<SignalsBuildInput> = {}): SignalsBuildInput {
  return {
    funnel: funnelHealthy(),
    channels: emptyChannels(),
    dataQuality: emptyDataQuality(),
    period: PERIOD,
    scope: 'citadelle',
    nowIso: PERIOD.untilIso,
    ...over,
  }
}

/** Vérifie l'invariant EVIDENCE + SOURCE + PERIOD + SCOPE. */
function expectWellFormed(signal: NonNullable<ReturnType<typeof ruleDropOff>>) {
  expect(signal.evidence.length).toBeGreaterThanOrEqual(1)
  expect(typeof signal.source).toBe('string')
  expect(signal.source.length).toBeGreaterThan(0)
  expect(signal.period).toEqual(PERIOD)
  expect(signal.scope).toBeTruthy()
  for (const ev of signal.evidence) {
    expect(ev.metric.length).toBeGreaterThan(0)
    expect(ev.source.length).toBeGreaterThan(0)
    expect(ev.measured).toBeDefined()
  }
}

/* ── DROP_OFF ─────────────────────────────────────────────────────────── */

describe('ruleDropOff', () => {
  it('émet un DROP_OFF REAL avec evidence et action quand le taux entrant est REAL', () => {
    const s = ruleDropOff(baseInput())
    expect(s).not.toBeNull()
    expect(s!.category).toBe('DROP_OFF')
    expect(s!.id).toBe(SIGNAL_IDS.dropOff)
    // échantillon 200 (SIGNUP) ⇒ HIGH
    expect(s!.confidence).toBe('HIGH')
    expect(typeof s!.action).toBe('string')
    expectWellFormed(s!)
    // au moins une preuve est un taux
    expect(s!.evidence.some((e) => 'rate' in e.measured)).toBe(true)
  })

  it('NE fabrique PAS de drop-off quand une étape est UNAVAILABLE : émet DATA_QUALITY', () => {
    const s = ruleDropOff(baseInput({ funnel: funnelUnmeasurable() }))
    expect(s).not.toBeNull()
    expect(s!.category).toBe('DATA_QUALITY')
    expect(s!.id).toBe(SIGNAL_IDS.funnelUnmeasurable)
    expect(s!.confidence).toBe('INSUFFICIENT_DATA')
    expect(s!.action ?? null).toBeNull()
    expectWellFormed(s!)
  })

  it('dégrade la confiance sur petit échantillon (garde d’échantillon)', () => {
    const f = funnelHealthy()
    // SIGNUP = 15 ⇒ confidenceFromSample(15) = LOW ; pas d’action confiante
    f.stages[1].value = 15
    const s = ruleDropOff(baseInput({ funnel: f }))
    expect(s!.confidence).toBe('LOW')
    expect(s!.action ?? null).toBeNull()
  })
})

/* ── CONVERSION ───────────────────────────────────────────────────────── */

describe('ruleConversion', () => {
  it('émet un taux visite→inscription REAL, confiance HIGH sur gros échantillon', () => {
    const s = ruleConversion(baseInput())
    expect(s).not.toBeNull()
    expect(s!.category).toBe('CONVERSION')
    expect(s!.confidence).toBe('HIGH')
    expect(typeof s!.action).toBe('string')
    expectWellFormed(s!)
  })

  it('retourne null si le taux visite→inscription n’est pas REAL', () => {
    const f = funnelHealthy()
    f.rates[0] = {
      fromKey: 'CITADELLE_VISIT',
      toKey: 'SIGNUP',
      rate: null,
      availability: 'UNAVAILABLE',
      reason: 'cohortes incompatibles',
    }
    expect(ruleConversion(baseInput({ funnel: f }))).toBeNull()
  })
})

/* ── CHANNEL_OPPORTUNITY ──────────────────────────────────────────────── */

describe('ruleChannelOpportunity', () => {
  it('émet une opportunité de TAUX (moins de trafic, meilleur taux) sur données comparables', () => {
    const channels = emptyChannels()
    channels.citadelle = [
      {
        source: 'whatsapp',
        label: 'WhatsApp',
        citadelleVisits: { value: 120, availability: 'REAL' },
        attributedSignups: { value: 30, availability: 'REAL' },
        visitToSignupRate: { rate: 0.25, availability: 'REAL', sampleSize: 120 },
        engagement: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        parcours: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        conversions: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        confidence: 'HIGH',
      },
      {
        source: 'google',
        label: 'Google',
        citadelleVisits: { value: 500, availability: 'REAL' },
        attributedSignups: { value: 50, availability: 'REAL' },
        visitToSignupRate: { rate: 0.1, availability: 'REAL', sampleSize: 500 },
        engagement: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        parcours: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        conversions: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        confidence: 'HIGH',
      },
    ]
    const s = ruleChannelOpportunity(baseInput({ channels }))
    expect(s).not.toBeNull()
    expect(s!.id).toBe(SIGNAL_IDS.channelRate)
    expect(s!.category).toBe('CHANNEL_OPPORTUNITY')
    expect(s!.confidence).toBe('HIGH') // sample 120 ≥ 100
    expectWellFormed(s!)
  })

  it('replie sur un FAIT d’attribution (MEDIUM, sans action) si aucun taux comparable', () => {
    const channels = emptyChannels()
    channels.rankings = [
      {
        key: 'top_traffic_attributed',
        label: 'Trafic attribué',
        metricLabel: 'Visites',
        period: PERIOD,
        available: true,
        rows: [
          { source: 'youtube', label: 'YouTube', value: 300 },
          { source: 'direct', label: 'Direct', value: 150 },
        ],
      },
    ]
    const s = ruleChannelOpportunity(baseInput({ channels }))
    expect(s).not.toBeNull()
    expect(s!.id).toBe(SIGNAL_IDS.channelTraffic)
    expect(s!.confidence).toBe('MEDIUM')
    expect(s!.action ?? null).toBeNull()
    expectWellFormed(s!)
  })

  it('retourne null si un seul canal comparable et pas de classement', () => {
    const channels = emptyChannels()
    channels.citadelle = [
      {
        source: 'whatsapp',
        label: 'WhatsApp',
        citadelleVisits: { value: 120, availability: 'REAL' },
        attributedSignups: { value: 30, availability: 'REAL' },
        visitToSignupRate: { rate: 0.25, availability: 'REAL', sampleSize: 120 },
        engagement: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        parcours: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        conversions: { value: null, availability: 'UNAVAILABLE', reason: 'n/a' },
        confidence: 'HIGH',
      },
    ]
    expect(ruleChannelOpportunity(baseInput({ channels }))).toBeNull()
  })
})

/* ── GROWTH / DECLINE (tendance native uniquement) ────────────────────── */

function trends(current: number, previous: number | null, delta: number | undefined): YouTubeTrends {
  const stub = { current: 0, previous: null, trend: 'flat' as const }
  return {
    views: { current, previous, trend: delta && delta > 0 ? 'up' : 'down', delta },
    watchTimeMinutes: stub,
    subscribersNet: stub,
    averageViewDurationSec: stub,
  }
}

describe('ruleYouTubeTrend', () => {
  it('émet GROWTH quand delta ≥ seuil ET volume ≥ seuil, scope externe, MEDIUM', () => {
    const s = ruleYouTubeTrend(baseInput({ youtubeTrends: trends(500, 400, 0.25) }))
    expect(s).not.toBeNull()
    expect(s!.category).toBe('GROWTH')
    expect(s!.scope).toBe('external_or_unknown')
    expect(s!.confidence).toBe('MEDIUM') // jamais action prioritaire
    expect(s!.action ?? null).toBeNull()
    expect(s!.fact.toLowerCase()).toContain('attribution')
    expectWellFormed(s!)
  })

  it('émet DECLINE quand delta ≤ -seuil ET volume suffisant', () => {
    const s = ruleYouTubeTrend(baseInput({ youtubeTrends: trends(300, 500, -0.4) }))
    expect(s!.category).toBe('DECLINE')
  })

  it('retourne null si delta sous le seuil matériel', () => {
    expect(ruleYouTubeTrend(baseInput({ youtubeTrends: trends(500, 480, 0.04) }))).toBeNull()
  })

  it('retourne null si volume absolu insuffisant même avec gros delta', () => {
    expect(ruleYouTubeTrend(baseInput({ youtubeTrends: trends(5, 2, 1.5) }))).toBeNull()
  })

  it('retourne null sans tendance native fournie', () => {
    expect(ruleYouTubeTrend(baseInput({ youtubeTrends: null }))).toBeNull()
  })

  it('PORTE la fenêtre de PLATEFORME (28 j), jamais « aujourd\'hui » — garde anti-mislabel', () => {
    const platformPeriod: DecisionPeriod = {
      label: '28 derniers jours',
      sinceIso: '2026-07-26T00:00:00Z',
      untilIso: '2026-08-23T00:00:00Z',
    }
    const s = ruleYouTubeTrend(baseInput({ youtubeTrends: trends(500, 400, 0.25), platformPeriod }))
    expect(s).not.toBeNull()
    // La période affichée doit être la fenêtre 28 j, pas la période Citadelle du jour.
    expect(s!.period.label).toBe('28 derniers jours')
    expect(s!.period.label).not.toBe(PERIOD.label)
  })

  it('retombe honnêtement sur la période du jour si aucune fenêtre plateforme fournie', () => {
    const s = ruleYouTubeTrend(baseInput({ youtubeTrends: trends(500, 400, 0.25) }))
    expect(s!.period.label).toBe(PERIOD.label)
  })
})

/* ── SEO insuffisant ──────────────────────────────────────────────────── */

describe('ruleSeoInsufficient', () => {
  it('émet un DATA_QUALITY INSUFFICIENT_DATA quand seoInsufficient', () => {
    const s = ruleSeoInsufficient(baseInput({ seoInsufficient: true }))
    expect(s).not.toBeNull()
    expect(s!.category).toBe('DATA_QUALITY')
    expect(s!.confidence).toBe('INSUFFICIENT_DATA')
    expect(s!.action ?? null).toBeNull()
    expectWellFormed(s!)
  })

  it('retourne null si SEO suffisant', () => {
    expect(ruleSeoInsufficient(baseInput({ seoInsufficient: false }))).toBeNull()
  })
})

/* ── DATA_QUALITY (lacunes) ───────────────────────────────────────────── */

describe('ruleDataQualityGaps', () => {
  it('émet un signal listant les étapes à instrumenter, sans %', () => {
    const dq = emptyDataQuality()
    dq.toInstrument = [{ label: 'Activation', detail: 'non instrumentée' }]
    const s = ruleDataQualityGaps(baseInput({ dataQuality: dq }))
    expect(s).not.toBeNull()
    expect(s!.category).toBe('DATA_QUALITY')
    expect(s!.confidence).toBe('INSUFFICIENT_DATA')
    expect(s!.action ?? null).toBeNull()
    // aucun pourcentage synthétique dans le texte
    expect(s!.fact).not.toMatch(/\d+\s*%/)
    expectWellFormed(s!)
  })

  it('retourne null sans lacune', () => {
    expect(ruleDataQualityGaps(baseInput())).toBeNull()
  })
})

/* ── CONNECTOR_STATUS ─────────────────────────────────────────────────── */

describe('ruleConnectorStatus', () => {
  it('émet un CONNECTOR_STATUS LOW pour un connecteur bloqué', () => {
    const s = ruleConnectorStatus(
      baseInput({
        connectorStatuses: [
          { channel: 'meta_facebook', label: 'Meta / Facebook', state: 'BLOCKED' },
          { channel: 'youtube', label: 'YouTube', state: 'PASS' },
        ],
      }),
    )
    expect(s).not.toBeNull()
    expect(s!.category).toBe('CONNECTOR_STATUS')
    expect(s!.confidence).toBe('LOW')
    expect(s!.fact).toContain('Meta')
    expect(s!.fact).not.toContain('YouTube') // sain, non listé
    expectWellFormed(s!)
  })

  it('retourne null si tous les connecteurs sont sains', () => {
    expect(
      ruleConnectorStatus(
        baseInput({ connectorStatuses: [{ channel: 'youtube', label: 'YouTube', state: 'PASS' }] }),
      ),
    ).toBeNull()
  })
})

/* ── CONTENT_SIGNAL (factuel) ─────────────────────────────────────────── */

describe('ruleContentSignal', () => {
  it('émet un fait de contenu (YouTube le plus vu) sans recommandation de sujet', () => {
    const s = ruleContentSignal(
      baseInput({ content: { mostViewedYouTube: { title: 'Culte du dimanche', views: 1200, source: 'youtube_analytics' } } }),
    )
    expect(s).not.toBeNull()
    expect(s!.category).toBe('CONTENT_SIGNAL')
    expect(s!.confidence).toBe('LOW')
    expect(s!.action ?? null).toBeNull()
    // interdits de langage
    expect(s!.fact.toLowerCase()).not.toContain('préfèrent')
    expect(s!.whyItMatters.toLowerCase()).not.toContain('il faut')
    expectWellFormed(s!)
  })

  it('contenu YouTube PORTE la fenêtre de PLATEFORME (28 j), pas « aujourd\'hui »', () => {
    const platformPeriod: DecisionPeriod = {
      label: '28 derniers jours',
      sinceIso: '2026-07-26T00:00:00Z',
      untilIso: '2026-08-23T00:00:00Z',
    }
    const s = ruleContentSignal(
      baseInput({
        platformPeriod,
        content: { mostViewedYouTube: { title: 'Culte', views: 1200, source: 'youtube_analytics' } },
      }),
    )
    expect(s!.period.label).toBe('28 derniers jours')
  })

  it('retourne null sans faits de contenu', () => {
    expect(ruleContentSignal(baseInput())).toBeNull()
  })
})
