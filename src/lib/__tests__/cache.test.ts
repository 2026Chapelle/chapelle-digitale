import { describe, it, expect, beforeEach } from 'vitest'
import { cached, invalidate, invalidatePrefix, clearCache, cacheSize } from '@/lib/cache'

beforeEach(() => clearCache())

describe('cached', () => {
  it('exécute fn une seule fois tant que la valeur est fraîche', async () => {
    let calls = 0
    const fn = async () => { calls++; return 42 }
    const t = () => 1000
    expect(await cached('k', 5000, fn, t)).toBe(42)
    expect(await cached('k', 5000, fn, t)).toBe(42)
    expect(calls).toBe(1)
  })

  it('réexécute fn après expiration du TTL', async () => {
    let calls = 0
    const fn = async () => { calls++; return calls }
    let now = 1000
    const t = () => now
    expect(await cached('k', 100, fn, t)).toBe(1)
    now = 1101 // au-delà du TTL
    expect(await cached('k', 100, fn, t)).toBe(2)
    expect(calls).toBe(2)
  })

  it('déduplique les appels concurrents (pas de stampede)', async () => {
    let calls = 0
    const fn = async () => { calls++; await Promise.resolve(); return 'x' }
    const t = () => 1000
    const [a, b, c] = await Promise.all([
      cached('k', 5000, fn, t),
      cached('k', 5000, fn, t),
      cached('k', 5000, fn, t),
    ])
    expect([a, b, c]).toEqual(['x', 'x', 'x'])
    expect(calls).toBe(1)
  })

  it('ne met jamais une erreur en cache', async () => {
    let calls = 0
    const fn = async () => { calls++; throw new Error('boom') }
    const t = () => 1000
    await expect(cached('k', 5000, fn, t)).rejects.toThrow('boom')
    await expect(cached('k', 5000, fn, t)).rejects.toThrow('boom')
    expect(calls).toBe(2) // réessayé, pas servi depuis le cache
  })

  it('isole les contextes par clé', async () => {
    const t = () => 1000
    expect(await cached('pays:CI', 5000, async () => 'ci', t)).toBe('ci')
    expect(await cached('pays:FR', 5000, async () => 'fr', t)).toBe('fr')
    expect(await cached('pays:CI', 5000, async () => 'autre', t)).toBe('ci')
  })
})

describe('invalidation', () => {
  it('invalide une clé précise', async () => {
    const t = () => 1000
    await cached('k', 5000, async () => 1, t)
    invalidate('k')
    expect(await cached('k', 5000, async () => 2, t)).toBe(2)
  })

  it('invalide par préfixe', async () => {
    const t = () => 1000
    await cached('gouv:CI', 5000, async () => 1, t)
    await cached('gouv:FR', 5000, async () => 1, t)
    await cached('autre', 5000, async () => 1, t)
    invalidatePrefix('gouv:')
    expect(cacheSize()).toBe(1)
  })
})
