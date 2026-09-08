import { describe, expect, it } from 'vitest'
import { resolveHeroGreeting } from './contextual'

describe('contextual hero greeting', () => {
  it('keeps anonymous hero generic even with stale names', () => {
    expect(resolveHeroGreeting({ authenticated: false, firstName: 'Jean' })).toEqual({ title: 'N’avance plus seul dans ta foi.', subtitle: 'Ton prochain pas peut commencer ici.' })
  })
  it('greets authenticated member with first name', () => {
    expect(resolveHeroGreeting({ authenticated: true, firstName: 'Jean' }).title).toBe('Bonjour Jean.')
  })
  it('falls back to generic hero without authenticated first name', () => {
    expect(resolveHeroGreeting({ authenticated: true, firstName: '' }).title).toBe('N’avance plus seul dans ta foi.')
  })
})
