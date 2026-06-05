import { describe, it, expect } from 'vitest'
import { validateGroupInput, canScopeManageGroup, canScopeCreateInPays, pickAllowedInfos } from '@/lib/community/groups-access'

describe('validateGroupInput', () => {
  it('refuse sans nom', () => {
    const r = validateGroupInput({ plateforme_id: 'cier', type: 'cellule' })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/nom/i)
  })
  it('refuse sans plateforme (obligatoire)', () => {
    const r = validateGroupInput({ nom: 'Cellule A', type: 'cellule' })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/plateforme/i)
  })
  it('refuse un type invalide', () => {
    const r = validateGroupInput({ nom: 'X', plateforme_id: 'cier', type: 'reseau_social' })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toMatch(/type/i)
  })
  it('refuse un niveau non entier / < 1', () => {
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', niveau: 0 }).ok).toBe(false)
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', niveau: 1.5 }).ok).toBe(false)
  })
  it('refuse une capacité ≤ 0', () => {
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', capacite_max: 0 }).ok).toBe(false)
  })
  it('accepte et normalise une saisie valide', () => {
    const r = validateGroupInput({
      nom: '  Cellule Abidjan  ', plateforme_id: 'familles-chapelle', type: 'cellule',
      pays: 'Côte d\'Ivoire', niveau: '2', capacite_max: '15', est_virtuel: 'true', description: '',
    })
    expect(r.ok).toBe(true)
    expect(r.value).toMatchObject({
      nom: 'Cellule Abidjan', plateforme_id: 'familles-chapelle', type: 'cellule',
      niveau: 2, capacite_max: 15, est_virtuel: true, description: null,
    })
  })
  it('type par défaut = cellule', () => {
    const r = validateGroupInput({ nom: 'X', plateforme_id: 'cier' })
    expect(r.ok).toBe(true)
    expect(r.value?.type).toBe('cellule')
  })
  it('agrège plusieurs erreurs (nom + plateforme manquants)', () => {
    const r = validateGroupInput({ type: 'cellule' })
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(2)
  })
  it('refuse un niveau négatif et une capacité négative', () => {
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', niveau: -1 }).ok).toBe(false)
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', capacite_max: -5 }).ok).toBe(false)
  })
  it('refuse niveau/capacité non numériques', () => {
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', niveau: 'abc' }).ok).toBe(false)
    expect(validateGroupInput({ nom: 'X', plateforme_id: 'cier', capacite_max: 'douze' }).ok).toBe(false)
  })
})

describe('pickAllowedInfos (un leader ne change que les infos)', () => {
  it('rejette nom, type, pays, capacite_max, responsable_id, statut', () => {
    const out = pickAllowedInfos({
      nom: 'Hack', type: 'departement', pays: 'Autre', capacite_max: 9999,
      responsable_id: 'attaquant', statut: 'inactif',
      description: 'ok', jour_reunion: 'mardi',
    })
    expect(out).toEqual({ description: 'ok', jour_reunion: 'mardi' })
    expect('nom' in out).toBe(false)
    expect('pays' in out).toBe(false)
    expect('capacite_max' in out).toBe(false)
    expect('responsable_id' in out).toBe(false)
  })
  it('conserve les 6 champs autorisés', () => {
    const out = pickAllowedInfos({
      description: 'd', jour_reunion: 'j', heure_reunion: 'h', lieu_reunion: 'l',
      est_virtuel: true, reunion_url: 'u',
    })
    expect(Object.keys(out).sort()).toEqual(['description', 'est_virtuel', 'heure_reunion', 'jour_reunion', 'lieu_reunion', 'reunion_url'])
  })
})

describe('canScopeManageGroup', () => {
  const grp = { pays: 'Bénin', responsable_id: 'u-resp' }
  it('all → toujours autorisé', () => {
    expect(canScopeManageGroup('all', grp, {})).toBe(true)
  })
  it('nation → autorisé si le pays du groupe est affecté', () => {
    expect(canScopeManageGroup('nation', grp, { myPays: ['Bénin'] })).toBe(true)
    expect(canScopeManageGroup('nation', grp, { myPays: ['Togo'] })).toBe(false)
    expect(canScopeManageGroup('nation', { pays: null }, { myPays: ['Bénin'] })).toBe(false)
  })
  it('assigned → autorisé si responsable du groupe', () => {
    expect(canScopeManageGroup('assigned', grp, { uid: 'u-resp' })).toBe(true)
    expect(canScopeManageGroup('assigned', grp, { uid: 'autre' })).toBe(false)
  })
  it('denied → jamais', () => {
    expect(canScopeManageGroup('denied', grp, { uid: 'u-resp', myPays: ['Bénin'] })).toBe(false)
  })
  it('assigned SANS uid → refusé (scénario interdit)', () => {
    expect(canScopeManageGroup('assigned', grp, {})).toBe(false)
  })
  it('assigned avec responsable_id null → refusé', () => {
    expect(canScopeManageGroup('assigned', { responsable_id: null }, { uid: 'u-resp' })).toBe(false)
  })
})

describe('canScopeCreateInPays', () => {
  it('all crée partout ; nation seulement dans son pays ; assigned/denied jamais', () => {
    expect(canScopeCreateInPays('all', null, [])).toBe(true)
    expect(canScopeCreateInPays('nation', 'Bénin', ['Bénin'])).toBe(true)
    expect(canScopeCreateInPays('nation', 'Togo', ['Bénin'])).toBe(false)
    expect(canScopeCreateInPays('nation', null, ['Bénin'])).toBe(false)
    expect(canScopeCreateInPays('assigned', 'Bénin', ['Bénin'])).toBe(false)
    expect(canScopeCreateInPays('denied', 'Bénin', ['Bénin'])).toBe(false)
  })
})
