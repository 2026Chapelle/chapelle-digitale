import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { ChannelStatus } from '@/lib/intelligence/channels/types'
import type { SeoConnectorStatus } from '@/lib/intelligence/seo/types'

vi.mock('server-only', () => ({}))

const isAdminRequest = vi.fn((..._a: unknown[]) => true)
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: (...a: unknown[]) => isAdminRequest(...a) }))

// Connecteurs mockés : la route ne doit dépendre d'aucun réseau/credential.
const getSearchConsoleSeo = vi.fn()
const getGa4OrganicSeo = vi.fn()
const getYouTubeStatus = vi.fn()
const getMetaFacebookStatus = vi.fn()
const getMetaInstagramStatus = vi.fn()
const getWhatsAppStatus = vi.fn()

vi.mock('@/lib/intelligence/connectors/google-search-console', () => ({
  getSearchConsoleSeo: (...a: unknown[]) => getSearchConsoleSeo(...a),
}))
vi.mock('@/lib/intelligence/connectors/google-analytics', () => ({
  getGa4OrganicSeo: (...a: unknown[]) => getGa4OrganicSeo(...a),
}))
vi.mock('@/lib/intelligence/connectors/youtube', () => ({
  getYouTubeStatus: (...a: unknown[]) => getYouTubeStatus(...a),
}))
vi.mock('@/lib/intelligence/connectors/meta', () => ({
  getMetaFacebookStatus: (...a: unknown[]) => getMetaFacebookStatus(...a),
  getMetaInstagramStatus: (...a: unknown[]) => getMetaInstagramStatus(...a),
}))
vi.mock('@/lib/intelligence/connectors/whatsapp', () => ({
  getWhatsAppStatus: (...a: unknown[]) => getWhatsAppStatus(...a),
}))

import {
  GET,
  mapSeoStateToChannelState,
  mapSeoStatusToChannel,
  firstPartyStatus,
} from '@/app/api/intelligence/status/route'

const NOW = '2026-08-22T10:00:00.000Z'

function seoStatus(state: SeoConnectorStatus['state'], extra: Partial<SeoConnectorStatus> = {}): SeoConnectorStatus {
  return { connector: 'google_search_console', state, configured: state !== 'NOT_CONFIGURED', checkedAt: NOW, ...extra }
}

function channelStub(channel: ChannelStatus['channel'], state: ChannelStatus['state']): ChannelStatus {
  return {
    channel,
    displayName: channel,
    state,
    freshness: 'SYNCED',
    lastSync: state === 'ACTIVE' || state === 'CONNECTED' ? NOW : null,
    checkedAt: NOW,
  }
}

function req(url = 'http://localhost/api/intelligence/status') {
  return new NextRequest(url, { method: 'GET' })
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequest.mockReturnValue(true)
  getSearchConsoleSeo.mockResolvedValue({ status: seoStatus('PASS', { property: 'sc-domain:example.org' }) })
  getGa4OrganicSeo.mockResolvedValue({ status: { connector: 'google_analytics', state: 'PASS', configured: true, checkedAt: NOW } })
  getYouTubeStatus.mockResolvedValue(channelStub('youtube', 'NOT_CONFIGURED'))
  getMetaFacebookStatus.mockResolvedValue(channelStub('meta_facebook', 'NOT_CONFIGURED'))
  getMetaInstagramStatus.mockResolvedValue(channelStub('meta_instagram', 'NOT_CONFIGURED'))
  getWhatsAppStatus.mockResolvedValue(channelStub('whatsapp', 'ACTIVE'))
})

describe('mapSeoStateToChannelState — mapping pur', () => {
  it('PASS → CONNECTED', () => expect(mapSeoStateToChannelState('PASS')).toBe('CONNECTED'))
  it('NOT_CONFIGURED → NOT_CONFIGURED', () => expect(mapSeoStateToChannelState('NOT_CONFIGURED')).toBe('NOT_CONFIGURED'))
  it('ERROR → ERROR', () => expect(mapSeoStateToChannelState('ERROR')).toBe('ERROR'))
})

describe('mapSeoStatusToChannel — statut normalisé', () => {
  it('CONNECTED porte lastSync + property, sans setupRequired', () => {
    const c = mapSeoStatusToChannel(seoStatus('PASS', { property: 'sc-domain:x' }), 'google_search_console', 'GSC', 'SEO_DELAYED', NOW)
    expect(c.state).toBe('CONNECTED')
    expect(c.lastSync).toBe(NOW)
    expect(c.property).toBe('sc-domain:x')
    expect(c.setupRequired).toBe(false)
    expect(c.freshness).toBe('SEO_DELAYED')
  })
  it('NOT_CONFIGURED → setupRequired, lastSync null', () => {
    const c = mapSeoStatusToChannel(seoStatus('NOT_CONFIGURED', { reason: 'credentials absents' }), 'google_analytics', 'GA4', 'SYNCED', NOW)
    expect(c.state).toBe('NOT_CONFIGURED')
    expect(c.setupRequired).toBe(true)
    expect(c.lastSync).toBeNull()
    expect(c.reason).toBe('credentials absents')
  })
  it('ERROR → lastSync null', () => {
    const c = mapSeoStatusToChannel(seoStatus('ERROR', { reason: 'gsc_http_403' }), 'google_search_console', 'GSC', 'SEO_DELAYED', NOW)
    expect(c.state).toBe('ERROR')
    expect(c.lastSync).toBeNull()
    expect(c.reason).toBe('gsc_http_403')
  })
})

describe('firstPartyStatus', () => {
  it('est ACTIVE et REALTIME', () => {
    const c = firstPartyStatus(NOW)
    expect(c.channel).toBe('first_party')
    expect(c.state).toBe('ACTIVE')
    expect(c.freshness).toBe('REALTIME')
    expect(c.lastSync).toBe(NOW)
  })
})

describe('GET /api/intelligence/status — auth + agrégation', () => {
  it('non-admin → 401', async () => {
    isAdminRequest.mockReturnValue(false)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('admin → rapport avec les 7 canaux', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.generatedAt).toBe('string')
    const ids = body.channels.map((c: ChannelStatus) => c.channel)
    expect(ids).toEqual([
      'first_party', 'google_search_console', 'google_analytics',
      'youtube', 'meta_facebook', 'meta_instagram', 'whatsapp',
    ])
    const gsc = body.channels.find((c: ChannelStatus) => c.channel === 'google_search_console')
    expect(gsc.state).toBe('CONNECTED')
  })

  it('une source qui throw → ce canal ERROR, la route ne throw pas', async () => {
    getSearchConsoleSeo.mockRejectedValue(new Error('boom'))
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    const gsc = body.channels.find((c: ChannelStatus) => c.channel === 'google_search_console')
    expect(gsc.state).toBe('ERROR')
    expect(gsc.lastSync).toBeNull()
    // Les autres canaux restent lus normalement.
    const wa = body.channels.find((c: ChannelStatus) => c.channel === 'whatsapp')
    expect(wa.state).toBe('ACTIVE')
  })

  it('aucun secret dans la sortie', async () => {
    getSearchConsoleSeo.mockResolvedValue({ status: seoStatus('PASS', { property: 'sc-domain:x' }) })
    const res = await GET(req())
    const raw = JSON.stringify(await res.json()).toLowerCase()
    expect(raw).not.toContain('private_key')
    expect(raw).not.toContain('access_token')
    expect(raw).not.toContain('bearer ')
  })
})
