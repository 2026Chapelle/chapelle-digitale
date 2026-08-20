import { describe, it, expect } from 'vitest'
import { buildCampaignUrl } from '../campaign-url'

describe('buildCampaignUrl', () => {
  it('BUILD_CAMPAIGN_URL_ENCODES_VALUES : ajoute et encode les UTM', () => {
    const url = buildCampaignUrl({
      url: 'https://citadelle.chapelleduroyaume.org/',
      source: 'whatsapp',
      medium: 'channel',
      campaign: 'culte 20260823',
      content: 'main_cta',
    })
    const u = new URL(url)
    expect(u.searchParams.get('utm_source')).toBe('whatsapp')
    expect(u.searchParams.get('utm_medium')).toBe('channel')
    expect(u.searchParams.get('utm_campaign')).toBe('culte 20260823') // décodé par URL
    expect(url).toContain('utm_campaign=culte+20260823') // encodé dans la chaîne
    expect(u.searchParams.get('utm_content')).toBe('main_cta')
  })

  it('BUILD_CAMPAIGN_URL_PRESERVES_EXISTING_QUERY', () => {
    const url = buildCampaignUrl({ url: 'https://x.org/p?ref=abc', source: 'facebook' })
    const u = new URL(url)
    expect(u.searchParams.get('ref')).toBe('abc')
    expect(u.searchParams.get('utm_source')).toBe('facebook')
  })

  it("n'ajoute pas de champ vide", () => {
    const url = buildCampaignUrl({ url: 'https://x.org/', source: 'youtube', campaign: '', content: '   ' })
    const u = new URL(url)
    expect(u.searchParams.get('utm_source')).toBe('youtube')
    expect(u.searchParams.has('utm_campaign')).toBe(false)
    expect(u.searchParams.has('utm_content')).toBe(false)
  })

  it('refuse les URLs dangereuses (non http/https) et invalides', () => {
    expect(() => buildCampaignUrl({ url: 'javascript:alert(1)', source: 'x' })).toThrow()
    expect(() => buildCampaignUrl({ url: 'data:text/html,x', source: 'x' })).toThrow()
    expect(() => buildCampaignUrl({ url: 'pas une url', source: 'x' })).toThrow(/invalide/)
  })
})
