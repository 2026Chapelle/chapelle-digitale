import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppAttribution,
  getWhatsAppStatus,
  WHATSAPP_CHANNEL_URL,
} from '../index'
import { getWhatsAppCloudStatus } from '../index'
import type { RawCampaignVisit } from '../../../metrics/campaigns'
import type { SessionSourceRow } from '../../../attribution/resolve'

const NOW = '2026-08-22T10:00:00.000Z'

const visit = (over: Partial<RawCampaignVisit>): RawCampaignVisit => ({
  source: 'whatsapp', referrer: '', utm_campaign: null, utm_medium: 'channel', utm_content: null, ...over,
})
const sess = (over: Partial<SessionSourceRow>): SessionSourceRow => ({
  session_key: 'k', user_id: null, source: 'whatsapp', referrer: '', first_seen: '2026-08-20T08:00:00.000Z',
  utm_campaign: null, utm_medium: 'channel', utm_content: null, ...over,
})

describe('whatsapp · statut', () => {
  it('ACTIVE (first-party) sans réseau ni secret', async () => {
    const s = await getWhatsAppStatus(NOW)
    expect(s.state).toBe('ACTIVE')
    expect(s.channel).toBe('whatsapp')
    expect(s.lastSync).toBe(NOW)
  })
  it('Cloud API = OPTIONAL, non bloquant', () => {
    expect(getWhatsAppCloudStatus().state).toBe('OPTIONAL')
  })
})

describe('whatsapp · attribution first-party', () => {
  it('démo si visits null (mais reste actif)', () => {
    const r = buildWhatsAppAttribution({ visits: null, signupRows: [], podcastRows: [], parcoursRows: [], nowIso: NOW })
    expect(r.demoMode).toBe(true)
    expect(r.active).toBe(true)
    expect(r.hasData).toBe(false)
    expect(r.channelUrl).toBe(WHATSAPP_CHANNEL_URL)
  })

  it('attribution par UTM (utm_source=whatsapp)', () => {
    const r = buildWhatsAppAttribution({
      visits: [visit({ utm_campaign: 'culte_20260823' }), visit({ utm_campaign: 'culte_20260823' })],
      signupRows: [sess({ utm_campaign: 'culte_20260823' })],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.totals.visits).toBe(2)
    expect(r.totals.signups).toBe(1)
    expect(r.hasData).toBe(true)
    const camp = r.campaigns.find((c) => c.campaign === 'culte_20260823')
    expect(camp?.visits).toBe(2)
    expect(camp?.signups).toBe(1)
  })

  it('attribution depuis le CANAL WhatsApp (detectSource a stocké source=whatsapp à l’ingestion)', () => {
    // Réalité du pipeline : detectSource() mappe un referrer whatsapp.com/channel/… vers
    // source='whatsapp' AU MOMENT de l'ingestion. Le read-layer préserve donc 'whatsapp'.
    const r = buildWhatsAppAttribution({
      visits: [visit({ source: 'whatsapp', referrer: 'https://whatsapp.com/channel/0029VbCGBmkH5JLuUSYkax3B' })],
      signupRows: [],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.totals.visits).toBe(1)
  })

  it('ignore les sources non-whatsapp', () => {
    const r = buildWhatsAppAttribution({
      visits: [visit({ source: 'facebook', referrer: 'https://facebook.com' }), visit({})],
      signupRows: [],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.totals.visits).toBe(1)
  })

  it('conversions directes non whatsapp non comptées', () => {
    const r = buildWhatsAppAttribution({
      visits: [visit({})],
      signupRows: [sess({ source: 'direct', referrer: '' })],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.totals.signups).toBe(0)
  })

  it('vide (0 réel) ≠ indisponible : hasData=false mais non-démo', () => {
    const r = buildWhatsAppAttribution({
      visits: [visit({ source: 'direct', referrer: '' })], // aucune visite whatsapp
      signupRows: [],
      podcastRows: [],
      parcoursRows: [],
      nowIso: NOW,
    })
    expect(r.demoMode).toBe(false)
    expect(r.hasData).toBe(false)
    expect(r.totals.visits).toBe(0)
  })
})
