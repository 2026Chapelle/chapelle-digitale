import { describe, it, expect } from 'vitest'
import {
  readJourneyFields,
  hasJourney,
  humanizeKey,
  journeyStatusLabel,
  journeyStepLabel,
  fmtWhen,
  isFollowUpOverdue,
  eventLine,
  normalizeEvents,
  FALLBACK_NO_JOURNEY,
  type NewcomerJourneyStep,
} from '@/lib/pastoral/newcomer-journey-model'

const NOW = Date.parse('2026-07-09T12:00:00.000Z')

describe('readJourneyFields (tolérant)', () => {
  it('extrait les champs présents, null sinon', () => {
    const f = readJourneyFields({ journey_step_key: 'first_contact', journey_status: 'in_progress', follow_up_due_at: '2026-07-12T10:00:00Z' })
    expect(f.journey_step_key).toBe('first_contact')
    expect(f.journey_status).toBe('in_progress')
    expect(f.follow_up_due_at).toBe('2026-07-12T10:00:00Z')
    expect(f.last_contacted_at).toBeNull()
    expect(f.journey_completed_at).toBeNull()
  })
  it('objet vide / null / non-objet → tout null', () => {
    for (const x of [null, undefined, 42, 'x', []]) {
      const f = readJourneyFields(x)
      expect(f.journey_step_key).toBeNull()
      expect(f.journey_status).toBeNull()
    }
  })
  it('champs vides/espaces → null', () => {
    const f = readJourneyFields({ journey_step_key: '   ', journey_status: '' })
    expect(f.journey_step_key).toBeNull()
    expect(f.journey_status).toBeNull()
  })
})

describe('hasJourney', () => {
  it('true si étape ou statut', () => {
    expect(hasJourney(readJourneyFields({ journey_status: 'in_progress' }))).toBe(true)
    expect(hasJourney(readJourneyFields({ journey_step_key: 'welcome' }))).toBe(true)
  })
  it('false si rien', () => {
    expect(hasJourney(readJourneyFields({}))).toBe(false)
  })
})

describe('humanizeKey', () => {
  it('remplace séparateurs + capitalise', () => {
    expect(humanizeKey('first_contact')).toBe('First contact')
    expect(humanizeKey('welcome-message')).toBe('Welcome message')
    expect(humanizeKey('')).toBe('')
    expect(humanizeKey(null)).toBe('')
  })
})

describe('journeyStatusLabel', () => {
  it('libellé FR connu', () => {
    expect(journeyStatusLabel('in_progress')).toBe('En cours')
    expect(journeyStatusLabel('completed')).toBe('Terminé')
  })
  it('statut inconnu → humanisé', () => {
    expect(journeyStatusLabel('foo_bar')).toBe('Foo bar')
  })
  it('absent → fallback sobre', () => {
    expect(journeyStatusLabel(null)).toBe(FALLBACK_NO_JOURNEY)
  })
})

describe('journeyStepLabel', () => {
  it('utilise le catalogue si présent', () => {
    const cat: NewcomerJourneyStep[] = [{ key: 'welcome', label: 'Accueil chaleureux' }]
    expect(journeyStepLabel('welcome', cat)).toBe('Accueil chaleureux')
  })
  it('humanise si pas de catalogue', () => {
    expect(journeyStepLabel('pastoral_need')).toBe('Pastoral need')
  })
  it('absent → fallback', () => {
    expect(journeyStepLabel(null)).toBe(FALLBACK_NO_JOURNEY)
  })
})

describe('fmtWhen', () => {
  it('date invalide/absente → fallback', () => {
    expect(fmtWhen(null, '—')).toBe('—')
    expect(fmtWhen('pas-une-date', 'x')).toBe('x')
  })
  it('date valide → chaîne non vide', () => {
    expect(fmtWhen('2026-07-09T12:00:00Z').length).toBeGreaterThan(0)
  })
})

describe('isFollowUpOverdue', () => {
  it('passée → true, future → false, absente → false', () => {
    expect(isFollowUpOverdue(readJourneyFields({ follow_up_due_at: '2026-07-01T00:00:00Z' }), NOW)).toBe(true)
    expect(isFollowUpOverdue(readJourneyFields({ follow_up_due_at: '2026-07-20T00:00:00Z' }), NOW)).toBe(false)
    expect(isFollowUpOverdue(readJourneyFields({}), NOW)).toBe(false)
  })
})

describe('eventLine + normalizeEvents (tolérant au schéma)', () => {
  it('lit label + created_at', () => {
    const l = eventLine({ label: 'Contact effectué', created_at: '2026-07-09T12:00:00Z' })
    expect(l.label).toBe('Contact effectué')
    expect(l.when.length).toBeGreaterThan(0)
  })
  it('repli sur event_type/step_key humanisé', () => {
    expect(eventLine({ event_type: 'status_change' }).label).toBe('Status change')
    expect(eventLine({ step_key: 'welcome_message' }).label).toBe('Welcome message')
    expect(eventLine({}).label).toBe('Événement')
  })
  it('normalizeEvents filtre le bruit et borne', () => {
    const rows = [{ label: 'a' }, null, 5, { label: 'b' }]
    expect(normalizeEvents(rows).map((e) => e.label)).toEqual(['a', 'b'])
    expect(normalizeEvents('nope')).toEqual([])
    expect(normalizeEvents(Array.from({ length: 50 }, (_, i) => ({ id: String(i) })), 10)).toHaveLength(10)
  })
})
