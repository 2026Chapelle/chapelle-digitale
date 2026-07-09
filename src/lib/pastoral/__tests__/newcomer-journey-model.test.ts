import { describe, it, expect } from 'vitest'
import {
  readJourneyFields,
  hasJourney,
  humanizeKey,
  journeyStatusLabel,
  journeyStepLabel,
  buildStepCatalog,
  STEP_LABELS_FR,
  JOURNEY_STATUSES,
  isValidJourneyStatus,
  isValidJourneyStepKey,
  isPreContactStep,
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
  it('priorité 1 : catalogue SQL si présent', () => {
    const cat: NewcomerJourneyStep[] = [{ key: 'received', label: 'Dossier reçu (SQL)' }]
    expect(journeyStepLabel('received', cat)).toBe('Dossier reçu (SQL)')
  })
  it('priorité 2 : libellés FR intégrés (V2.7-C) — corrige « Received »', () => {
    expect(journeyStepLabel('received')).toBe('Fiche reçue')
    expect(journeyStepLabel('needs_contact')).toBe('À contacter')
    expect(journeyStepLabel('first_contact_done')).toBe('Premier contact effectué')
    expect(journeyStepLabel('completed')).toBe('Parcours terminé')
  })
  it('priorité 3 : humanise une clé inconnue', () => {
    expect(journeyStepLabel('some_new_step')).toBe('Some new step')
  })
  it('absent → fallback', () => {
    expect(journeyStepLabel(null)).toBe(FALLBACK_NO_JOURNEY)
  })
})

describe('validateurs de mutation (V2.8-A)', () => {
  it('isValidJourneyStatus : whitelist stricte', () => {
    expect(JOURNEY_STATUSES).toEqual(['active', 'paused', 'completed', 'closed'])
    for (const v of JOURNEY_STATUSES) expect(isValidJourneyStatus(v)).toBe(true)
    expect(isValidJourneyStatus('archived')).toBe(false)
    expect(isValidJourneyStatus(null)).toBe(false)
    expect(isValidJourneyStatus('Active')).toBe(false)
  })
  it('isValidJourneyStepKey : seulement les clés du référentiel connu', () => {
    expect(isValidJourneyStepKey('received')).toBe(true)
    expect(isValidJourneyStepKey('completed')).toBe(true)
    expect(isValidJourneyStepKey('inconnu')).toBe(false)
    expect(isValidJourneyStepKey(42)).toBe(false)
  })
  it('isPreContactStep : received/needs_contact uniquement', () => {
    expect(isPreContactStep('received')).toBe(true)
    expect(isPreContactStep('needs_contact')).toBe(true)
    expect(isPreContactStep('first_contact_done')).toBe(false)
    expect(isPreContactStep(null)).toBe(false)
  })
})

describe('STEP_LABELS_FR + buildStepCatalog', () => {
  it('couvre les 8 étapes connues', () => {
    expect(Object.keys(STEP_LABELS_FR)).toEqual([
      'received', 'needs_contact', 'first_contact_done', 'pastoral_orientation',
      'integration_invited', 'integration_started', 'discipleship_followup', 'completed',
    ])
  })
  it('construit un catalogue depuis des lignes SQL (step_key/label/sort_order)', () => {
    const cat = buildStepCatalog([
      { step_key: 'received', label: 'Fiche reçue', sort_order: 1 },
      { step_key: '', label: 'ignoré' },
      null,
      'bruit',
    ])
    expect(cat).toHaveLength(1)
    expect(cat[0]).toEqual({ key: 'received', label: 'Fiche reçue', position: 1 })
  })
  it('rows non-array → []', () => {
    expect(buildStepCatalog(null)).toEqual([])
    expect(buildStepCatalog('x')).toEqual([])
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
  it('transition from_step_key → to_step_key en libellés FR', () => {
    expect(eventLine({ from_step_key: 'received', to_step_key: 'needs_contact' }).label).toBe('Fiche reçue → À contacter')
    expect(eventLine({ to_step_key: 'completed' }).label).toBe('Parcours terminé')
  })
  it('transition utilise le catalogue SQL si fourni', () => {
    const cat: NewcomerJourneyStep[] = [{ key: 'received', label: 'Reçu (SQL)' }]
    expect(eventLine({ to_step_key: 'received' }, cat).label).toBe('Reçu (SQL)')
  })
  it('normalizeEvents filtre le bruit et borne', () => {
    const rows = [{ label: 'a' }, null, 5, { label: 'b' }]
    expect(normalizeEvents(rows).map((e) => e.label)).toEqual(['a', 'b'])
    expect(normalizeEvents('nope')).toEqual([])
    expect(normalizeEvents(Array.from({ length: 50 }, (_, i) => ({ id: String(i) })), 10)).toHaveLength(10)
  })
})
