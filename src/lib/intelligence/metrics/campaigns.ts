/**
 * CITADELLE INTELLIGENCE HUB — HUB-3 (Campagnes & UTM durables)
 * Service canonique CAMPAGNES. PUR.
 *
 * Grain = (source, campaign) first-touch. medium = dominant du groupe ; content =
 * drill-down. Honnetete (identique HUB-2) : Visites = reel ; conversions = partiel
 * (non attribuees comptees a part) ; AUCUN taux de conversion (cohortes differentes) ;
 * 'internal' exclu ; campaign absent = null (sans campagne), jamais relabellise.
 */

import { normalizeAcquisitionSource, type NormalizedSource, type NormalizeOptions } from '../attribution/normalize'
import { deriveMedium, normalizeUtmCampaign, normalizeUtmContent } from '../attribution/utm'
import type { SessionSourceRow } from '../attribution/resolve'
import type { AttributionMedium } from '../types/attribution'

/** Session brute pour les visites campagne (jamais exposee telle quelle). */
export interface RawCampaignVisit {
  source: string | null
  referrer: string | null
  utm_campaign: string | null
  utm_medium: string | null
  utm_content: string | null
}

export interface CampaignContentRow {
  content: string | null
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
}

export interface CampaignRow {
  source: NormalizedSource
  campaign: string | null // null = sans campagne (utm absent)
  medium: AttributionMedium | null // medium dominant des visites du groupe
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
  contents: CampaignContentRow[]
}

export interface CampaignResult {
  generatedAt: string
  demoMode: boolean
  hasData: boolean
  rows: CampaignRow[]
  totals: { visits: number; signups: number; podcastStarts: number; parcoursCompletions: number }
  internalVisitsExcluded: number
  unattributed: { signups: number; podcastStarts: number; parcoursCompletions: number }
}

export interface BuildCampaignsInput {
  visits: ReadonlyArray<RawCampaignVisit> | null
  signupRows: ReadonlyArray<SessionSourceRow | null>
  podcastRows: ReadonlyArray<SessionSourceRow | null>
  parcoursRows: ReadonlyArray<SessionSourceRow | null>
  nowIso: string
  demo?: boolean
  normalizeOptions?: NormalizeOptions
}

// Separateur NUL : impossible dans une valeur UTM normalisee (caracteres de controle
// retires par normalizeUtmValue) et absent des sources (ensemble ferme) => cle de
// groupe sans collision. Construit via String.fromCharCode(0) (source 100% ASCII).
const SEP = String.fromCharCode(0)
const NULL_TOKEN = String.fromCharCode(0) + 'null'
const groupKey = (source: string, campaign: string | null) => source + SEP + (campaign ?? NULL_TOKEN)
const contentKey = (content: string | null) => content ?? NULL_TOKEN

interface Acc {
  source: NormalizedSource
  campaign: string | null
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
  mediumTally: Map<AttributionMedium, number>
  contents: Map<string, CampaignContentRow>
}

type ConvField = 'signups' | 'podcastStarts' | 'parcoursCompletions'

function emptyResult(nowIso: string, demoMode: boolean): CampaignResult {
  return {
    generatedAt: nowIso,
    demoMode,
    hasData: false,
    rows: [],
    totals: { visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
    internalVisitsExcluded: 0,
    unattributed: { signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
  }
}

export function buildCampaigns(input: BuildCampaignsInput): CampaignResult {
  const demoMode = input.demo === true || input.visits === null
  if (demoMode || !input.visits) return emptyResult(input.nowIso, true)
  const opts = input.normalizeOptions

  const groups = new Map<string, Acc>()
  const ensure = (source: NormalizedSource, campaign: string | null): Acc => {
    const k = groupKey(source, campaign)
    let acc = groups.get(k)
    if (!acc) {
      acc = { source, campaign, visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0, mediumTally: new Map(), contents: new Map() }
      groups.set(k, acc)
    }
    return acc
  }
  const ensureContent = (acc: Acc, content: string | null): CampaignContentRow => {
    const k = contentKey(content)
    let row = acc.contents.get(k)
    if (!row) {
      row = { content, visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 }
      acc.contents.set(k, row)
    }
    return row
  }

  let internalVisitsExcluded = 0

  // Visites : source natif + campaign/medium/content de la meme session first-touch.
  for (const v of input.visits) {
    const source = normalizeAcquisitionSource(v.source, v.referrer, opts)
    if (source === 'internal') {
      internalVisitsExcluded += 1
      continue
    }
    const campaign = normalizeUtmCampaign(v.utm_campaign)
    const medium = deriveMedium(v.utm_medium)
    const content = normalizeUtmContent(v.utm_content)
    const acc = ensure(source, campaign)
    acc.visits += 1
    acc.mediumTally.set(medium, (acc.mediumTally.get(medium) ?? 0) + 1)
    ensureContent(acc, content).visits += 1
  }

  // Conversions : resolues vers leur session first-touch ; sinon non attribuees.
  const unattributed = { signups: 0, podcastStarts: 0, parcoursCompletions: 0 }
  const applyConversions = (rows: ReadonlyArray<SessionSourceRow | null>, field: ConvField) => {
    for (const row of rows) {
      if (!row) {
        unattributed[field] += 1
        continue
      }
      const source = normalizeAcquisitionSource(row.source, row.referrer, opts)
      if (source === 'internal') {
        unattributed[field] += 1
        continue
      }
      const campaign = normalizeUtmCampaign(row.utm_campaign ?? null)
      const content = normalizeUtmContent(row.utm_content ?? null)
      const acc = ensure(source, campaign)
      acc[field] += 1
      ensureContent(acc, content)[field] += 1
    }
  }
  applyConversions(input.signupRows, 'signups')
  applyConversions(input.podcastRows, 'podcastStarts')
  applyConversions(input.parcoursRows, 'parcoursCompletions')

  const dominantMedium = (tally: Map<AttributionMedium, number>): AttributionMedium | null => {
    let best: AttributionMedium | null = null
    let bestN = -1
    for (const [m, n] of Array.from(tally.entries())) {
      if (n > bestN || (n === bestN && best !== null && m < best)) {
        best = m
        bestN = n
      }
    }
    return best
  }

  const rows: CampaignRow[] = Array.from(groups.values()).map((acc) => ({
    source: acc.source,
    campaign: acc.campaign,
    medium: dominantMedium(acc.mediumTally),
    visits: acc.visits,
    signups: acc.signups,
    podcastStarts: acc.podcastStarts,
    parcoursCompletions: acc.parcoursCompletions,
    contents: Array.from(acc.contents.values()).sort(
      (a, b) => b.visits - a.visits || b.signups - a.signups || (a.content ?? '').localeCompare(b.content ?? ''),
    ),
  }))

  // Tri : campagnes nommees d'abord (visites desc), lignes sans campagne (null) en dernier.
  rows.sort((a, b) => {
    const an = a.campaign === null ? 1 : 0
    const bn = b.campaign === null ? 1 : 0
    return an - bn || b.visits - a.visits || b.signups - a.signups || a.source.localeCompare(b.source)
  })

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
    unattributed,
  }
}
