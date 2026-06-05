import { describe, it, expect } from 'vitest'
import {
  shouldBePrimaryOnJoin, applyPrimary, pickPrimaryAfterLeave, canJoinGroup, membershipRoleLabel,
  decidePrimaryOnAdd, type Membership,
} from '@/lib/community/membership'

const M = (groupe_id: string, over: Partial<Membership> = {}): Membership => ({
  groupe_id, is_primary: false, statut: 'actif', ...over,
})

describe('shouldBePrimaryOnJoin', () => {
  it('premier groupe (aucune appartenance active) → devient principal', () => {
    expect(shouldBePrimaryOnJoin([])).toBe(true)
  })
  it('aucun principal actif existant → devient principal', () => {
    expect(shouldBePrimaryOnJoin([M('g1', { is_primary: false })])).toBe(true)
  })
  it('un principal actif existe déjà → ne devient pas principal', () => {
    expect(shouldBePrimaryOnJoin([M('g1', { is_primary: true })])).toBe(false)
  })
  it('un principal mais SORTI → ne compte pas, devient principal', () => {
    expect(shouldBePrimaryOnJoin([M('g1', { is_primary: true, statut: 'sorti' })])).toBe(true)
  })
  it('un principal EN_ATTENTE → ne compte pas (seul actif compte), devient principal', () => {
    expect(shouldBePrimaryOnJoin([M('g1', { is_primary: true, statut: 'en_attente' })])).toBe(true)
  })
})

describe('decidePrimaryOnAdd (ne vole pas le principal)', () => {
  it('aucune appartenance → principal', () => {
    expect(decidePrimaryOnAdd([], 'g1')).toBe(true)
  })
  it('cette appartenance est déjà principale → reste principale', () => {
    expect(decidePrimaryOnAdd([M('g1', { is_primary: true })], 'g1')).toBe(true)
  })
  it('un AUTRE groupe actif est principal → ne devient pas principal', () => {
    expect(decidePrimaryOnAdd([M('g1', { is_primary: true }), M('g2')], 'g2')).toBe(false)
  })
  it('l\'autre principal est SORTI → devient principal', () => {
    expect(decidePrimaryOnAdd([M('g1', { is_primary: true, statut: 'sorti' })], 'g2')).toBe(true)
  })
})

describe('applyPrimary (unicité du principal)', () => {
  it('un seul is_primary après application', () => {
    const res = applyPrimary([M('g1', { is_primary: true }), M('g2'), M('g3')], 'g2')
    expect(res.filter((m) => m.is_primary).map((m) => m.groupe_id)).toEqual(['g2'])
  })
  it('liste pure : ne mute pas l\'entrée', () => {
    const input = [M('g1', { is_primary: true })]
    applyPrimary(input, 'g2')
    expect(input[0].is_primary).toBe(true)
  })
})

describe('pickPrimaryAfterLeave (bascule)', () => {
  it('sortie d\'un groupe NON principal → pas de bascule', () => {
    const ms = [M('g1', { is_primary: true }), M('g2')]
    expect(pickPrimaryAfterLeave(ms, 'g2')).toBeNull()
  })
  it('sortie du principal → bascule vers le plus ancien restant', () => {
    const ms = [
      M('g1', { is_primary: true, date_adhesion: '2026-01-01' }),
      M('g2', { date_adhesion: '2026-03-01' }),
      M('g3', { date_adhesion: '2026-02-01' }),
    ]
    expect(pickPrimaryAfterLeave(ms, 'g1')).toBe('g3') // 2026-02-01 = plus ancien restant
  })
  it('sortie du principal sans autre groupe actif → null', () => {
    const ms = [M('g1', { is_primary: true }), M('g2', { statut: 'sorti' })]
    expect(pickPrimaryAfterLeave(ms, 'g1')).toBeNull()
  })
})

describe('canJoinGroup', () => {
  it('groupe actif sans capacité → ok', () => {
    expect(canJoinGroup({ statut: 'actif' }).ok).toBe(true)
  })
  it('groupe inactif → refusé', () => {
    expect(canJoinGroup({ statut: 'inactif' }).ok).toBe(false)
  })
  it('capacité atteinte → refusé', () => {
    expect(canJoinGroup({ statut: 'actif', capacite_max: 12, membres_count: 12 }).ok).toBe(false)
  })
  it('capacité non atteinte → ok', () => {
    expect(canJoinGroup({ statut: 'actif', capacite_max: 12, membres_count: 5 }).ok).toBe(true)
  })
  it('capacité dépassée (count > cap) → refusé', () => {
    expect(canJoinGroup({ statut: 'actif', capacite_max: 12, membres_count: 13 }).ok).toBe(false)
  })
  it('capacite_max = 0 → traité comme sans limite → ok', () => {
    expect(canJoinGroup({ statut: 'actif', capacite_max: 0, membres_count: 50 }).ok).toBe(true)
  })
  it('membres_count null (fallback 0) → ok', () => {
    expect(canJoinGroup({ statut: 'actif', capacite_max: 12, membres_count: null }).ok).toBe(true)
  })
  it('statut absent/null → refusé', () => {
    expect(canJoinGroup({ statut: null }).ok).toBe(false)
    expect(canJoinGroup({}).ok).toBe(false)
  })
})

describe('membershipRoleLabel', () => {
  it('libellés', () => {
    expect(membershipRoleLabel('leader')).toBe('Leader')
    expect(membershipRoleLabel('co-leader')).toBe('Co-leader')
    expect(membershipRoleLabel('membre')).toBe('Membre')
    expect(membershipRoleLabel(null)).toBe('Membre')
  })
})
