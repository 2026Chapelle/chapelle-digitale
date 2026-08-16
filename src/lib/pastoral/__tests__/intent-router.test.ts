import { describe, it, expect } from 'vitest'
import { routeIntent, normalizeQuestion, DATA_INTENTS } from '@/lib/pastoral/intent-router'

describe('normalizeQuestion', () => {
  it('met en minuscules, retire accents et ponctuation', () => {
    expect(normalizeQuestion('Priorité ?')).toBe('priorite')
    expect(normalizeQuestion('  Conversions à VÉRIFIER !! ')).toBe('conversions a verifier')
  })
})

describe('routeIntent — 6 questions d’exemple', () => {
  const cases: [string, string][] = [
    ['Fais-moi un rapport pastoral de cette semaine.', 'rapport_global'],
    ['Qui dois-je suivre en priorité ?', 'suivis_prioritaires'],
    ['Montre-moi les nouveaux venus sans responsable.', 'non_assignes'],
    ['Quelles conversions doivent être vérifiées ?', 'conversions_a_verifier'],
    ['Quelles recommandations pastorales proposes-tu ?', 'rapport_global'],
    ['Quelles données sont indisponibles ?', 'limites_donnees'],
  ]
  for (const [q, expected] of cases) {
    it(`"${q}" → ${expected}`, () => {
      const r = routeIntent(q)
      expect(r.intent).toBe(expected)
      expect(r.confidence).toBe('sure')
      expect(r.matched.length).toBeGreaterThan(0)
    })
  }
})

describe('routeIntent — désambiguïsation & garde-fous', () => {
  it('« nouveaux venus sans responsable » privilégie non_assignes', () => {
    expect(routeIntent('les nouveaux venus sans responsable').intent).toBe('non_assignes')
  })
  it('« par zone » → limites_donnees (donnée géo absente sur NV)', () => {
    expect(routeIntent('montre les nouveaux venus par zone').intent).toBe('limites_donnees')
  })
  it('question hors périmètre → unknown (aucune invention)', () => {
    const r = routeIntent('Quel est ton film préféré ?')
    expect(r.intent).toBe('unknown')
    expect(r.matched).toEqual([])
  })
  it('question vide → unknown', () => {
    expect(routeIntent('   ').intent).toBe('unknown')
  })
  it('déclencheur faible seul (« cette semaine ») → rapport_global weak', () => {
    const r = routeIntent('et cette semaine ?')
    expect(r.intent).toBe('rapport_global')
    expect(r.confidence).toBe('weak')
  })
})

describe('DATA_INTENTS — allow-list d’accès données (anti-régression sécurité)', () => {
  it('exclut unknown et limites_donnees (aucune lecture base pour eux)', () => {
    expect(DATA_INTENTS.has('unknown')).toBe(false)
    expect(DATA_INTENTS.has('limites_donnees')).toBe(false)
  })
  it('inclut exactement les 6 intents qui lisent les demandes', () => {
    expect(DATA_INTENTS.has('rapport_global')).toBe(true)
    expect(DATA_INTENTS.has('suivis_prioritaires')).toBe(true)
    expect(DATA_INTENTS.has('nouveaux_venus')).toBe(true)
    expect(DATA_INTENTS.has('non_assignes')).toBe(true)
    expect(DATA_INTENTS.has('conversions_a_verifier')).toBe(true)
    expect(DATA_INTENTS.has('notes_manquantes')).toBe(true)
    expect(DATA_INTENTS.size).toBe(6)
  })
})

describe('routeIntent — V2.5-B.2-C questions renforcées', () => {
  const cases: [string, string][] = [
    ['Donne-moi les priorités pastorales.', 'suivis_prioritaires'],
    ['Qui doit être contacté en premier ?', 'suivis_prioritaires'],
    ['Qui n’a pas de note pastorale ?', 'notes_manquantes'],
    ['Quels suivis semblent urgents ?', 'suivis_prioritaires'],
    ['Quelles recommandations proposes-tu cette semaine ?', 'rapport_global'],
  ]
  for (const [q, expected] of cases) {
    it(`"${q}" → ${expected}`, () => {
      const r = routeIntent(q)
      expect(r.intent).toBe(expected)
      expect(r.confidence).toBe('sure')
    })
  }
  it('les 9 questions suggérées sont toutes routables (aucune unknown)', async () => {
    const { SUGGESTED_QUESTIONS } = await import('@/lib/pastoral/intent-router')
    for (const q of SUGGESTED_QUESTIONS) expect(routeIntent(q).intent).not.toBe('unknown')
  })
})
