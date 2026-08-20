import { describe, it, expect } from 'vitest'
import { buildMemberCanonicalProjection } from '@/lib/canonical/member-projection'

describe('member-projection — projection CAVIARDÉE (aucune fuite interne)', () => {
  it('row null → axes non définis, aucun ministère', () => {
    const p = buildMemberCanonicalProjection(null, null)
    expect(p.growth).toEqual({ key: null, label: 'Non encore défini', defini: false })
    expect(p.community).toEqual({ key: null, label: 'Non encore défini', defini: false })
    expect(p.ministries).toEqual([])
  })

  it('valeurs reconnues → libellés FR + defini=true', () => {
    const p = buildMemberCanonicalProjection({ growth_level: 'disciple', community_status: 'member' }, [])
    expect(p.growth).toEqual({ key: 'disciple', label: 'Disciple', defini: true })
    expect(p.community).toEqual({ key: 'member', label: 'Membre', defini: true })
  })

  it('valeur inconnue/corrompue → traitée comme non définie (jamais affichée brute)', () => {
    const p = buildMemberCanonicalProjection({ growth_level: 'zzz', community_status: null }, [])
    expect(p.growth.defini).toBe(false)
    expect(p.growth.key).toBe(null)
  })

  it('n’expose JAMAIS review_state / justification / actor (contrat de type)', () => {
    const p = buildMemberCanonicalProjection({ growth_level: 'leader', community_status: 'integrating' }, [])
    const serialized = JSON.stringify(p)
    expect(serialized).not.toContain('requires_review')
    expect(serialized).not.toContain('review_state')
    expect(serialized).not.toContain('justification')
    expect(serialized).not.toContain('actor')
  })

  it('ministères : seuls les actifs, dédoublonnés, inconnus filtrés', () => {
    const p = buildMemberCanonicalProjection({ growth_level: 'servant', community_status: 'member' }, [
      { role_key: 'mentor', status: 'active' },
      { role_key: 'mentor', status: 'active' },      // doublon
      { role_key: 'cell_leader', status: 'ended' },  // inactif → exclu
      { role_key: 'unknown_role', status: 'active' },// inconnu → exclu
      { role_key: 'shepherd', status: 'active' },
    ])
    expect(p.ministries.map((m) => m.key).sort()).toEqual(['mentor', 'shepherd'])
    expect(p.ministries.find((m) => m.key === 'shepherd')?.label).toBe('Berger')
  })
})
