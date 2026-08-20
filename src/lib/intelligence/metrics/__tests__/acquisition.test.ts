import { describe, it, expect } from 'vitest'
import { buildAcquisition } from '../acquisition'
import type { NormalizedSource } from '../../attribution/normalize'

const NOW = '2026-08-19T18:00:00.000Z'

const VISITS = [
  { source: 'whatsapp', referrer: '' },
  { source: 'whatsapp', referrer: '' },
  { source: 'direct', referrer: '' },
  { source: 'referral', referrer: 'https://citadelle.chapelleduroyaume.org/x' }, // → internal
]
const SIGNUPS: (NormalizedSource | null)[] = ['whatsapp', null, 'direct']
const PODCAST: (NormalizedSource | null)[] = ['whatsapp', 'whatsapp', null]
const PARCOURS: (NormalizedSource | null)[] = [null]

function row(res: ReturnType<typeof buildAcquisition>, source: string) {
  return res.rows.find((r) => r.source === source)
}

describe('buildAcquisition (source × conversions)', () => {
  const res = buildAcquisition({ visits: VISITS, signupSources: SIGNUPS, podcastSources: PODCAST, parcoursSources: PARCOURS, nowIso: NOW })

  it('exclut la nav interne des lignes mais la reporte', () => {
    expect(res.rows.some((r) => r.source === ('internal' as NormalizedSource))).toBe(false)
    expect(res.internalVisitsExcluded).toBe(1)
  })

  it('agrège visites + conversions par source, NO_DOUBLE_COUNTING', () => {
    const wa = row(res, 'whatsapp')!
    expect(wa.visits).toBe(2)
    expect(wa.signups).toBe(1)
    expect(wa.podcastStarts).toBe(2)
    const direct = row(res, 'direct')!
    expect(direct.visits).toBe(1)
    expect(direct.signups).toBe(1)
    // totaux = somme des lignes (aucune double comptage)
    expect(res.totals).toEqual({ visits: 3, signups: 2, podcastStarts: 2, parcoursCompletions: 0 })
  })

  it('NO_PII_IN_ATTRIBUTION : les lignes ne portent que source + compteurs (aucune PII)', () => {
    for (const r of res.rows) {
      expect(Object.keys(r).sort()).toEqual(
        ['parcoursCompletions', 'podcastStarts', 'signups', 'source', 'visits'].sort(),
      )
    }
  })

  it('reporte les conversions non attribuées (null OU internal)', () => {
    expect(res.unattributed).toEqual({ signups: 1, podcastStarts: 1, parcoursCompletions: 1 })
  })

  it('tri par visites décroissantes ; hasData vrai', () => {
    expect(res.rows[0].source).toBe('whatsapp')
    expect(res.hasData).toBe(true)
  })

  it('une conversion résolue en internal compte comme non attribuée (ne disparaît pas)', () => {
    const r = buildAcquisition({ visits: [{ source: 'whatsapp', referrer: '' }], signupSources: ['internal' as NormalizedSource, 'whatsapp'], podcastSources: [], parcoursSources: [], nowIso: NOW })
    expect(r.unattributed.signups).toBe(1)
    expect(row(r, 'whatsapp')!.signups).toBe(1)
  })

  it('mode démo (visits=null) : demoMode, hasData faux, lignes vides', () => {
    const r = buildAcquisition({ visits: null, signupSources: [], podcastSources: [], parcoursSources: [], nowIso: NOW })
    expect(r.demoMode).toBe(true)
    expect(r.hasData).toBe(false)
    expect(r.rows).toEqual([])
  })
})
