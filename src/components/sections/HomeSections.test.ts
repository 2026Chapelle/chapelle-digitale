import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/sections/HomeSections.tsx'), 'utf8')

describe('HomeSections live + featured contract', () => {
  it('uses the canonical live resolver instead of a duplicated YouTube/CMS selection', () => {
    expect(source).toContain("import { getCanonicalLiveState } from '@/lib/live/canonical-server'")
    expect(source).toContain('await getCanonicalLiveState()')
    expect(source).not.toContain('detectYouTubeLive')
    expect(source).not.toContain('resolveLiveState(')
  })

  it('keeps the Featured Event V1 editorial selection and props', () => {
    expect(source).toContain("import { selectFeaturedHomeEvent, type FeaturedHomeEvent } from '@/lib/home/featured-event'")
    expect(source).toContain("cmsList<FeaturedHomeEvent>('cms_events'")
    expect(source).toContain('filter: { is_featured: true }')
    expect(source).toContain('<ContextualHome liveState={liveState} featuredEvent={featuredEvent} />')
  })

  it('keeps the CITADELLE_TEST_MODE live fixtures for recette', () => {
    for (const state of ['UPCOMING', 'LIVE', 'OFFLINE']) expect(source).toContain(`testState === '${state}'`)
  })
})
