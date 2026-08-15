import { describe, it, expect } from 'vitest'
import {
  PASTORAL_ACTIONS,
  PASTORAL_JOURNEY_MAX_STEPS,
  isValidActionKey,
  actionLabel,
  toValidIso,
  createEmptyJourney,
  parseJourney,
  addCompletedStep,
  applyAction,
  setNextFollowUp,
  mergePastoralJourney,
  isStepDone,
  type PastoralJourney,
} from '@/lib/pastoral/newcomer-actions'

const NOW = '2026-07-09T12:00:00.000Z'
const LATER = '2026-07-10T09:00:00.000Z'

describe('whitelist & helpers', () => {
  it('isValidActionKey n’accepte que la whitelist', () => {
    expect(isValidActionKey('first_contact')).toBe(true)
    expect(isValidActionKey('integrated')).toBe(true)
    expect(isValidActionKey('forbidden')).toBe(false)
    expect(isValidActionKey('First_Contact')).toBe(false) // sensible à la casse
    expect(isValidActionKey(null)).toBe(false)
  })
  it('actionLabel renvoie le libellé FR', () => {
    expect(actionLabel('welcome_message')).toBe('Message de bienvenue envoyé')
  })
  it('toValidIso valide/rejette', () => {
    expect(toValidIso(NOW)).toBe(NOW)
    expect(toValidIso('pas-une-date')).toBeNull()
    expect(toValidIso('')).toBeNull()
    expect(toValidIso(123 as unknown)).toBeNull()
  })
})

describe('parseJourney (défensif)', () => {
  it('metadata vide/null/array → journey vierge', () => {
    expect(parseJourney(null)).toEqual(createEmptyJourney())
    expect(parseJourney(undefined)).toEqual(createEmptyJourney())
    expect(parseJourney([])).toEqual(createEmptyJourney())
    expect(parseJourney({})).toEqual(createEmptyJourney())
  })
  it('lit un journey existant et filtre les steps invalides', () => {
    const meta = {
      admin_note: 'x',
      pastoral_journey: {
        completed_steps: [
          { key: 'first_contact', label: 'Premier contact', at: NOW },
          { key: '', label: 'vide', at: NOW }, // rejeté (clé vide)
          { key: 'bad_date', label: 'y', at: 'nope' }, // rejeté (date)
        ],
        last_action: { key: 'first_contact', label: 'Premier contact', at: NOW },
        next_follow_up_at: LATER,
      },
    }
    const j = parseJourney(meta)
    expect(j.completed_steps).toHaveLength(1)
    expect(j.completed_steps[0].key).toBe('first_contact')
    expect(j.last_action?.key).toBe('first_contact')
    expect(j.next_follow_up_at).toBe(LATER)
  })
  it('next_follow_up_at invalide → null', () => {
    expect(parseJourney({ pastoral_journey: { completed_steps: [], last_action: null, next_follow_up_at: 'x' } }).next_follow_up_at).toBeNull()
  })
})

describe('addCompletedStep', () => {
  it('ajoute une étape horodatée', () => {
    const j = addCompletedStep(createEmptyJourney(), 'first_contact', 'Premier contact', NOW)
    expect(j.completed_steps).toEqual([{ key: 'first_contact', label: 'Premier contact', at: NOW }])
  })
  it('déduplique par clé (remplace, garde 1)', () => {
    let j = addCompletedStep(createEmptyJourney(), 'first_contact', 'v1', NOW)
    j = addCompletedStep(j, 'first_contact', 'v2', LATER)
    expect(j.completed_steps).toHaveLength(1)
    expect(j.completed_steps[0]).toEqual({ key: 'first_contact', label: 'v2', at: LATER })
  })
  it('date invalide → throw', () => {
    expect(() => addCompletedStep(createEmptyJourney(), 'k', 'l', 'nope')).toThrow()
  })
  it('borne à PASTORAL_JOURNEY_MAX_STEPS', () => {
    let j = createEmptyJourney()
    for (let i = 0; i < PASTORAL_JOURNEY_MAX_STEPS + 5; i++) j = addCompletedStep(j, `k_${i}`, `l${i}`, NOW)
    expect(j.completed_steps.length).toBe(PASTORAL_JOURNEY_MAX_STEPS)
  })
})

describe('applyAction', () => {
  it('marque l’étape faite + définit last_action (libellé whitelisté)', () => {
    const j = applyAction(createEmptyJourney(), 'welcome_message', NOW)
    expect(isStepDone(j, 'welcome_message')).toBe(true)
    expect(j.last_action).toEqual({ key: 'welcome_message', label: 'Message de bienvenue envoyé', at: NOW })
  })
  it('rejette une clé hors whitelist', () => {
    expect(() => applyAction(createEmptyJourney(), 'forbidden', NOW)).toThrow()
  })
  it('rejette un horodatage invalide', () => {
    expect(() => applyAction(createEmptyJourney(), 'first_contact', 'nope')).toThrow()
  })
})

describe('setNextFollowUp', () => {
  it('définit une relance valide', () => {
    expect(setNextFollowUp(createEmptyJourney(), LATER).next_follow_up_at).toBe(LATER)
  })
  it('retire la relance avec null', () => {
    const j: PastoralJourney = { completed_steps: [], last_action: null, next_follow_up_at: LATER }
    expect(setNextFollowUp(j, null).next_follow_up_at).toBeNull()
  })
  it('date invalide → throw', () => {
    expect(() => setNextFollowUp(createEmptyJourney(), 'nope')).toThrow()
  })
})

describe('mergePastoralJourney — NON destructif', () => {
  it('préserve admin_note et autres clés', () => {
    const meta = { admin_note: 'Appelé dimanche', admin_note_at: NOW, foo: 'bar' }
    const j = applyAction(createEmptyJourney(), 'first_contact', NOW)
    const { metadata } = mergePastoralJourney(meta, j, NOW)
    expect(metadata.admin_note).toBe('Appelé dimanche')
    expect(metadata.admin_note_at).toBe(NOW)
    expect(metadata.foo).toBe('bar')
    expect((metadata.pastoral_journey as PastoralJourney).completed_steps).toHaveLength(1)
    expect(metadata.pastoral_journey_updated_at).toBe(NOW)
  })
  it('metadata null/array → repli {}', () => {
    const j = createEmptyJourney()
    expect(mergePastoralJourney(null, j).metadata).toEqual({ pastoral_journey: j })
    expect(mergePastoralJourney(['x'] as unknown, j).metadata).toEqual({ pastoral_journey: j })
  })
  it('ne mute pas la metadata source', () => {
    const meta = { foo: 'bar' }
    mergePastoralJourney(meta, createEmptyJourney(), NOW)
    expect(meta).toEqual({ foo: 'bar' })
  })
  it('cycle complet mergeAdminNote-like + journey préserve tout', () => {
    // simulate: metadata already had admin_note, then we add a journey action
    let meta: Record<string, unknown> = { admin_note: 'note', admin_note_at: NOW }
    const j = applyAction(parseJourney(meta), 'pastoral_need', LATER)
    meta = mergePastoralJourney(meta, j, LATER).metadata
    expect(meta.admin_note).toBe('note')
    expect((meta.pastoral_journey as PastoralJourney).last_action?.key).toBe('pastoral_need')
  })
})

describe('cohérence whitelist', () => {
  it('les 6 actions attendues', () => {
    expect(PASTORAL_ACTIONS.map((a) => a.key)).toEqual([
      'first_contact', 'welcome_message', 'pastoral_need', 'encouragement', 'orientation', 'integrated',
    ])
  })
})
