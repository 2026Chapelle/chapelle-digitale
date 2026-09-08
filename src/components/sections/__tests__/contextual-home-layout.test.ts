import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/sections/ContextualHome.tsx'),
  'utf8',
)

describe('ContextualHome editorial layout', () => {
  it('keeps the primary journey card at natural height', () => {
    expect(source).toContain('today-layout-grid')
    expect(source).toContain('items-start')
    expect(source).toMatch(/today-primary-card[^"]*self-start/)
    expect(source).not.toContain('grid md:grid-cols-3 gap-4 items-stretch')
  })

  it('places primary, podcast, live and prayer in the intended mobile DOM order', () => {
    const primary = source.indexOf('today-primary-card')
    const podcast = source.indexOf('PODCAST')
    const live = source.indexOf('PROCHAIN RENDEZ-VOUS')
    const prayer = source.indexOf('ÊTRE ACCOMPAGNÉ')

    expect(primary).toBeGreaterThan(-1)
    expect(podcast).toBeGreaterThan(primary)
    expect(live).toBeGreaterThan(podcast)
    expect(prayer).toBeGreaterThan(live)
  })

  it('positions live below the primary card on desktop instead of inside the right support column', () => {
    expect(source).toContain('today-live-card')
    expect(source).toContain('md:col-span-2')
    expect(source).toContain('md:row-start-2')
    expect(source).toContain('md:col-start-1')
    expect(source).not.toContain('today-support-column')
  })

  it('keeps podcast top-right and prayer below it on desktop', () => {
    expect(source).toContain('today-podcast-card')
    expect(source).toContain('today-prayer-card')

    expect(source).toMatch(
      /today-podcast-card[^"]*md:col-start-3[^"]*md:row-start-1/
    )

    expect(source).toMatch(
      /today-prayer-card[^"]*md:col-start-3[^"]*md:row-start-2/
    )
  })

  it('renders the live card horizontally on desktop', () => {
    expect(source).toMatch(
      /today-live-card[^"]*md:grid[^"]*md:grid-cols-/
    )
  })

  it('preserves canonical live behavior', () => {
    expect(source).toContain("liveState.status !== 'OFFLINE'")
    expect(source).toContain("liveState.status === 'LIVE'")
    expect(source).toContain('href="/live"')
  })

  it('keeps pastoral buttons vertically aligned and equal width', () => {
    expect(source).toContain('pastoral-actions')
    expect(source).toMatch(
      /href="\/priere"[^>]*className="[^"]*md:w-\[240px\][^"]*"/
    )
    expect(source).toMatch(
      /href="\/contact"[^>]*className="[^"]*md:w-\[240px\][^"]*"/
    )
  })
})

describe('ContextualHome premium motion', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'src/styles/globals.css'),
    'utf8',
  )

  it('marks the main editorial cards as motion-enabled without changing their layout contract', () => {
    expect(source).toContain('home-motion-card')
    expect(source).toContain('today-primary-card')
    expect(source).toContain('today-podcast-card')
    expect(source).toContain('today-live-card')
    expect(source).toContain('today-prayer-card')
    expect(source).toContain('pastoral-actions')
  })

  it('uses IntersectionObserver to trigger entrance motion only when cards enter the viewport', () => {
    expect(source).toContain('IntersectionObserver')
    expect(source).toContain("querySelectorAll<HTMLElement>('.home-motion-card')")
    expect(source).toContain("classList.add('home-motion-enter')")
    expect(source).toContain('observer.unobserve')
  })

  it('keeps motion cards visible by default so JavaScript failure can never blank the Home', () => {
    expect(css).toMatch(
      /\.home-motion-card\s*\{[^}]*opacity:\s*1[^}]*transform:\s*none/
    )
    expect(css).not.toMatch(
      /\.home-motion-card\s*\{[^}]*opacity:\s*0/
    )
  })

  it('adds premium hover lift and border emphasis only for hover-capable pointers', () => {
    expect(css).toContain('(hover: hover)')
    expect(css).toContain('(pointer: fine)')
    expect(css).toMatch(
      /\.home-motion-card:hover\s*\{[^}]*translateY\(-5px\)/
    )
  })

  it('adds subtle image zoom and arrow movement on card hover', () => {
    expect(source).toContain('home-motion-image')
    expect(source).toContain('home-motion-arrow')
    expect(css).toMatch(
      /\.home-motion-card:hover\s+\.home-motion-image\s*\{[^}]*scale\(1\.03\)/
    )
    expect(css).toMatch(
      /\.home-motion-card:hover\s+\.home-motion-arrow\s*\{[^}]*translateX\(3px\)/
    )
  })

  it('gives the live card a dedicated restrained glow treatment', () => {
    expect(source).toContain('home-motion-live')
    expect(css).toContain('.home-motion-live')
  })

  it('fully respects reduced-motion preferences', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none\s*!important/
    )
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*transition:\s*none\s*!important/
    )
  })

  it('preserves the fail-open home reveal fix', () => {
    expect(css).toMatch(
      /\.home-reveal\s*\{[^}]*opacity:\s*1[^}]*transform:\s*translateY\(0\)/
    )
  })
})

describe('ContextualHome final CTA', () => {
  it('renders one centered final action before the footer', () => {
    expect(source).toContain('home-final-cta')
    expect(source).toContain('home-final-cta-action')
    expect(source).toContain('justify-center')
    expect(source).toContain('btn-gold-cinematic')
  })

  it('sends visitors to /rejoindre', () => {
    expect(source).toMatch(
      /home-final-cta[\s\S]*href=\{authenticated \?[^:]+:\s*'\/rejoindre'\}/
    )
  })

  it('sends authenticated members to their next action or dashboard', () => {
    expect(source).toMatch(
      /home-final-cta[\s\S]*memberNextAction\?\.href\s*\|\|\s*'\/member\/dashboard'/
    )
  })

  it('uses the correct label for visitors and authenticated members', () => {
    expect(source).toMatch(
      /home-final-cta[\s\S]*authenticated\s*\?\s*'ENTRER DANS MA CITADELLE'\s*:\s*'COMMENCER MAINTENANT'/
    )
  })

  it('keeps the existing animated arrow treatment', () => {
    expect(source).toMatch(
      /home-final-cta[\s\S]*home-motion-arrow/
    )
  })
})

describe('ContextualHome offline editorial fallback', () => {
  it('derives live availability from the canonical state', () => {
    expect(source).toContain(
      "const hasLive = liveState.status !== 'OFFLINE'"
    )
  })

  it('does not keep podcast and prayer inside a nested offline support column', () => {
    expect(source).not.toContain('today-support-shell')
    expect(source).not.toContain('today-offline-support-column')
  })

  it('keeps podcast top-right while offline', () => {
    expect(source).toContain(
      'today-podcast-card today-support-card home-motion-card self-start md:col-start-3 md:row-start-1'
    )
  })

  it('moves prayer to a full-width second row while offline', () => {
    expect(source).toContain('today-prayer-offline-row')
    expect(source).toContain(
      'md:col-span-3 md:col-start-1 md:row-start-2'
    )
  })

  it('renders the offline prayer card as a compact horizontal accompaniment card on desktop', () => {
    expect(source).toContain('today-prayer-offline-content')
    expect(source).toContain(
      'md:flex md:items-center md:justify-between'
    )
  })

  it('keeps the live card conditional on canonical live availability', () => {
    expect(source).toContain(
      '{hasLive && <article className="today-live-card'
    )
  })

  it('preserves the live-state prayer position in the right column', () => {
    expect(source).toContain(
      'today-prayer-live-row'
    )
    expect(source).toContain(
      'md:col-start-3 md:row-start-2'
    )
  })
})
