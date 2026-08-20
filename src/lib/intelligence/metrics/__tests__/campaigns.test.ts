import { describe, it, expect } from 'vitest'
import { buildCampaigns, type RawCampaignVisit } from '../campaigns'
import type { SessionSourceRow } from '../../attribution/resolve'

const NOW = '2026-08-20T18:00:00.000Z'

const VISITS: RawCampaignVisit[] = [
  { source: 'whatsapp', referrer: '', utm_campaign: 'culte_20260823', utm_medium: 'channel', utm_content: 'main_cta' },
  { source: 'whatsapp', referrer: '', utm_campaign: 'culte_20260823', utm_medium: 'channel', utm_content: 'reminder' },
  { source: 'facebook', referrer: '', utm_campaign: 'culte_20260823', utm_medium: 'social', utm_content: 'reel' },
  { source: 'direct', referrer: '', utm_campaign: null, utm_medium: null, utm_content: null },
  { source: 'referral', referrer: 'https://citadelle.chapelleduroyaume.org/x', utm_campaign: 'x', utm_medium: null, utm_content: null }, // internal
]

const sess = (over: Partial<SessionSourceRow>): SessionSourceRow => ({
  session_key: 'k', user_id: null, source: 'whatsapp', referrer: '', first_seen: '2026-08-20T08:00:00.000Z',
  utm_campaign: 'culte_20260823', utm_medium: 'channel', utm_content: 'main_cta', ...over,
})

function row(res: ReturnType<typeof buildCampaigns>, source: string, campaign: string | null) {
  return res.rows.find((r) => r.source === source && r.campaign === campaign)
}

describe('buildCampaigns', () => {
  const res = buildCampaigns({
    visits: VISITS,
    signupRows: [sess({}), null], // 1 attribué (whatsapp/culte), 1 non attribué
    podcastRows: [sess({})], // 1 attribué whatsapp/culte
    parcoursRows: [null], // non attribué
    nowIso: NOW,
  })

  it('exclut la nav interne et la reporte', () => {
    expect(res.internalVisitsExcluded).toBe(1)
    expect(res.rows.some((r) => r.source === ('internal' as never))).toBe(false)
  })

  it('MULTI_SOURCE_CAMPAIGN : même campagne sur whatsapp ET facebook = 2 lignes distinctes', () => {
    expect(row(res, 'whatsapp', 'culte_20260823')).toBeDefined()
    expect(row(res, 'facebook', 'culte_20260823')).toBeDefined()
  })

  it('CAMPAIGN_GROUPING_DETERMINISTIC : agrège visites + conversions + contenus', () => {
    const wa = row(res, 'whatsapp', 'culte_20260823')!
    expect(wa.visits).toBe(2)
    expect(wa.signups).toBe(1)
    expect(wa.podcastStarts).toBe(1)
    expect(wa.medium).toBe('social') // channel → social
    // contenus : main_cta (1 visite + 1 signup + 1 podcast) et reminder (1 visite)
    const main = wa.contents.find((c) => c.content === 'main_cta')!
    expect(main.visits).toBe(1)
    expect(main.signups).toBe(1)
    expect(wa.contents.find((c) => c.content === 'reminder')!.visits).toBe(1)
  })

  it('DIRECT_WITHOUT_CAMPAIGN + OLD_SESSION_WITH_NULL_CAMPAIGN : ligne (source, null)', () => {
    const direct = row(res, 'direct', null)!
    expect(direct.visits).toBe(1)
    expect(direct.campaign).toBeNull()
  })

  it('UNATTRIBUTED_CONVERSIONS_PRESERVED', () => {
    expect(res.unattributed).toEqual({ signups: 1, podcastStarts: 0, parcoursCompletions: 1 })
  })

  it('NO conversion-rate field on rows (cohortes différentes)', () => {
    for (const r of res.rows) {
      expect(r).not.toHaveProperty('signupRate')
      expect(r).not.toHaveProperty('conversionRate')
    }
  })

  it('tri : campagnes nommées avant les lignes sans campagne', () => {
    const lastNamed = res.rows.findIndex((r) => r.campaign === null)
    // toutes les lignes null sont après les lignes nommées
    const firstNull = res.rows.findIndex((r) => r.campaign === null)
    expect(res.rows.slice(firstNull).every((r) => r.campaign === null)).toBe(true)
    expect(lastNamed).toBeGreaterThan(0)
  })

  it('mode démo (visits=null) : demoMode, hasData faux, lignes vides', () => {
    const r = buildCampaigns({ visits: null, signupRows: [], podcastRows: [], parcoursRows: [], nowIso: NOW })
    expect(r.demoMode).toBe(true)
    expect(r.hasData).toBe(false)
    expect(r.rows).toEqual([])
  })

  it('totaux = somme des visites', () => {
    expect(res.totals.visits).toBe(4) // 2 wa + 1 fb + 1 direct (internal exclu)
    expect(res.hasData).toBe(true)
  })

  it('NO_PII_IN_CAMPAIGN_DTO : les lignes/contenus ne portent que source+campagne+medium+compteurs', () => {
    const allowedRow = ['campaign', 'contents', 'medium', 'parcoursCompletions', 'podcastStarts', 'signups', 'source', 'visits'].sort()
    const allowedContent = ['content', 'parcoursCompletions', 'podcastStarts', 'signups', 'visits'].sort()
    for (const r of res.rows) {
      expect(Object.keys(r).sort()).toEqual(allowedRow)
      for (const c of r.contents) expect(Object.keys(c).sort()).toEqual(allowedContent)
    }
    // aucune clé PII (user_id / session_key / referrer / ville)
    const json = JSON.stringify(res)
    for (const k of ['user_id', 'session_key', 'referrer', 'ville']) expect(json).not.toContain(k)
  })
})
