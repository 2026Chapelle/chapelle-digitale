import { describe, it, expect } from 'vitest'
import { isLiveType, LIVE_NOTIF_TYPES } from '@/lib/live-sound'

describe('isLiveType', () => {
  it('reconnaît les types live', () => {
    expect(isLiveType('live')).toBe(true)
    expect(isLiveType('live_now')).toBe(true)
    expect(isLiveType('live_starting')).toBe(true)
  })
  it('rejette les autres types', () => {
    expect(isLiveType('formation')).toBe(false)
    expect(isLiveType('priere')).toBe(false)
    expect(isLiveType('')).toBe(false)
    expect(isLiveType(null)).toBe(false)
    expect(isLiveType(undefined)).toBe(false)
  })
  it('référentiel cohérent', () => {
    expect(LIVE_NOTIF_TYPES).toContain('live_now')
    expect(LIVE_NOTIF_TYPES.every((t) => isLiveType(t))).toBe(true)
  })
})
