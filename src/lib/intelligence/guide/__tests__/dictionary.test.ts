import { describe, it, expect } from 'vitest'
import {
  METRIC_DICTIONARY,
  METRIC_GROUP_ORDER,
  getMetric,
  metricsByGroup,
  type MetricDictionaryEntry,
} from '../dictionary'
import { CATEGORY_DEFS, FUNNEL_STAGE_DEFS } from '../../conversions/categories'
import { FRESHNESS_LEVELS } from '../../types/freshness'

const REQUIRED_TEXT_FIELDS: Array<keyof MetricDictionaryEntry> = [
  'name',
  'definition',
  'source',
  'howToRead',
  'whatGoodMeans',
  'whatBadMeans',
  'whatToDo',
  'limitations',
]

describe('METRIC_DICTIONARY — intégrité', () => {
  it('chaque métrique possède TOUS les champs requis, non vides', () => {
    for (const m of METRIC_DICTIONARY) {
      for (const f of REQUIRED_TEXT_FIELDS) {
        expect(typeof m[f], `${m.key}.${String(f)}`).toBe('string')
        expect((m[f] as string).trim().length, `${m.key}.${String(f)} non vide`).toBeGreaterThan(0)
      }
      expect(FRESHNESS_LEVELS).toContain(m.freshness)
      expect(METRIC_GROUP_ORDER).toContain(m.group)
    }
  })

  it('les clés sont uniques', () => {
    const keys = METRIC_DICTIONARY.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('le dictionnaire est non trivial (couverture large)', () => {
    expect(METRIC_DICTIONARY.length).toBeGreaterThanOrEqual(25)
  })
})

describe('getMetric — recherche par clé', () => {
  it('retourne l’entrée pour une clé connue', () => {
    const m = getMetric('conv_generosite')
    expect(m?.name).toContain('Générosité')
  })

  it('retourne undefined pour une clé inconnue (jamais d’erreur)', () => {
    expect(getMetric('inexistante_xyz')).toBeUndefined()
  })
})

describe('metricsByGroup', () => {
  it('couvre exactement toutes les entrées, dans l’ordre canonique', () => {
    const grouped = metricsByGroup()
    expect(grouped.map((g) => g.group)).toEqual([...METRIC_GROUP_ORDER])
    const total = grouped.reduce((n, g) => n + g.entries.length, 0)
    expect(total).toBe(METRIC_DICTIONARY.length)
  })
})

describe('couverture des métriques du hub Conversions', () => {
  it('chaque catégorie de conversion a une entrée de dictionnaire', () => {
    for (const def of CATEGORY_DEFS) {
      expect(getMetric(def.metricKey), `catégorie ${def.key} → ${def.metricKey}`).toBeDefined()
    }
  })

  it('chaque étape du tunnel a une entrée de dictionnaire', () => {
    for (const def of FUNNEL_STAGE_DEFS) {
      expect(getMetric(def.metricKey), `étape ${def.key} → ${def.metricKey}`).toBeDefined()
    }
  })

  it('les métriques transverses clés sont documentées', () => {
    for (const key of [
      'page_views',
      'active_sessions',
      'logins',
      'signups',
      'podcast_starts',
      'video_starts',
      'lesson_completions',
      'gsc_impressions',
      'gsc_clicks',
      'gsc_ctr',
      'gsc_position',
      'ga4_organic_sessions',
      'youtube_views',
      'youtube_watch_time',
      'meta_reach',
      'meta_interactions',
      'whatsapp_attribution',
      'source_attribution',
      'conversion_rate',
    ]) {
      expect(getMetric(key), key).toBeDefined()
    }
  })
})
