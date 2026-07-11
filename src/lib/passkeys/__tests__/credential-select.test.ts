import { describe, it, expect } from 'vitest'
import { selectActiveCredential, type SelectableCredential } from '../credential-select'

const list: SelectableCredential[] = [
  { id: 'a', userId: 'u1', credentialId: 'cred-1', revokedAt: null },
  { id: 'b', userId: 'u1', credentialId: 'cred-2', revokedAt: '2026-07-01T00:00:00Z' },
  { id: 'c', userId: 'u2', credentialId: 'cred-3', revokedAt: null },
]

describe('selectActiveCredential — parcours découvrable', () => {
  it('retourne le credential actif correspondant', () => {
    expect(selectActiveCredential(list, 'cred-1')?.id).toBe('a')
    expect(selectActiveCredential(list, 'cred-3')?.userId).toBe('u2')
  })
  it('rejette un credentialId inconnu', () => {
    expect(selectActiveCredential(list, 'inconnu')).toBeNull()
  })
  it('rejette un credential révoqué', () => {
    expect(selectActiveCredential(list, 'cred-2')).toBeNull()
  })
})
