import { describe, it, expect } from 'vitest'
import {
  toSeverite, rollupAlerts, healthIndex, worldHealthIndex, healthLabel,
  consolidateDevises, globalPulse, type GlobalAlert,
} from '@/lib/global-intelligence'

const alert = (o: Partial<GlobalAlert> = {}): GlobalAlert => ({
  source: 'sante', severite: 'info', titre: 'x', scope: null, ...o,
})

describe('toSeverite', () => {
  it('normalise les libellés libres', () => {
    expect(toSeverite('critical')).toBe('critique')
    expect(toSeverite('high')).toBe('haute')
    expect(toSeverite('warning')).toBe('moyenne')
    expect(toSeverite('quelconque')).toBe('info')
  })
})

describe('rollupAlerts', () => {
  it('compte par sévérité et trie les plus graves en tête', () => {
    const r = rollupAlerts([
      alert({ severite: 'info' }),
      alert({ severite: 'critique' }),
      alert({ severite: 'moyenne' }),
      alert({ severite: 'critique' }),
    ])
    expect(r.total).toBe(4)
    expect(r.counts.critique).toBe(2)
    expect(r.counts.info).toBe(1)
    expect(r.top[0].severite).toBe('critique')
  })
  it('borne le top à 20', () => {
    const many = Array.from({ length: 30 }, () => alert({ severite: 'info' }))
    expect(rollupAlerts(many).top).toHaveLength(20)
  })
})

describe('healthIndex', () => {
  it('vaut 100 si tous très engagés', () => {
    expect(healthIndex({ scope_key: 'FR', membres: 1, niveaux: { tres_engage: 1 } })).toBe(100)
  })
  it('vaut 0 si tous inactifs', () => {
    expect(healthIndex({ scope_key: 'FR', membres: 2, niveaux: { inactif: 2 } })).toBe(0)
  })
  it('moyenne pondérée pour un mélange', () => {
    // (100 + 0) / 2 = 50
    expect(healthIndex({ scope_key: 'FR', membres: 2, niveaux: { tres_engage: 1, inactif: 1 } })).toBe(50)
  })
  it('vaut 0 sans aucun membre classé', () => {
    expect(healthIndex({ scope_key: 'FR', membres: 0, niveaux: {} })).toBe(0)
  })
})

describe('worldHealthIndex', () => {
  it('pondère les indices territoriaux par le nombre de membres', () => {
    const rows = [
      { scope_key: 'FR', membres: 1, niveaux: { tres_engage: 1 } },   // indice 100
      { scope_key: 'CI', membres: 3, niveaux: { inactif: 3 } },        // indice 0
    ]
    // (100×1 + 0×3) / 4 = 25
    const r = worldHealthIndex(rows)
    expect(r.indice).toBe(25)
    // les plus fragiles en tête
    expect(r.parTerritoire[0].scope_key).toBe('CI')
  })
})

describe('healthLabel', () => {
  it('mappe l’indice sur un libellé qualitatif', () => {
    expect(healthLabel(80).label).toBe('Florissante')
    expect(healthLabel(60).label).toBe('Saine')
    expect(healthLabel(45).label).toBe('À consolider')
    expect(healthLabel(30).label).toBe('Fragile')
    expect(healthLabel(10).label).toBe('En déclin')
  })
})

describe('consolidateDevises', () => {
  it('somme par devise normalisée, jamais entre devises', () => {
    const out = consolidateDevises([
      { devise: 'xof', montant: 1000 },
      { devise: 'XOF', montant: 500 },
      { devise: 'eur', montant: 20 },
    ])
    expect(out.XOF).toBe(1500)
    expect(out.EUR).toBe(20)
  })
})

describe('globalPulse', () => {
  it('agrège santé + alertes, attention = critiques + hautes', () => {
    const p = globalPulse({ indice: 80 }, [
      alert({ severite: 'critique' }),
      alert({ severite: 'haute' }),
      alert({ severite: 'info' }),
    ])
    expect(p.sante_label).toBe('Florissante')
    expect(p.attention).toBe(2)
    expect(p.alertes.total).toBe(3)
  })
})
