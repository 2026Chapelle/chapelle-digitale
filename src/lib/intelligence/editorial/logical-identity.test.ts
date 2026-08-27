import { describe, expect, it } from 'vitest'
import { buildEditorialLogicalIdentity } from './logical-identity'

describe('buildEditorialLogicalIdentity', () => {
  const base = {
    organizationId: 'org_01',
    recommendationKind: 'REPURPOSE',
    contentKind: 'article',
    targetChannel: 'web',
    sourceContentId: 'source_01',
  }

  it('is stable across rolling windows and persisted scheduling dates', () => {
    const yesterday = {
      ...base,
      windowStart: '2026-08-26',
      windowEnd: '2026-09-24',
      scheduledFor: '2026-08-26',
    }
    const today = {
      ...base,
      windowStart: '2026-08-27',
      windowEnd: '2026-09-25',
      scheduledFor: '2026-08-27',
    }

    expect(buildEditorialLogicalIdentity(yesterday))
      .toBe(buildEditorialLogicalIdentity(today))
  })

  it('keeps different sources, actions, content kinds, and channels distinct', () => {
    const identity = buildEditorialLogicalIdentity(base)
    expect(buildEditorialLogicalIdentity({ ...base, sourceContentId: 'source_02' })).not.toBe(identity)
    expect(buildEditorialLogicalIdentity({ ...base, recommendationKind: 'PROMOTE' })).not.toBe(identity)
    expect(buildEditorialLogicalIdentity({ ...base, contentKind: 'podcast' })).not.toBe(identity)
    expect(buildEditorialLogicalIdentity({ ...base, targetChannel: 'whatsapp' })).not.toBe(identity)
  })

  it('uses a stable signal source identity without rolling dates', () => {
    const original = {
      ...base,
      sourceContentId: null,
      sourceSnapshot: { signalKeys: ['seo:create:article'] },
    }

    const nextWindow = {
      ...original,
      windowStart: '2026-08-27',
    }

    expect(buildEditorialLogicalIdentity(original))
      .toBe(buildEditorialLogicalIdentity(nextWindow))
  })
})
