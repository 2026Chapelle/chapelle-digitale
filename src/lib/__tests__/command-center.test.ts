import { describe, it, expect } from 'vitest'
import {
  fmtDevises, buildKpiTiles, clampContext, parseContext, attentionCount,
  type RawKpis, type CommandScope,
} from '@/lib/command-center'

const rawKpis = (o: Partial<RawKpis> = {}): RawKpis => ({
  membres_total: 0, nouveaux_30j: 0, membres_actifs: 0, dons_par_devise: {},
  dons_count: 0, prieres_attente: 0, formations_actives: 0, evenements_a_venir: 0,
  achats_marketplace: 0, connectes_now: 0, visiteurs_aujourdhui: 0, ...o,
})

describe('fmtDevises', () => {
  it('affiche 0 FCFA pour un total vide', () => {
    expect(fmtDevises({})).toBe('0 FCFA')
    expect(fmtDevises(null)).toBe('0 FCFA')
  })
  it('liste chaque devise sans jamais les additionner', () => {
    const s = fmtDevises({ XOF: 150000, EUR: 50 })
    expect(s).toContain('XOF')
    expect(s).toContain('EUR')
    expect(s).toContain('·')
  })
})

describe('buildKpiTiles', () => {
  it('produit 8 tuiles avec les clés attendues', () => {
    const tiles = buildKpiTiles(rawKpis(), 'global')
    expect(tiles).toHaveLength(8)
    expect(tiles.map((t) => t.key)).toEqual([
      'membres', 'croissance', 'presence', 'finances',
      'prieres', 'formations', 'evenements', 'marketplace',
    ])
  })
  it('n’ajoute pas de query en contexte global', () => {
    const tiles = buildKpiTiles(rawKpis(), 'global')
    expect(tiles.find((t) => t.key === 'membres')!.href).toBe('/admin/membres')
  })
  it('propage le contexte dans les liens profonds', () => {
    const tiles = buildKpiTiles(rawKpis(), 'nation:CI')
    expect(tiles.find((t) => t.key === 'membres')!.href).toBe('/admin/membres?context=nation%3ACI')
  })
  it('marque les prières en attente comme attention', () => {
    const tiles = buildKpiTiles(rawKpis({ prieres_attente: 4 }), 'global')
    expect(tiles.find((t) => t.key === 'prieres')!.tone).toBe('attention')
  })
  it('marque la croissance positive', () => {
    const tiles = buildKpiTiles(rawKpis({ nouveaux_30j: 12 }), 'global')
    expect(tiles.find((t) => t.key === 'croissance')!.tone).toBe('positif')
  })
})

describe('clampContext', () => {
  const global: CommandScope = { kind: 'global', paysAllowed: null, antenneIdsAllowed: null, label: 'global' }
  const nationFR: CommandScope = { kind: 'nation', paysAllowed: ['FR'], antenneIdsAllowed: null, label: 'nation:FR' }

  it('retourne global pour un super_admin sans contexte', () => {
    expect(clampContext(null, global)).toBe('global')
  })
  it('retombe sur la portée pour un pasteur de nation sans contexte', () => {
    expect(clampContext(null, nationFR)).toBe('nation:FR')
  })
  it('autorise toute nation pour une portée globale', () => {
    expect(clampContext('nation:ci', global)).toBe('nation:CI')
  })
  it('autorise une nation incluse dans la portée', () => {
    expect(clampContext('nation:fr', nationFR)).toBe('nation:FR')
  })
  it('ramène une nation hors portée à la portée autorisée', () => {
    expect(clampContext('nation:de', nationFR)).toBe('nation:FR')
  })
  it('laisse passer un contexte antenne (validé serveur)', () => {
    expect(clampContext('antenne:abc', global)).toBe('antenne:abc')
  })
})

describe('parseContext', () => {
  it('découpe les contextes en parties exploitables', () => {
    expect(parseContext('global')).toEqual({ kind: 'global', value: null })
    expect(parseContext('nation:CI')).toEqual({ kind: 'nation', value: 'CI' })
    expect(parseContext('antenne:abc')).toEqual({ kind: 'antenne', value: 'abc' })
  })
})

describe('attentionCount', () => {
  it('compte les tuiles en attention', () => {
    const tiles = buildKpiTiles(rawKpis({ prieres_attente: 1 }), 'global')
    expect(attentionCount(tiles)).toBe(1)
  })
})
