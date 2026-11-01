import { describe, expect, it } from 'vitest'
import { selectFeaturedHomeEvent, type FeaturedHomeEvent } from './featured-event'

const now = Date.parse('2026-11-01T10:00:00Z')
const event = (overrides: Partial<FeaturedHomeEvent> = {}): FeaturedHomeEvent => ({
  id: 'a', title: 'Masterclass', status: 'published', is_featured: true, sort_order: 1,
  starts_at: '2026-11-14T19:30:00Z', ends_at: '2026-11-14T22:00:00Z', ...overrides,
})

describe('homepage featured event', () => {
  it('shows nothing without an explicit CMS selection', () => {
    expect(selectFeaturedHomeEvent([event({ is_featured: false })], now)).toBeNull()
    expect(selectFeaturedHomeEvent([], now)).toBeNull()
  })
  it('rejects drafts and expired events', () => {
    expect(selectFeaturedHomeEvent([event({ status: 'draft' })], now)).toBeNull()
    expect(selectFeaturedHomeEvent([event({ ends_at: '2026-10-31T00:00:00Z' })], now)).toBeNull()
  })
  it('keeps an ongoing event visible until ends_at', () => {
    expect(selectFeaturedHomeEvent([event({ starts_at: '2026-11-01T08:00:00Z', ends_at: '2026-11-01T12:00:00Z' })], now)?.id).toBe('a')
  })
  it('does not invent a duration when ends_at is absent', () => {
    expect(selectFeaturedHomeEvent([event({ starts_at: '2026-11-01T08:00:00Z', ends_at: null })], now)).toBeNull()
  })
  it('selects one candidate by CMS priority, then start date and id', () => {
    expect(selectFeaturedHomeEvent([event({ id: 'b', sort_order: 2 }), event({ id: 'a', sort_order: 1 })], now)?.id).toBe('a')
  })
})