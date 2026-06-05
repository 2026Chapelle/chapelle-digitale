import { describe, it, expect } from 'vitest'
import { reminderKind, alertLevel, nextEscalation, monthBucket, dedupKeys } from '@/lib/notifications/rules'

const H = 3_600_000
const NOW = Date.UTC(2026, 5, 1)

describe('reminderKind', () => {
  it('imminent < 2h, null si passé', () => {
    expect(reminderKind(NOW + 1 * H, NOW)).toBe('imminent')
    expect(reminderKind(NOW, NOW)).toBeNull()
    expect(reminderKind(NOW - 5 * H, NOW)).toBeNull()
  })
  it('J-1 entre 12 et 36h', () => {
    expect(reminderKind(NOW + 24 * H, NOW)).toBe('j1')
    expect(reminderKind(NOW + 30 * H, NOW)).toBe('j1')
    expect(reminderKind(NOW + 10 * H, NOW)).toBeNull()
    expect(reminderKind(NOW + 40 * H, NOW)).toBeNull()
  })
  it('J-7 entre 6 et 8 jours', () => {
    expect(reminderKind(NOW + 168 * H, NOW)).toBe('j7')
    expect(reminderKind(NOW + 150 * H, NOW)).toBe('j7')
    expect(reminderKind(NOW + 100 * H, NOW)).toBeNull()
    expect(reminderKind(NOW + 200 * H, NOW)).toBeNull()
  })
})

describe('alertLevel', () => {
  it('mappe la criticité', () => {
    expect(alertLevel('priere_non_traitee')).toBe('critique')
    expect(alertLevel('inactif')).toBe('elevee')
    expect(alertLevel('profil_incomplet')).toBe('faible')
    expect(alertLevel('inconnu')).toBe('moyenne')
  })
})

describe('nextEscalation', () => {
  it('suit la chaîne', () => {
    expect(nextEscalation('responsable')).toBe('pasteur_national')
    expect(nextEscalation('pasteur_national')).toBe('admin')
    expect(nextEscalation('admin')).toBe('super_admin')
    expect(nextEscalation('super_admin')).toBe('super_admin')
    expect(nextEscalation('inconnu')).toBe('admin')
  })
})

describe('clés', () => {
  it('monthBucket déterministe', () => {
    expect(monthBucket(NOW)).toBe('202606')
  })
  it('dedupKeys stables', () => {
    expect(dedupKeys.event('e1', 'j7')).toBe('event:e1:j7')
    expect(dedupKeys.welcome('u1')).toBe('welcome:u1')
    expect(dedupKeys.pastoral('inactif', 'u1', '202606')).toBe('pastoral:inactif:u1:202606')
    expect(dedupKeys.certificate('REF-1')).toBe('cert:REF-1')
  })
})
