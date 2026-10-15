import { describe, expect, it } from 'vitest'

import { dayFallbackVisual, initialMahanaimDayId, moveFocusToReadingPanel } from './MahanaimRetreatJourney'

describe('initialMahanaimDayId', () => {
  it('selects the first unlocked day so the panel never starts on protected content', () => {
    expect(initialMahanaimDayId([
      { id: 'day-1', isUnlocked: false },
      { id: 'day-2', isUnlocked: true },
      { id: 'day-3', isUnlocked: true },
    ])).toBe('day-2')
  })

  it('keeps the journey usable when all days are locked', () => {
    expect(initialMahanaimDayId([{ id: 'day-1', isUnlocked: false }])).toBe('day-1')
  })
})

describe('dayFallbackVisual', () => {
  it('gives each fallback image a coherent but distinct visual identity', () => {
    expect(dayFallbackVisual(1)).toEqual({ icon: '✦', accent: 'amber' })
    expect(dayFallbackVisual(2)).toEqual({ icon: '☀', accent: 'rose' })
    expect(dayFallbackVisual(3)).toEqual({ icon: '◒', accent: 'violet' })
    expect(dayFallbackVisual(11)).toEqual({ icon: '✦', accent: 'amber' })
  })

  it('provides ten distinct themed fallback illustrations before repeating', () => {
    const icons = Array.from({ length: 10 }, (_, index) => dayFallbackVisual(index + 1).icon)
    expect(new Set(icons).size).toBe(10)
  })
})

describe('moveFocusToReadingPanel', () => {
  it('smoothly reveals the selected reading panel and moves keyboard focus to it', () => {
    const calls: string[] = []
    const panel = {
      scrollIntoView: (options: ScrollIntoViewOptions) => { calls.push(`scroll:${options.behavior}:${options.block}`) },
      focus: (options?: FocusOptions) => { calls.push(`focus:${options?.preventScroll}`) },
    }

    moveFocusToReadingPanel(panel)

    expect(calls).toEqual(['scroll:smooth:start', 'focus:true'])
  })
})
