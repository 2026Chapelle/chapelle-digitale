/**
 * CITADELLE INTELLIGENCE — 5B · Tests du CONTEXTE de QUALITÉ de mesure.
 *
 * Gardes prouvées :
 *  - listes construites à partir de FAITS réels (connecteurs, funnel, canaux) ;
 *  - AUCUN pourcentage synthétique, AUCUN score A/B/C ;
 *  - couverture = comptes bruts issus de coverageSummary() (available/partial/gap/total) ;
 *  - étape UNAVAILABLE ⇒ à instrumenter (jamais convertie en 0).
 */

import { describe, it, expect } from 'vitest'
import { buildDataQuality, type DataQualityBuildInput } from '../data-quality'
import type { DecisionChannelsPayload, DecisionFunnelPayload, DecisionPeriod } from '../contract'
import { coverageSummary } from '../../core/event-contract'

const PERIOD: DecisionPeriod = {
  label: "Aujourd'hui (UTC)",
  sinceIso: '2026-08-23T00:00:00Z',
  untilIso: '2026-08-23T12:00:00Z',
}

function funnelWithUnavailable(): DecisionFunnelPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    stages: [
      { key: 'CITADELLE_VISIT', label: 'Visites Citadelle', status: 'REAL', value: 500, definition: 'v', source: 'analytics_events', cohort: 'pageviews', freshness: 'NEAR_REALTIME' },
      { key: 'ACTIVATION', label: 'Activation', status: 'UNAVAILABLE', value: null, definition: 'a', source: 'audio_listening_events', cohort: 'unavailable', freshness: 'SYNCED', reason: "Signal d'activation non instrumenté" },
      { key: 'CONVERSION', label: 'Conversion', status: 'UNAVAILABLE', value: null, definition: 'c', source: 'composite', cohort: 'composite', freshness: 'SYNCED', reason: 'Conversion composite non instrumentée' },
    ],
    rates: [],
    primaryDropOffKey: null,
  }
}

function channelsWithUnattributed(signups: number, progressions: number): DecisionChannelsPayload {
  return {
    generatedAt: PERIOD.untilIso,
    scope: 'citadelle',
    period: PERIOD,
    demoMode: false,
    citadelle: [],
    unattributed: { signups, progressions },
    internalVisitsExcluded: 0,
    platformContext: [],
    rankings: [],
  }
}

function input(over: Partial<DataQualityBuildInput> = {}): DataQualityBuildInput {
  return { nowIso: PERIOD.untilIso, ...over }
}

describe('buildDataQuality — fiabilité', () => {
  it('classe toujours Visites + Inscriptions comme fiables (première partie)', () => {
    const dq = buildDataQuality(input())
    const labels = dq.reliable.map((r) => r.label)
    expect(labels).toContain('Visites Citadelle')
    expect(labels).toContain('Inscriptions')
  })

  it('ajoute GSC/GA4/YouTube en fiables uniquement s’ils sont connectés', () => {
    const off = buildDataQuality(input())
    expect(off.reliable.map((r) => r.label)).not.toContain('Search Console')
    const on = buildDataQuality(input({ gscConfigured: true, ga4Configured: true, youtubeConnected: true }))
    const labels = on.reliable.map((r) => r.label)
    expect(labels).toContain('Search Console')
    expect(labels).toContain('Analytics GA4')
    expect(labels).toContain('YouTube')
  })
})

describe('buildDataQuality — partiel', () => {
  it('révèle l’attribution incomplète quand des inscriptions ne sont pas rattachées', () => {
    const dq = buildDataQuality(input({ channels: channelsWithUnattributed(12, 5) }))
    const attr = dq.partial.find((p) => p.label === 'Attribution des sources')
    expect(attr).toBeDefined()
    expect(attr!.detail).toContain('12')
  })

  it('classe le SEO comme différé quand GSC est connecté', () => {
    const dq = buildDataQuality(input({ gscConfigured: true }))
    expect(dq.partial.some((p) => p.label === 'SEO différé')).toBe(true)
  })
})

describe('buildDataQuality — à instrumenter', () => {
  it('liste chaque étape UNAVAILABLE du funnel (jamais convertie en 0)', () => {
    const dq = buildDataQuality(input({ funnel: funnelWithUnavailable() }))
    const labels = dq.toInstrument.map((t) => t.label)
    expect(labels).toContain('Activation')
    expect(labels).toContain('Conversion')
    // le détail reprend la raison réelle
    expect(dq.toInstrument.find((t) => t.label === 'Activation')!.detail).toContain('instrument')
  })

  it('fournit des lacunes canoniques par défaut si aucun funnel n’est fourni', () => {
    const dq = buildDataQuality(input())
    expect(dq.toInstrument.length).toBeGreaterThanOrEqual(1)
  })
})

describe('buildDataQuality — couverture (comptes bruts, aucun %)', () => {
  it('reprend exactement coverageSummary() en comptes entiers', () => {
    const dq = buildDataQuality(input())
    const cov = coverageSummary()
    expect(dq.coverage).toEqual({
      available: cov.available,
      partial: cov.partial,
      gap: cov.gap,
      total: cov.total,
    })
    for (const v of Object.values(dq.coverage)) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('n’expose aucun champ de pourcentage ni de score synthétique', () => {
    const dq = buildDataQuality(input({ gscConfigured: true, funnel: funnelWithUnavailable() }))
    const serialized = JSON.stringify(dq)
    // pas de clé « percent »/« score »/« ratio » dans la structure
    expect(serialized).not.toMatch(/"(percent|percentage|score|ratio|grade)"/i)
    // la couverture ne contient que les 4 comptes attendus
    expect(Object.keys(dq.coverage).sort()).toEqual(['available', 'gap', 'partial', 'total'])
  })
})
