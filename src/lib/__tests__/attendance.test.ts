import { describe, it, expect } from 'vitest'
import {
  validateReunionInput, computeAttendanceStats, absenceStreak, shouldAlertAbsence,
  reunionTypeLabel, attendanceLabel, aggregateAttendance,
} from '@/lib/community/attendance'

describe('validateReunionInput', () => {
  it('refuse sans groupe / titre / date', () => {
    expect(validateReunionInput({}).ok).toBe(false)
    expect(validateReunionInput({ titre: 'X', date_reunion: '2026-06-10T18:00:00Z' }).ok).toBe(false) // pas de groupe
    expect(validateReunionInput({ groupe_id: 'g', date_reunion: '2026-06-10T18:00:00Z' }).ok).toBe(false) // pas de titre
  })
  it('refuse une date invalide', () => {
    expect(validateReunionInput({ groupe_id: 'g', titre: 'T', date_reunion: 'pas-une-date' }).ok).toBe(false)
  })
  it('refuse un type invalide et une durée ≤ 0', () => {
    expect(validateReunionInput({ groupe_id: 'g', titre: 'T', date_reunion: '2026-06-10T18:00:00Z', type: 'cosmique' }).ok).toBe(false)
    expect(validateReunionInput({ groupe_id: 'g', titre: 'T', date_reunion: '2026-06-10T18:00:00Z', duree_min: 0 }).ok).toBe(false)
  })
  it('accepte et normalise', () => {
    const r = validateReunionInput({ groupe_id: 'g1', titre: '  Cellule  ', date_reunion: '2026-06-10T18:00:00Z', type: 'virtuelle', duree_min: '90', lieu: '' })
    expect(r.ok).toBe(true)
    expect(r.value).toMatchObject({ groupe_id: 'g1', titre: 'Cellule', type: 'virtuelle', duree_min: 90, lieu: null })
  })
  it('type par défaut = physique', () => {
    const r = validateReunionInput({ groupe_id: 'g', titre: 'T', date_reunion: '2026-06-10T18:00:00Z' })
    expect(r.value?.type).toBe('physique')
  })
  it('refuse une durée non entière / non numérique', () => {
    const base = { groupe_id: 'g', titre: 'T', date_reunion: '2026-06-10T18:00:00Z' }
    expect(validateReunionInput({ ...base, duree_min: '90.5' }).ok).toBe(false)
    expect(validateReunionInput({ ...base, duree_min: 'abc' }).ok).toBe(false)
  })
  it('durée omise/vide → acceptée (null)', () => {
    const base = { groupe_id: 'g', titre: 'T', date_reunion: '2026-06-10T18:00:00Z' }
    expect(validateReunionInput({ ...base }).value?.duree_min).toBeNull()
    expect(validateReunionInput({ ...base, duree_min: '' }).value?.duree_min).toBeNull()
  })
})

describe('computeAttendanceStats', () => {
  it('liste vide → 0 partout', () => {
    expect(computeAttendanceStats([])).toEqual({ total: 0, present: 0, absent: 0, excuse: 0, taux_presence: 0, taux_assiduite: 0 })
  })
  it('compte et calcule les taux', () => {
    const s = computeAttendanceStats([
      { statut: 'present' }, { statut: 'present' }, { statut: 'excuse' }, { statut: 'absent' },
    ])
    expect(s.total).toBe(4)
    expect(s.present).toBe(2)
    expect(s.absent).toBe(1)
    expect(s.excuse).toBe(1)
    expect(s.taux_presence).toBe(50)   // 2/4
    expect(s.taux_assiduite).toBe(75)  // (2+1)/4
  })
})

describe('absenceStreak', () => {
  it('compte les absences consécutives depuis la plus récente', () => {
    expect(absenceStreak([{ statut: 'absent' }, { statut: 'absent' }, { statut: 'present' }])).toBe(2)
  })
  it('un présent en tête → 0', () => {
    expect(absenceStreak([{ statut: 'present' }, { statut: 'absent' }])).toBe(0)
  })
  it('un excusé interrompt la série', () => {
    expect(absenceStreak([{ statut: 'absent' }, { statut: 'excuse' }, { statut: 'absent' }])).toBe(1)
  })
  it('liste vide → 0', () => {
    expect(absenceStreak([])).toBe(0)
  })
  it('un statut inconnu en tête interrompt la série', () => {
    expect(absenceStreak([{ statut: 'inconnu' }, { statut: 'absent' }])).toBe(0)
  })
})

describe('aggregateAttendance (P2 — agrégation transverse)', () => {
  it('groupe par clé, calcule les stats, trie du moins au plus assidu', () => {
    const r = aggregateAttendance([
      { key: 'A', statut: 'present' }, { key: 'A', statut: 'present' },
      { key: 'B', statut: 'absent' }, { key: 'B', statut: 'present' },
    ])
    expect(r.map((x) => x.key)).toEqual(['B', 'A']) // B 50% avant A 100%
    expect(r.find((x) => x.key === 'A')!.stats.taux_presence).toBe(100)
    expect(r.find((x) => x.key === 'B')!.stats.taux_presence).toBe(50)
  })
  it('ignore les clés vides ; liste vide → []', () => {
    expect(aggregateAttendance([{ key: '', statut: 'present' }]).length).toBe(0)
    expect(aggregateAttendance([])).toEqual([])
  })
})

describe('shouldAlertAbsence', () => {
  it('seuil par défaut = 3', () => {
    expect(shouldAlertAbsence(2)).toBe(false)
    expect(shouldAlertAbsence(3)).toBe(true)
  })
  it('seuil personnalisé', () => {
    expect(shouldAlertAbsence(2, 2)).toBe(true)
  })
})

describe('labels', () => {
  it('types et statuts', () => {
    expect(reunionTypeLabel('virtuelle')).toBe('En ligne')
    expect(reunionTypeLabel('physique')).toBe('Présentiel')
    expect(attendanceLabel('excuse')).toBe('Excusé')
    expect(attendanceLabel(null)).toBe('—')
  })
})
