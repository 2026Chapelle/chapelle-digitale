import { describe, it, expect } from 'vitest'
import {
  applyHomeInstantToggle,
  isHomeInstantDesignated,
  HOME_INSTANT_PREMIUM_ERROR,
} from '@/lib/podcast/admin-instant'

describe('applyHomeInstantToggle — case Instant gratuit ↔ destination home_instant', () => {
  it('active : ajoute home_instant SANS écraser les autres destinations', () => {
    const r = applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'member', destinations: ['catalog', 'featured'] })
    expect(r).toEqual({ ok: true, destinations: ['catalog', 'featured', 'home_instant'] })
  })

  it('désactive : retire home_instant, préserve le reste', () => {
    const r = applyHomeInstantToggle({ isHomeInstant: false, accessLevel: 'member', destinations: ['home_instant', 'catalog'] })
    expect(r).toEqual({ ok: true, destinations: ['catalog'] })
  })

  it('GARDE-FOU premium : refus explicite, aucune destination retournée', () => {
    const r = applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'premium', destinations: ['catalog'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(HOME_INSTANT_PREMIUM_ERROR)
  })

  it('public autorisé', () => {
    expect(applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'public', destinations: [] }))
      .toEqual({ ok: true, destinations: ['home_instant'] })
  })

  it('member autorisé (cas nominal — aperçu gratuit sans changer l’accès)', () => {
    expect(applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'member', destinations: [] }))
      .toEqual({ ok: true, destinations: ['home_instant'] })
  })

  it('idempotent : déjà présent → une seule occurrence (dédoublonnage)', () => {
    expect(applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'member', destinations: ['home_instant'] }))
      .toEqual({ ok: true, destinations: ['home_instant'] })
    expect(applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'member', destinations: ['catalog', 'catalog'] }))
      .toEqual({ ok: true, destinations: ['catalog', 'home_instant'] })
  })

  it('destinations null / non-array → traité comme vide', () => {
    expect(applyHomeInstantToggle({ isHomeInstant: true, accessLevel: 'member', destinations: null }))
      .toEqual({ ok: true, destinations: ['home_instant'] })
    expect(applyHomeInstantToggle({ isHomeInstant: false, accessLevel: 'member', destinations: undefined }))
      .toEqual({ ok: true, destinations: [] })
  })

  it('désactiver un premium reste autorisé (le garde-fou ne bloque que l’activation)', () => {
    expect(applyHomeInstantToggle({ isHomeInstant: false, accessLevel: 'premium', destinations: ['home_instant', 'catalog'] }))
      .toEqual({ ok: true, destinations: ['catalog'] })
  })
})

describe('isHomeInstantDesignated', () => {
  it('vrai si home_instant présent', () => {
    expect(isHomeInstantDesignated(['catalog', 'home_instant'])).toBe(true)
  })
  it('faux sinon / non-array', () => {
    expect(isHomeInstantDesignated(['catalog'])).toBe(false)
    expect(isHomeInstantDesignated(null)).toBe(false)
    expect(isHomeInstantDesignated(undefined)).toBe(false)
  })
})
