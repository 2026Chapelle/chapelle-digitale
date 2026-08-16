import { describe, it, expect } from 'vitest'
import {
  buildAdminContext, profileToAdminInput, deriveScope, deriveResponsibilities,
  type AdminProfileInput,
} from '@/lib/admin/admin-context'

const profile = (over: Partial<AdminProfileInput> = {}): AdminProfileInput => ({
  profileId: 'p1', email: 'a@b.c', role: 'admin', ...over,
})

describe('buildAdminContext — non destructif / fallback', () => {
  it('non authentifié → isAuthenticated false, aucun rôle/scope, aucune décision de blocage', () => {
    const c = buildAdminContext({ legacyAuthenticated: false, profile: null })
    expect(c.isAuthenticated).toBe(false)
    expect(c.legacyFallback).toBe(false)
    expect(c.role).toBeNull()
    expect(c.scope).toBeNull()
    expect(c.responsibilities).toEqual([])
    expect('denied' in c).toBe(false) // aucune notion de refus/escalade
  })

  it('legacy authentifié SANS profil → legacyFallback true, role/scope null (comportement actuel)', () => {
    const c = buildAdminContext({ legacyAuthenticated: true, profile: null })
    expect(c.isAuthenticated).toBe(true)
    expect(c.legacyFallback).toBe(true)
    expect(c.profileId).toBeNull()
    expect(c.role).toBeNull()
    expect(c.scope).toBeNull()
    expect(c.responsibilities).toEqual([])
  })

  it('profil réel avec rôle → contexte enrichi, legacyFallback false', () => {
    const c = buildAdminContext({ legacyAuthenticated: true, profile: profile({ role: 'super_admin' }) })
    expect(c.isAuthenticated).toBe(true)
    expect(c.legacyFallback).toBe(false)
    expect(c.profileId).toBe('p1')
    expect(c.email).toBe('a@b.c')
    expect(c.role).toBe('super_admin')
    expect(c.scope).toEqual({ kind: 'global' })
  })

  it('rôle absent → fallback sûr (scope unknown), pas d’échec', () => {
    const c = buildAdminContext({ legacyAuthenticated: true, profile: profile({ role: null, pays: null }) })
    expect(c.role).toBeNull()
    expect(c.scope).toEqual({ kind: 'unknown' })
    expect(c.legacyFallback).toBe(false) // profil présent → pas de fallback legacy
  })
})

describe('deriveScope — informatif, jamais bloquant', () => {
  it('super_admin/admin → global', () => {
    expect(deriveScope(profile({ role: 'super_admin', pays: 'CI' }))).toEqual({ kind: 'global' })
    expect(deriveScope(profile({ role: 'admin', antenneId: 'a1' }))).toEqual({ kind: 'global' })
  })
  it('non-admin → antenne > nation > group > platform > unknown', () => {
    expect(deriveScope(profile({ role: 'pasteur', antenneId: 'a1', pays: 'CI' })).kind).toBe('antenne')
    expect(deriveScope(profile({ role: 'responsable_national', antenneId: null, pays: 'CI' }))).toEqual({ kind: 'nation', pays: 'CI' })
    expect(deriveScope(profile({ role: 'leader', antenneId: null, pays: null, groupeCelluleId: 'g1' })).kind).toBe('group')
    expect(deriveScope(profile({ role: 'membre', antenneId: null, pays: null, groupeCelluleId: null, plateformePrincipale: 'cier' })).kind).toBe('platform')
    expect(deriveScope(profile({ role: 'membre', antenneId: null, pays: null, groupeCelluleId: null, plateformePrincipale: null })).kind).toBe('unknown')
  })
})

describe('deriveResponsibilities — jamais inventées', () => {
  it('profil sans attribut de portée → tableau vide', () => {
    expect(deriveResponsibilities(profile({ role: 'membre', pays: null }))).toEqual([])
  })
  it('agrège antenne/group/nation/platform présents', () => {
    const r = deriveResponsibilities(profile({ antenneId: 'a1', groupeCelluleId: 'g1', pays: 'CI', plateformePrincipale: 'cier' }))
    expect(r.map((x) => x.type).sort()).toEqual(['antenne', 'group', 'nation', 'platform'])
  })
})

describe('profileToAdminInput — lecture prudente (dont antenne_id hors type ProfileRow)', () => {
  it('null/objet invalide → null', () => {
    expect(profileToAdminInput(null)).toBeNull()
    expect(profileToAdminInput({})).toBeNull()
    expect(profileToAdminInput({ id: '' })).toBeNull()
  })
  it('lit antenne_id via l’objet lâche sans casser le type', () => {
    const input = profileToAdminInput({ id: 'p9', email: 'x@y.z', role: 'pasteur', antenne_id: 'ant-42', groupe_cellule_id: 'cell-7', pays: 'SN', plateforme_principale: 'jeunesse' })
    expect(input).not.toBeNull()
    expect(input!.antenneId).toBe('ant-42')
    expect(input!.groupeCelluleId).toBe('cell-7')
    expect(input!.plateformePrincipale).toBe('jeunesse')
  })
  it('normalise les chaînes vides en null', () => {
    const input = profileToAdminInput({ id: 'p', email: '   ', role: '', antenne_id: '' })
    expect(input!.email).toBeNull()
    expect(input!.role).toBeNull()
    expect(input!.antenneId).toBeNull()
  })
})
