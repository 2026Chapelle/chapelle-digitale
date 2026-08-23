/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 3 · Tests de VÉRITÉ du builder CANAUX.
 *
 * Gardes prouvées :
 *   PLATFORM_VS_CITADELLE  — une métrique de plateforme n'apparaît JAMAIS dans une
 *                            colonne de valeur Citadelle.
 *   UNATTRIBUTED_PRESERVED — les conversions non attribuées restent non attribuées.
 *   REAL_ZERO_PRESERVED    — 0 visite attribuée reste REAL (jamais NO_DATA/UNAVAILABLE).
 *   META_UNTOUCHED         — Meta présent en état honnête INDISPONIBLE, aucun appel.
 *   RATE_HONESTY           — taux visite→inscription UNAVAILABLE (jamais fabriqué).
 */

import { describe, it, expect } from 'vitest'
import { buildChannelValue, type ChannelsBuildInput } from '../build'
import type { AcquisitionResult } from '../../../metrics/acquisition'
import type { YouTubeData } from '../../../connectors/youtube/types'
import type { DecisionPeriod } from '../../contract'

const PERIOD: DecisionPeriod = {
  label: '28 derniers jours',
  sinceIso: '2026-07-26T00:00:00.000Z',
  untilIso: '2026-08-23T00:00:00.000Z',
}
const NOW = '2026-08-23T10:00:00.000Z'

function acquisition(rows: AcquisitionResult['rows']): AcquisitionResult {
  const totals = rows.reduce(
    (t, r) => ({
      visits: t.visits + r.visits,
      signups: t.signups + r.signups,
      podcastStarts: t.podcastStarts + r.podcastStarts,
      parcoursCompletions: t.parcoursCompletions + r.parcoursCompletions,
    }),
    { visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
  )
  return {
    generatedAt: NOW,
    demoMode: false,
    hasData: totals.visits > 0,
    rows,
    totals,
    internalVisitsExcluded: 7,
    unattributed: { signups: 4, podcastStarts: 2, parcoursCompletions: 3 },
  }
}

const YT_LIVE: YouTubeData = {
  status: {
    channel: 'youtube',
    displayName: 'YouTube',
    state: 'CONNECTED',
    freshness: { generatedAt: NOW, ageSeconds: 0, stale: false } as never,
    lastSync: NOW,
    checkedAt: NOW,
  },
  period: null,
  channel: null,
  totals: {
    views: 12000,
    watchTimeMinutes: 3400,
    averageViewDurationSec: 210,
    subscribersGained: 90,
    subscribersLost: 15,
  },
  previousTotals: null,
  trends: null,
  topVideos: [],
  trafficSources: [],
}

function baseInput(overrides: Partial<ChannelsBuildInput> = {}): ChannelsBuildInput {
  return {
    acquisition: acquisition([
      { source: 'whatsapp', visits: 120, signups: 18, podcastStarts: 40, parcoursCompletions: 9 },
      { source: 'youtube', visits: 55, signups: 6, podcastStarts: 22, parcoursCompletions: 3 },
    ]),
    youtube: null,
    whatsapp: null,
    metaFacebook: null,
    metaInstagram: null,
    period: PERIOD,
    nowIso: NOW,
    ...overrides,
  }
}

describe('buildChannelValue — colonnes Citadelle (attribution réelle)', () => {
  it('reprend visites/inscriptions/écoutes/progressions RÉELLES verbatim', () => {
    const out = buildChannelValue(baseInput())
    const wa = out.citadelle.find((c) => c.source === 'whatsapp')!
    expect(wa.citadelleVisits).toEqual({ value: 120, availability: 'REAL' })
    expect(wa.attributedSignups).toEqual({ value: 18, availability: 'REAL' })
    expect(wa.engagement).toEqual({ value: 40, availability: 'REAL' })
    expect(wa.parcours).toEqual({ value: 9, availability: 'REAL' })
    expect(wa.label).toBe('WhatsApp')
  })

  it('RATE_HONESTY : visitToSignupRate est UNAVAILABLE (rate null) + sampleSize=visites', () => {
    const out = buildChannelValue(baseInput())
    const wa = out.citadelle.find((c) => c.source === 'whatsapp')!
    expect(wa.visitToSignupRate.rate).toBeNull()
    expect(wa.visitToSignupRate.availability).toBe('UNAVAILABLE')
    expect(wa.visitToSignupRate.reason).toMatch(/first-touch|cohortes/i)
    expect(wa.visitToSignupRate.sampleSize).toBe(120)
  })

  it('conversions par source = UNAVAILABLE (jamais un total fabriqué)', () => {
    const out = buildChannelValue(baseInput())
    const wa = out.citadelle.find((c) => c.source === 'whatsapp')!
    expect(wa.conversions.value).toBeNull()
    expect(wa.conversions.availability).toBe('UNAVAILABLE')
    expect(wa.conversions.reason).toBeTruthy()
  })

  it('confidence dérive de confidenceFromSample(visites) (120 → HIGH, 55 → MEDIUM)', () => {
    const out = buildChannelValue(baseInput())
    expect(out.citadelle.find((c) => c.source === 'whatsapp')!.confidence).toBe('HIGH')
    expect(out.citadelle.find((c) => c.source === 'youtube')!.confidence).toBe('MEDIUM')
  })

  it('REAL_ZERO_PRESERVED : 0 visite attribuée reste REAL (value 0), pas NO_DATA', () => {
    const out = buildChannelValue(
      baseInput({
        acquisition: acquisition([
          { source: 'email', visits: 0, signups: 5, podcastStarts: 0, parcoursCompletions: 0 },
          { source: 'direct', visits: 30, signups: 2, podcastStarts: 1, parcoursCompletions: 0 },
        ]),
      }),
    )
    const email = out.citadelle.find((c) => c.source === 'email')!
    expect(email.citadelleVisits.availability).toBe('REAL')
    expect(email.citadelleVisits.value).toBe(0)
  })
})

describe('buildChannelValue — partiel & transparence', () => {
  it('UNATTRIBUTED_PRESERVED : signups/progressions non attribués repris verbatim', () => {
    const out = buildChannelValue(baseInput())
    expect(out.unattributed).toEqual({ signups: 4, progressions: 3 })
    expect(out.internalVisitsExcluded).toBe(7)
  })
})

describe('buildChannelValue — PLATFORM_VS_CITADELLE', () => {
  it('aucune valeur de plateforme (vues/abonnés) ne figure dans une colonne Citadelle', () => {
    const out = buildChannelValue(baseInput({ youtube: YT_LIVE }))
    const ytCitadelle = out.citadelle.find((c) => c.source === 'youtube')!
    // Les colonnes Citadelle YouTube restent l'attribution first-party (55 visites),
    // JAMAIS les 12000 vues de plateforme.
    expect(ytCitadelle.citadelleVisits.value).toBe(55)
    const platformValues = out.platformContext
      .flatMap((p) => p.metrics.map((m) => m.value.value))
      .filter((v): v is number => v !== null)
    expect(platformValues).toContain(12000) // vues => contexte plateforme
    // Aucune colonne Citadelle n'égale une métrique de portée plateforme.
    for (const c of out.citadelle) {
      expect(c.citadelleVisits.value).not.toBe(12000)
      expect(c.engagement.value).not.toBe(12000)
      expect(c.parcours.value).not.toBe(3400)
    }
  })

  it('YouTube contexte REAL avec unités explicites quand connecté + totaux', () => {
    const out = buildChannelValue(baseInput({ youtube: YT_LIVE }))
    const yt = out.platformContext.find((p) => p.channel === 'youtube')!
    expect(yt.availability).toBe('REAL')
    expect(yt.metrics.find((m) => m.key === 'views')).toMatchObject({
      unit: 'vues',
      value: { value: 12000, availability: 'REAL' },
    })
    expect(yt.metrics.find((m) => m.key === 'subscribersNet')!.value.value).toBe(75) // 90 - 15
    expect(yt.metrics.find((m) => m.key === 'watchTimeMinutes')!.unit).toBe('min')
  })

  it('YouTube non fourni => contexte UNAVAILABLE avec raison, metrics vides', () => {
    const out = buildChannelValue(baseInput({ youtube: null }))
    const yt = out.platformContext.find((p) => p.channel === 'youtube')!
    expect(yt.availability).toBe('UNAVAILABLE')
    expect(yt.metrics).toEqual([])
    expect(yt.reason).toBeTruthy()
  })

  it('YouTube REAL PORTE la fenêtre plateforme (periodLabel) — jamais lue « aujourd\'hui »', () => {
    const out = buildChannelValue(baseInput({ youtube: YT_LIVE, platformWindowLabel: 'Fenêtre 28 j' }))
    const yt = out.platformContext.find((p) => p.channel === 'youtube')!
    expect(yt.availability).toBe('REAL')
    // La fenêtre réelle de plateforme est portée explicitement sur le contexte.
    expect(yt.periodLabel).toBe('Fenêtre 28 j')
  })

  it('sans libellé de fenêtre plateforme, aucun periodLabel fabriqué', () => {
    const out = buildChannelValue(baseInput({ youtube: YT_LIVE }))
    const yt = out.platformContext.find((p) => p.channel === 'youtube')!
    expect(yt.periodLabel).toBeUndefined()
  })

  it('WhatsApp : présence honnête NOT_APPLICABLE (pas de portée plateforme mesurable)', () => {
    const out = buildChannelValue(baseInput())
    const wa = out.platformContext.find((p) => p.channel === 'whatsapp')!
    expect(wa.availability).toBe('NOT_APPLICABLE')
    expect(wa.metrics).toEqual([])
  })
})

describe('buildChannelValue — META_UNTOUCHED', () => {
  it('Facebook + Instagram TOUJOURS présents en INDISPONIBLE, metrics vides', () => {
    const out = buildChannelValue(baseInput())
    const fb = out.platformContext.find((p) => p.channel === 'meta_facebook')!
    const ig = out.platformContext.find((p) => p.channel === 'meta_instagram')!
    expect(fb.availability).toBe('UNAVAILABLE')
    expect(ig.availability).toBe('UNAVAILABLE')
    expect(fb.metrics).toEqual([])
    expect(ig.metrics).toEqual([])
    expect(fb.reason).toBeTruthy()
    expect(ig.reason).toBeTruthy()
  })

  it('utilise le libellé/raison Meta injectés sans jamais fabriquer de métrique', () => {
    const out = buildChannelValue(
      baseInput({
        metaFacebook: { state: 'UNAVAILABLE', label: 'Facebook', reason: 'Propriété externe.' },
      }),
    )
    const fb = out.platformContext.find((p) => p.channel === 'meta_facebook')!
    expect(fb.reason).toBe('Propriété externe.')
    expect(fb.metrics).toEqual([])
  })
})

describe('buildChannelValue — mode démo', () => {
  it('acquisition null => demoMode true, aucune ligne Citadelle fabriquée', () => {
    const out = buildChannelValue(baseInput({ acquisition: null }))
    expect(out.demoMode).toBe(true)
    expect(out.citadelle).toEqual([])
    expect(out.unattributed).toEqual({ signups: 0, progressions: 0 })
    // Meta reste honnêtement présent même en démo.
    expect(out.platformContext.some((p) => p.channel === 'meta_facebook')).toBe(true)
  })

  it('acquisition.demoMode=true propage demoMode', () => {
    const demoAcq: AcquisitionResult = { ...acquisition([]), demoMode: true }
    const out = buildChannelValue(baseInput({ acquisition: demoAcq }))
    expect(out.demoMode).toBe(true)
    expect(out.citadelle).toEqual([])
  })
})

describe('buildChannelValue — enveloppe', () => {
  it('scope citadelle, période et horloge injectées propagées', () => {
    const out = buildChannelValue(baseInput())
    expect(out.scope).toBe('citadelle')
    expect(out.period).toEqual(PERIOD)
    expect(out.generatedAt).toBe(NOW)
  })
})
