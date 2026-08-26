import { describe, expect, it, vi } from 'vitest'

const cmsList = vi.hoisted(() => vi.fn())
vi.mock('@/lib/cms', () => ({ cmsList: (...args: unknown[]) => cmsList(...args) }))

import { loadEditorialContentSources } from './content-sources'

describe('loadEditorialContentSources', () => {
  it('maps available CMS rows while tolerating an unavailable table', async () => {
    cmsList.mockImplementation((table: string) => Promise.resolve(table === 'cms_lives' ? [{ id: 'l1', title: 'Live', status: 'live' }] : table === 'cms_articles' ? [{ id: 'a1', title: 'Article', slug: 'article', status: 'published' }, { id: 'a2', title: 'Sans slug', status: 'published' }] : [{ id: 'p1', title: 'Podcast', status: 'published' }]))
    const sources = await loadEditorialContentSources()
    expect(sources.map((source) => source.entity.type)).toEqual(['live', 'article', 'article', 'podcast'])
    expect(sources.map((source) => source.entity.canonical_slug)).toEqual([null, 'article', null, null])
  })
})
