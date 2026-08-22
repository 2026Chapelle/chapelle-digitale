/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Meta → CITADELLE (ATTRIBUTION first-party, PURE)
 *
 * SÉPARE explicitement deux mondes qu'on ne doit JAMAIS mélanger :
 *  - PLATFORM_METRICS (reach/impressions/likes) : viennent de Meta (connector).
 *  - CITADELLE_ATTRIBUTED_METRICS : visites/inscriptions/écoutes/progressions RÉELLES
 *    de Citadelle, attribuées à la source facebook|instagram (first-touch, detectSource + UTM).
 *
 * Le « meilleur canal » se juge sur VISITES/INSCRIPTIONS/PROGRESSIONS — jamais sur
 * le reach/les likes. Quand l'UTM le permet, on répartit Facebook entre la page
 * CITADELLE et la page CHAPELLE ; sinon la visite reste `indeterminee` (jamais devinée).
 *
 * Réutilise la surface d'attribution sanctionnée (normalizeAcquisitionSource) — PURE,
 * aucune I/O, aucun secret.
 */

import { normalizeAcquisitionSource, type NormalizeOptions } from '../../attribution/normalize'
import type { RawCampaignVisit } from '../../metrics/campaigns'
import type { SessionSourceRow } from '../../attribution/resolve'

export type MetaAttributedSource = 'facebook' | 'instagram'
export type FbPageBucket = 'citadelle' | 'chapelle' | 'indeterminee'

export interface AttributedCounts {
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
}

export interface AttributedCampaignRow extends AttributedCounts {
  campaign: string | null
}

export interface MetaSourceAttribution extends AttributedCounts {
  source: MetaAttributedSource
  campaigns: AttributedCampaignRow[]
}

/** Répartition Facebook par page (jamais fusionnée). */
export interface FbPageSplit {
  citadelle: AttributedCounts
  chapelle: AttributedCounts
  indeterminee: AttributedCounts
}

export interface MetaAttributionResult {
  generatedAt: string
  demoMode: boolean
  hasData: boolean
  facebook: MetaSourceAttribution
  instagram: MetaSourceAttribution
  /** Ventilation de l'attribution Facebook entre les deux pages canoniques. */
  facebookPageSplit: FbPageSplit
  totals: AttributedCounts
}

/** Marqueurs UTM (campaign/content) permettant de rattacher une visite FB à une page. */
export interface FbPageMarkers {
  citadelle: ReadonlyArray<string>
  chapelle: ReadonlyArray<string>
}
const DEFAULT_MARKERS: FbPageMarkers = {
  citadelle: ['citadelle'],
  chapelle: ['chapelle', 'institution', 'institutionnel'],
}

export interface BuildMetaAttributionInput {
  /** Sessions de la fenêtre (visites). null ⇒ démo. */
  visits: ReadonlyArray<RawCampaignVisit> | null
  /** Sessions first-touch résolues (ou null) par conversion. */
  signupRows: ReadonlyArray<SessionSourceRow | null>
  podcastRows: ReadonlyArray<SessionSourceRow | null>
  parcoursRows: ReadonlyArray<SessionSourceRow | null>
  nowIso: string
  demo?: boolean
  normalizeOptions?: NormalizeOptions
  markers?: FbPageMarkers
}

const zero = (): AttributedCounts => ({ visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 })

function add(a: AttributedCounts, key: keyof AttributedCounts, n = 1): void {
  a[key] += n
}

/** Détermine la page FB d'une visite via ses UTM (campaign/content). Défaut: indéterminée. */
export function classifyFbPage(
  utmCampaign: string | null | undefined,
  utmContent: string | null | undefined,
  markers: FbPageMarkers = DEFAULT_MARKERS,
): FbPageBucket {
  const hay = `${utmCampaign ?? ''} ${utmContent ?? ''}`.toLowerCase()
  const hit = (list: ReadonlyArray<string>) => list.some((m) => hay.includes(m.toLowerCase()))
  // Priorité citadelle (rôle acquisition) si les deux marqueurs coexistent.
  if (hit(markers.citadelle)) return 'citadelle'
  if (hit(markers.chapelle)) return 'chapelle'
  return 'indeterminee'
}

const EMPTY = (nowIso: string, demoMode: boolean): MetaAttributionResult => ({
  generatedAt: nowIso,
  demoMode,
  hasData: false,
  facebook: { source: 'facebook', ...zero(), campaigns: [] },
  instagram: { source: 'instagram', ...zero(), campaigns: [] },
  facebookPageSplit: { citadelle: zero(), chapelle: zero(), indeterminee: zero() },
  totals: zero(),
})

function normSource(
  source: string | null,
  referrer: string | null,
  opts?: NormalizeOptions,
): MetaAttributedSource | null {
  const s = normalizeAcquisitionSource(source, referrer, opts)
  return s === 'facebook' || s === 'instagram' ? s : null
}

/**
 * Construit l'attribution Citadelle des sources Meta. PURE.
 * hasData = au moins une visite facebook|instagram attribuée.
 */
export function buildMetaAttribution(input: BuildMetaAttributionInput): MetaAttributionResult {
  const demoMode = input.demo === true || input.visits === null
  if (demoMode || !input.visits) return EMPTY(input.nowIso, true)
  const markers = input.markers ?? DEFAULT_MARKERS
  const opts = input.normalizeOptions

  const fb: AttributedCounts = zero()
  const ig: AttributedCounts = zero()
  const split: FbPageSplit = { citadelle: zero(), chapelle: zero(), indeterminee: zero() }
  const fbCampaigns = new Map<string | null, AttributedCampaignRow>()
  const igCampaigns = new Map<string | null, AttributedCampaignRow>()

  const bumpCampaign = (
    map: Map<string | null, AttributedCampaignRow>,
    campaign: string | null,
    key: keyof AttributedCounts,
  ) => {
    const cur = map.get(campaign) ?? { campaign, ...zero() }
    add(cur, key)
    map.set(campaign, cur)
  }

  // 1) Visites (source native des sessions).
  for (const v of input.visits) {
    const src = normSource(v.source, v.referrer, opts)
    if (src === 'facebook') {
      add(fb, 'visits')
      add(split[classifyFbPage(v.utm_campaign, v.utm_content, markers)], 'visits')
      bumpCampaign(fbCampaigns, v.utm_campaign ?? null, 'visits')
    } else if (src === 'instagram') {
      add(ig, 'visits')
      bumpCampaign(igCampaigns, v.utm_campaign ?? null, 'visits')
    }
  }

  // 2) Conversions (session first-touch résolue).
  const applyConversion = (rows: ReadonlyArray<SessionSourceRow | null>, key: keyof AttributedCounts) => {
    for (const r of rows) {
      if (!r) continue
      const src = normSource(r.source, r.referrer, opts)
      if (src === 'facebook') {
        add(fb, key)
        add(split[classifyFbPage(r.utm_campaign, r.utm_content, markers)], key)
        bumpCampaign(fbCampaigns, r.utm_campaign ?? null, key)
      } else if (src === 'instagram') {
        add(ig, key)
        bumpCampaign(igCampaigns, r.utm_campaign ?? null, key)
      }
    }
  }
  applyConversion(input.signupRows, 'signups')
  applyConversion(input.podcastRows, 'podcastStarts')
  applyConversion(input.parcoursRows, 'parcoursCompletions')

  const sortCampaigns = (m: Map<string | null, AttributedCampaignRow>): AttributedCampaignRow[] =>
    Array.from(m.values()).sort(
      (a, b) =>
        b.visits - a.visits ||
        b.signups - a.signups ||
        (a.campaign ?? '').localeCompare(b.campaign ?? ''),
    )

  const totals: AttributedCounts = {
    visits: fb.visits + ig.visits,
    signups: fb.signups + ig.signups,
    podcastStarts: fb.podcastStarts + ig.podcastStarts,
    parcoursCompletions: fb.parcoursCompletions + ig.parcoursCompletions,
  }

  return {
    generatedAt: input.nowIso,
    demoMode: false,
    hasData: totals.visits > 0,
    facebook: { source: 'facebook', ...fb, campaigns: sortCampaigns(fbCampaigns) },
    instagram: { source: 'instagram', ...ig, campaigns: sortCampaigns(igCampaigns) },
    facebookPageSplit: split,
    totals,
  }
}
