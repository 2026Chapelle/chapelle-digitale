import { describe, it, expect } from 'vitest'
import {
  OVERDUE_DAYS,
  FOLLOWUP_DAYS,
  daysSince,
  bucketOf,
  heardFrom,
  triageNewcomer,
  compareByPastoralUrgency,
  summarizeTriage,
  relativeDaysLabel,
  type TriageInput,
} from '@/lib/pastoral/newcomer-triage'

// Instant de référence fixe pour un test déterministe.
const NOW = Date.parse('2026-07-09T12:00:00.000Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

describe('daysSince', () => {
  it('compte les jours pleins, 0 si absent/invalide/futur', () => {
    expect(daysSince(daysAgo(3), NOW)).toBe(3)
    expect(daysSince(daysAgo(0.4), NOW)).toBe(0)
    expect(daysSince(null, NOW)).toBe(0)
    expect(daysSince(undefined, NOW)).toBe(0)
    expect(daysSince('pas-une-date', NOW)).toBe(0)
    expect(daysSince(new Date(NOW + 86_400_000).toISOString(), NOW)).toBe(0) // futur
  })
})

describe('bucketOf', () => {
  it('groupe les statuts en 3 phases', () => {
    expect(bucketOf('new')).toBe('todo')
    expect(bucketOf('to_review')).toBe('todo')
    expect(bucketOf('contacted')).toBe('inprogress')
    expect(bucketOf('converted')).toBe('closed')
    expect(bucketOf('duplicate')).toBe('closed')
    expect(bucketOf('archived')).toBe('closed')
    expect(bucketOf('inconnu')).toBe('inprogress') // repli non-fermé
  })
})

describe('heardFrom', () => {
  it('extrait heard_from de intake_payload de façon sûre', () => {
    expect(heardFrom({ heard_from: 'Un ami' })).toBe('Un ami')
    expect(heardFrom({ heard_from: '  ' })).toBeNull()
    expect(heardFrom({})).toBeNull()
    expect(heardFrom(null)).toBeNull()
    expect(heardFrom([])).toBeNull()
    expect(heardFrom('x')).toBeNull()
  })
})

describe('triageNewcomer', () => {
  it('demande new récente : à traiter, pas en retard', () => {
    const t = triageNewcomer({ status: 'new', created_at: daysAgo(1) }, NOW)
    expect(t.bucket).toBe('todo')
    expect(t.ageDays).toBe(1)
    expect(t.isOverdue).toBe(false)
    expect(t.followUpDue).toBe(false)
    expect(t.sinceContactDays).toBeNull()
  })

  it('demande à traiter au-delà du seuil : en retard', () => {
    const t = triageNewcomer({ status: 'to_review', created_at: daysAgo(OVERDUE_DAYS + 1) }, NOW)
    expect(t.isOverdue).toBe(true)
  })

  it('le seuil est strict (> OVERDUE_DAYS, pas >=)', () => {
    const t = triageNewcomer({ status: 'new', created_at: daysAgo(OVERDUE_DAYS) }, NOW)
    expect(t.isOverdue).toBe(false)
  })

  it('contacté depuis longtemps sans conversion : à relancer', () => {
    const t = triageNewcomer({ status: 'contacted', created_at: daysAgo(20), processed_at: daysAgo(FOLLOWUP_DAYS + 1) }, NOW)
    expect(t.bucket).toBe('inprogress')
    expect(t.followUpDue).toBe(true)
    expect(t.sinceContactDays).toBe(FOLLOWUP_DAYS + 1)
  })

  it('contacté récemment : pas de relance', () => {
    const t = triageNewcomer({ status: 'contacted', created_at: daysAgo(6), processed_at: daysAgo(1) }, NOW)
    expect(t.followUpDue).toBe(false)
  })

  it('intégré : phase close, jamais en retard ni à relancer', () => {
    const t = triageNewcomer({ status: 'converted', created_at: daysAgo(30), processed_at: daysAgo(30) }, NOW)
    expect(t.bucket).toBe('closed')
    expect(t.isOverdue).toBe(false)
    expect(t.followUpDue).toBe(false)
  })
})

describe('compareByPastoralUrgency', () => {
  it('ordonne : à traiter avant en cours avant clos ; plus anciens d’abord', () => {
    const items: TriageInput[] = [
      { status: 'converted', created_at: daysAgo(1) }, // clos
      { status: 'contacted', created_at: daysAgo(2) }, // en cours
      { status: 'new', created_at: daysAgo(1) }, // à traiter récent
      { status: 'to_review', created_at: daysAgo(9) }, // à traiter ancien (en retard)
    ]
    const sorted = [...items].sort((a, b) => compareByPastoralUrgency(a, b, NOW))
    expect(sorted.map((x) => x.status)).toEqual(['to_review', 'new', 'contacted', 'converted'])
  })
})

describe('summarizeTriage', () => {
  it('agrège les compteurs pastoraux', () => {
    const list: TriageInput[] = [
      { status: 'new', created_at: daysAgo(0) }, // toContact
      { status: 'to_review', created_at: daysAgo(5) }, // toContact + overdue
      { status: 'contacted', created_at: daysAgo(10), processed_at: daysAgo(8) }, // inProgress + followUpDue
      { status: 'contacted', created_at: daysAgo(3), processed_at: daysAgo(1) }, // inProgress
      { status: 'converted', created_at: daysAgo(20) }, // integrated
      { status: 'archived', created_at: daysAgo(40) }, // clos
    ]
    const s = summarizeTriage(list, NOW)
    expect(s.total).toBe(6)
    expect(s.toContact).toBe(2)
    expect(s.overdue).toBe(1)
    expect(s.inProgress).toBe(2)
    expect(s.followUpDue).toBe(1)
    expect(s.integrated).toBe(1)
  })

  it('tolère une liste vide ou des éléments nuls', () => {
    // @ts-expect-error test robustesse null
    const s = summarizeTriage([null, undefined], NOW)
    expect(s.total).toBe(0)
  })
})

describe('relativeDaysLabel', () => {
  it('produit un libellé français court', () => {
    expect(relativeDaysLabel(0)).toBe("aujourd'hui")
    expect(relativeDaysLabel(1)).toBe('hier')
    expect(relativeDaysLabel(4)).toBe('il y a 4 j')
  })
})
