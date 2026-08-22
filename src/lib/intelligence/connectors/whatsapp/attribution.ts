/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · WhatsApp · ATTRIBUTION first-party (PURE)
 *
 * L'attribution WhatsApp est FIRST-PARTY et RÉALISABLE MAINTENANT (aucune API externe) :
 * `detectSource()` marque déjà `source='whatsapp'` quand le referrer contient
 * « whatsapp » (donc depuis le CANAL de diffusion whatsapp.com/channel/…) ou via UTM
 * (utm_source=whatsapp). On agrège donc les VISITES/INSCRIPTIONS/ÉCOUTES/PROGRESSIONS
 * réellement attribuées à `whatsapp`, ventilées par campagne UTM.
 *
 * Honnêteté : `hasData=false` quand il n'y a AUCUNE visite whatsapp aujourd'hui —
 * ce n'est PAS « indisponible ». L'attribution reste ACTIVE (first-party opérationnelle).
 * PURE : aucune I/O, aucun secret. Le lien canal est un IDENTIFIANT public.
 */

import { normalizeAcquisitionSource, type NormalizeOptions } from '../../attribution/normalize'
import type { RawCampaignVisit } from '../../metrics/campaigns'
import type { SessionSourceRow } from '../../attribution/resolve'

/** URL canonique du CANAL de diffusion WhatsApp (public, jamais un lien wa.me). */
export const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCGBmkH5JLuUSYkax3B'

export interface WhatsAppCounts {
  visits: number
  signups: number
  podcastStarts: number
  parcoursCompletions: number
}

export interface WhatsAppCampaignRow extends WhatsAppCounts {
  campaign: string | null
}

export interface WhatsAppAttributionResult {
  generatedAt: string
  /** ACTIVE en permanence : l'attribution first-party fonctionne (≠ connecté externe). */
  active: true
  demoMode: boolean
  /** true seulement s'il existe au moins une visite whatsapp attribuée. */
  hasData: boolean
  totals: WhatsAppCounts
  campaigns: WhatsAppCampaignRow[]
  channelUrl: string
}

export interface BuildWhatsAppAttributionInput {
  visits: ReadonlyArray<RawCampaignVisit> | null
  signupRows: ReadonlyArray<SessionSourceRow | null>
  podcastRows: ReadonlyArray<SessionSourceRow | null>
  parcoursRows: ReadonlyArray<SessionSourceRow | null>
  nowIso: string
  demo?: boolean
  normalizeOptions?: NormalizeOptions
}

const zero = (): WhatsAppCounts => ({ visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 })

const EMPTY = (nowIso: string, demoMode: boolean): WhatsAppAttributionResult => ({
  generatedAt: nowIso,
  active: true,
  demoMode,
  hasData: false,
  totals: zero(),
  campaigns: [],
  channelUrl: WHATSAPP_CHANNEL_URL,
})

function isWhatsApp(source: string | null, referrer: string | null, opts?: NormalizeOptions): boolean {
  return normalizeAcquisitionSource(source, referrer, opts) === 'whatsapp'
}

/**
 * Construit l'attribution WhatsApp first-party. PURE.
 * Reste ACTIVE même sans donnée (empty ≠ unavailable).
 */
export function buildWhatsAppAttribution(input: BuildWhatsAppAttributionInput): WhatsAppAttributionResult {
  const demoMode = input.demo === true || input.visits === null
  if (demoMode || !input.visits) return EMPTY(input.nowIso, true)
  const opts = input.normalizeOptions

  const totals = zero()
  const campaigns = new Map<string | null, WhatsAppCampaignRow>()

  const bump = (campaign: string | null, key: keyof WhatsAppCounts) => {
    totals[key] += 1
    const cur = campaigns.get(campaign) ?? { campaign, ...zero() }
    cur[key] += 1
    campaigns.set(campaign, cur)
  }

  for (const v of input.visits) {
    if (isWhatsApp(v.source, v.referrer, opts)) bump(v.utm_campaign ?? null, 'visits')
  }

  const applyConversion = (rows: ReadonlyArray<SessionSourceRow | null>, key: keyof WhatsAppCounts) => {
    for (const r of rows) {
      if (r && isWhatsApp(r.source, r.referrer, opts)) bump(r.utm_campaign ?? null, key)
    }
  }
  applyConversion(input.signupRows, 'signups')
  applyConversion(input.podcastRows, 'podcastStarts')
  applyConversion(input.parcoursRows, 'parcoursCompletions')

  const rows = Array.from(campaigns.values()).sort(
    (a, b) =>
      b.visits - a.visits ||
      b.signups - a.signups ||
      (a.campaign ?? '').localeCompare(b.campaign ?? ''),
  )

  return {
    generatedAt: input.nowIso,
    active: true,
    demoMode: false,
    hasData: totals.visits > 0,
    totals,
    campaigns: rows,
    channelUrl: WHATSAPP_CHANNEL_URL,
  }
}
