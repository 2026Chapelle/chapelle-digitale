/**
 * CITADELLE INTELLIGENCE HUB — HUB-2 (First-party attribution)
 * Service canonique ACQUISITION (Vue par source). PUR.
 *
 * Produit le tableau SOURCE × (Visites / Inscriptions / Écoutes / Progressions)
 * + taux de conversion sûr. Honnêteté :
 *  - Visites = RÉEL (source native de la session, first-touch).
 *  - Inscriptions / Écoutes / Progressions = PARTIEL : chaque conversion non
 *    rattachable à une session est comptée en `unattributed` (jamais réattribuée).
 *  - 'internal' est exclu du tableau (nav interne), reporté à part.
 *  - Aucune donnée ⇒ hasData=false (jamais un faux 0 %).
 */

import { tallyBySource } from '../attribution/aggregate'
import {
  normalizeAcquisitionSource,
  type NormalizedSource,
  type NormalizeOptions,
} from '../attribution/normalize'
import type { RawVisitSession } from '../attribution/resolve'

export type { RawVisitSession }

export interface AcquisitionRow {
  source: NormalizedSource
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
}
// NB : PAS de taux de conversion par ligne. Les visites sont bornées au jour, mais
// l'attribution first-touch d'une conversion peut pointer une session ANTÉRIEURE
// (hors fenêtre du jour). Numérateur et dénominateur seraient de cohortes
// différentes (rate > 100% possible) ⇒ non fiable, donc non affiché (cf. GO §14).

export interface AcquisitionResult {
  generatedAt: string
  demoMode: boolean
  /** true seulement si au moins une visite attribuable existe. */
  hasData: boolean
  rows: AcquisitionRow[]
  totals: { visits: number; signups: number; podcastStarts: number; parcoursCompletions: number }
  /** Visites internes (nav Citadelle) exclues de l'attribution. */
  internalVisitsExcluded: number
  /** Conversions non rattachables à une source (transparence du PARTIEL). */
  unattributed: { signups: number; podcastStarts: number; parcoursCompletions: number }
}

export interface BuildAcquisitionInput {
  /** Sessions démarrées dans la fenêtre (visites). null ⇒ démo. */
  visits: ReadonlyArray<RawVisitSession> | null
  /** Sources résolues (NormalizedSource|null) par conversion. */
  signupSources: ReadonlyArray<NormalizedSource | null>
  podcastSources: ReadonlyArray<NormalizedSource | null>
  parcoursSources: ReadonlyArray<NormalizedSource | null>
  nowIso: string
  demo?: boolean
  normalizeOptions?: NormalizeOptions
}

const EMPTY_RESULT = (nowIso: string, demoMode: boolean): AcquisitionResult => ({
  generatedAt: nowIso,
  demoMode,
  hasData: false,
  rows: [],
  totals: { visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
  internalVisitsExcluded: 0,
  unattributed: { signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
})

export function buildAcquisition(input: BuildAcquisitionInput): AcquisitionResult {
  const demoMode = input.demo === true || input.visits === null
  if (demoMode || !input.visits) return EMPTY_RESULT(input.nowIso, true)

  // Visites : normaliser chaque session, exclure 'internal'.
  const visitSources = input.visits.map((v) =>
    normalizeAcquisitionSource(v.source, v.referrer, input.normalizeOptions),
  )
  const internalVisitsExcluded = visitSources.filter((s) => s === 'internal').length
  const visitTally = tallyBySource(visitSources.filter((s) => s !== 'internal'))

  const signupTally = tallyBySource(input.signupSources.filter((s) => s !== 'internal'))
  const podcastTally = tallyBySource(input.podcastSources.filter((s) => s !== 'internal'))
  const parcoursTally = tallyBySource(input.parcoursSources.filter((s) => s !== 'internal'))

  // Union des sources présentes (hors 'internal').
  const sources = new Set<NormalizedSource>([
    ...Array.from(visitTally.keys()),
    ...Array.from(signupTally.keys()),
    ...Array.from(podcastTally.keys()),
    ...Array.from(parcoursTally.keys()),
  ])

  const rows: AcquisitionRow[] = Array.from(sources).map((source) => {
    const visits = visitTally.get(source) ?? 0
    const signups = signupTally.get(source) ?? 0
    return {
      source,
      visits,
      signups,
      podcastStarts: podcastTally.get(source) ?? 0,
      parcoursCompletions: parcoursTally.get(source) ?? 0,
    }
  })
  // Tri : visites desc, puis inscriptions desc, puis nom (déterministe).
  rows.sort(
    (a, b) => b.visits - a.visits || b.signups - a.signups || a.source.localeCompare(b.source),
  )

  // Non attribué = conversions non rattachées à un canal (null OU 'internal').
  const sumTally = (m: Map<NormalizedSource, number>) => Array.from(m.values()).reduce((a, b) => a + b, 0)
  const totalVisits = rows.reduce((n, r) => n + r.visits, 0)
  return {
    generatedAt: input.nowIso,
    demoMode: false,
    hasData: totalVisits > 0,
    rows,
    totals: {
      visits: totalVisits,
      signups: rows.reduce((n, r) => n + r.signups, 0),
      podcastStarts: rows.reduce((n, r) => n + r.podcastStarts, 0),
      parcoursCompletions: rows.reduce((n, r) => n + r.parcoursCompletions, 0),
    },
    internalVisitsExcluded,
    unattributed: {
      signups: input.signupSources.length - sumTally(signupTally),
      podcastStarts: input.podcastSources.length - sumTally(podcastTally),
      parcoursCompletions: input.parcoursSources.length - sumTally(parcoursTally),
    },
  }
}
