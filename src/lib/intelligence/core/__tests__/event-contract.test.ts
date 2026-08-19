import { describe, it, expect } from 'vitest'
import {
  coverageSummary,
  eventGaps,
  eventsByAvailability,
  eventsByCategory,
  getEventContract,
} from '../event-contract'
import {
  EVENT_CONTRACT,
  FIRST_PARTY_EVENTS,
  isFirstPartyEvent,
} from '../../types/events'

describe('event-contract (lecture / normalisation)', () => {
  it('chaque événement canonique a une entrée cohérente et non vide', () => {
    for (const name of FIRST_PARTY_EVENTS) {
      const entry = getEventContract(name)
      expect(entry.name).toBe(name)
      expect(entry.sourceOfTruth.trim().length).toBeGreaterThan(0)
      expect(entry.note.trim().length).toBeGreaterThan(0)
    }
  })

  it('le contrat couvre EXACTEMENT le vocabulaire canonique (pas de dérive)', () => {
    expect(Object.keys(EVENT_CONTRACT).sort()).toEqual([...FIRST_PARTY_EVENTS].sort())
  })

  it('les gaps sont explicitement documentés (source = aucune)', () => {
    for (const e of eventGaps()) {
      expect(e.availability).toBe('gap')
    }
    // les paliers PDF progress/complete sont des gaps connus
    expect(eventGaps().map((e) => e.name)).toEqual(
      expect.arrayContaining(['pdf_progress', 'pdf_complete']),
    )
  })

  it('coverageSummary somme = total', () => {
    const s = coverageSummary()
    expect(s.available + s.partial + s.gap).toBe(s.total)
    expect(s.total).toBe(FIRST_PARTY_EVENTS.length)
  })

  it('eventsByCategory / eventsByAvailability filtrent correctement', () => {
    expect(eventsByCategory('podcast').map((e) => e.name)).toEqual(
      expect.arrayContaining(['podcast_play', 'podcast_complete']),
    )
    expect(eventsByAvailability('available').length).toBeGreaterThan(0)
  })

  it('isFirstPartyEvent garde le type', () => {
    expect(isFirstPartyEvent('page_view')).toBe(true)
    expect(isFirstPartyEvent('inconnu')).toBe(false)
  })
})
