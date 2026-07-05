import { describe, it, expect } from 'vitest'
import { classifyActivity, repartition, bucketGrowth, isoWeekKey, INACTIVE_DAYS, engagementBand } from '@/lib/pastoral/metrics'

describe('engagementBand', () => {
  it('classe le score en bandes', () => {
    expect(engagementBand(0)).toBe('faible')
    expect(engagementBand(25)).toBe('faible')
    expect(engagementBand(26)).toBe('en croissance')
    expect(engagementBand(50)).toBe('en croissance')
    expect(engagementBand(51)).toBe('engagé')
    expect(engagementBand(75)).toBe('engagé')
    expect(engagementBand(76)).toBe('très engagé')
    expect(engagementBand(100)).toBe('très engagé')
  })
})

const NOW = Date.UTC(2026, 5, 1) // 2026-06-01

describe('classifyActivity', () => {
  it('jamais connecté', () => {
    expect(classifyActivity(null, NOW)).toBe('jamais')
    expect(classifyActivity('pas-une-date', NOW)).toBe('jamais')
  })
  it('actif si récent', () => {
    const recent = new Date(NOW - 5 * 86_400_000).toISOString()
    expect(classifyActivity(recent, NOW)).toBe('actif')
  })
  it('inactif au-delà du seuil', () => {
    const old = new Date(NOW - (INACTIVE_DAYS + 5) * 86_400_000).toISOString()
    expect(classifyActivity(old, NOW)).toBe('inactif')
  })
})

describe('repartition', () => {
  it('compte et trie décroissant, vides → —', () => {
    const r = repartition(
      [{ p: 'France' }, { p: 'France' }, { p: 'RDC' }, { p: '' }],
      (x) => x.p,
    )
    expect(r[0]).toEqual({ label: 'France', count: 2 })
    expect(r.find((x) => x.label === '—')?.count).toBe(1)
  })
})

describe('bucketGrowth', () => {
  it('groupe par mois', () => {
    const g = bucketGrowth(['2026-05-03', '2026-05-20', '2026-06-01', null, 'x'], 'month')
    expect(g).toEqual([
      { period: '2026-05', count: 2 },
      { period: '2026-06', count: 1 },
    ])
  })
  it('groupe par semaine ISO', () => {
    const g = bucketGrowth(['2026-06-01', '2026-06-02'], 'week')
    expect(g.length).toBe(1)
    expect(g[0].count).toBe(2)
  })
})

describe('isoWeekKey', () => {
  it('format YYYY-Sww', () => {
    expect(isoWeekKey(new Date('2026-01-05'))).toMatch(/^2026-S0\d$/)
  })
})
