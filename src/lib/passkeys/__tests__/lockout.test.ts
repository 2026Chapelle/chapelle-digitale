import { describe, it, expect } from 'vitest'
import { canRevokePasskey } from '../lockout'

describe('canRevokePasskey — invariant anti-verrouillage', () => {
  it('autorise si un secours mot de passe existe (cas du pilote)', () => {
    expect(canRevokePasskey({ hasPasswordFallback: true, activePasskeysAfterRevoke: 0 })).toBe(true)
  })
  it('sans secours : autorise s’il reste au moins une passkey active', () => {
    expect(canRevokePasskey({ hasPasswordFallback: false, activePasskeysAfterRevoke: 1 })).toBe(true)
  })
  it('sans secours et dernière passkey : interdit (éviterait le verrouillage)', () => {
    expect(canRevokePasskey({ hasPasswordFallback: false, activePasskeysAfterRevoke: 0 })).toBe(false)
  })
})
