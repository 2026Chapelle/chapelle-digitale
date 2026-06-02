import { describe, it, expect } from 'vitest'
import { TUNNEL_STAGES, TUNNEL_BY_KEY, nextStage, tunnelProgress } from '@/lib/tunnel'

describe('TUNNEL_STAGES', () => {
  it('compte 7 étapes indexées et ordonnées', () => {
    expect(TUNNEL_STAGES).toHaveLength(7)
    TUNNEL_STAGES.forEach((s, i) => expect(s.index).toBe(i))
  })
  it('indexe chaque étape par sa clé', () => {
    expect(TUNNEL_BY_KEY.visiteur.nom).toBe('Visiteur')
    expect(TUNNEL_BY_KEY.leader.nom).toBe('Leader')
    expect(Object.keys(TUNNEL_BY_KEY)).toHaveLength(7)
  })
})

describe('nextStage', () => {
  it('renvoie l’étape suivante', () => {
    expect(nextStage('visiteur')?.key).toBe('contact')
    expect(nextStage('disciple')?.key).toBe('membre')
  })
  it('renvoie null au sommet du tunnel', () => {
    expect(nextStage('leader')).toBeNull()
  })
})

describe('tunnelProgress', () => {
  it('va de 0 (visiteur) à 100 (leader)', () => {
    expect(tunnelProgress('visiteur')).toBe(0)
    expect(tunnelProgress('leader')).toBe(100)
  })
  it('calcule une progression intermédiaire', () => {
    // disciple = index 3 sur 6 → 50 %
    expect(tunnelProgress('disciple')).toBe(50)
  })
})
