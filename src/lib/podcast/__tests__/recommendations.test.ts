import { describe, it, expect } from 'vitest'
import {
  buildMemberSignals, normalizePopularity, scoreRecommendation, rankRecommendations,
  applyDiversity, recencyDecay, DEFAULT_WEIGHTS,
  type RecoEpisode, type ProgressSignal, type PopularityMap, type RecoItem,
} from '../recommendations'

const NOW = Date.parse('2026-08-14T12:00:00.000Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

const ep = (id: string, p: Partial<RecoEpisode> = {}): RecoEpisode => ({
  id, serie: p.serie ?? null, accessLevel: p.accessLevel ?? 'member',
  isFeatured: p.isFeatured ?? false, publishedAt: p.publishedAt ?? daysAgo(200), hasAudio: p.hasAudio ?? true,
})
const byId = (list: RecoEpisode[]) => new Map(list.map((e) => [e.id, e]))
const ids = (items: RecoItem[]) => items.map((i) => i.episode.id)

describe('recencyDecay (pur)', () => {
  it('1 maintenant, 0.5 à la demi-vie, ~0 lointain', () => {
    expect(recencyDecay(daysAgo(0), NOW, 30)).toBeCloseTo(1, 5)
    expect(recencyDecay(daysAgo(30), NOW, 30)).toBeCloseTo(0.5, 5)
    expect(recencyDecay(null, NOW)).toBe(0)
  })
})

describe('scoreRecommendation (explicable, pénalité terminé)', () => {
  const base = { seriesAffinity: 1, recentListening: 1, playlistAffinity: 1, popularity: 1, recency: 1, isFeatured: true, alreadyCompleted: false }
  it('somme pondérée bornée', () => {
    const s = scoreRecommendation(base)
    const max = DEFAULT_WEIGHTS.series + DEFAULT_WEIGHTS.recent + DEFAULT_WEIGHTS.playlist + DEFAULT_WEIGHTS.popularity + DEFAULT_WEIGHTS.recency + DEFAULT_WEIGHTS.featured
    expect(s).toBeCloseTo(max, 6)
  })
  it('déjà terminé → forte pénalité', () => {
    expect(scoreRecommendation({ ...base, alreadyCompleted: true })).toBeLessThan(scoreRecommendation(base))
  })
})

describe('normalizePopularity', () => {
  it('normalise par le max d’AUDITEURS UNIQUES (anti auto-inflation) ; ignore 0', () => {
    const m = normalizePopularity({ a: { plays: 10, unique_listeners: 4, completion_rate: 0.5 }, b: { plays: 999, unique_listeners: 1, completion_rate: 0.4 }, c: { plays: 0, unique_listeners: 0, completion_rate: 0 } })
    expect(m.get('a')).toBe(1)            // 4 auditeurs uniques → max
    expect(m.get('b')).toBe(0.25)         // 1 auditeur qui rejoue 999× ne domine pas
    expect(m.has('c')).toBe(false)
  })
})

describe('buildMemberSignals', () => {
  const episodes = [ep('e1', { serie: 'Instant' }), ep('e2', { serie: 'Instant' }), ep('e3', { serie: 'Vision' })]
  const prog: ProgressSignal[] = [
    { podcast_id: 'e1', completed: true, last_played_at: daysAgo(1) },
    { podcast_id: 'e3', completed: false, last_played_at: daysAgo(2), position_seconds: 120 },
  ]
  it('affinité série + complétés + commencés + topSerie', () => {
    const s = buildMemberSignals(prog, ['e2'], byId(episodes), NOW)
    expect(s.completedIds.has('e1')).toBe(true)
    expect(s.startedIds.has('e3')).toBe(true)
    expect(s.seriesAffinity.get('Instant')).toBeGreaterThan(0)
    expect(s.playlistSeries.get('Instant')).toBeGreaterThan(0) // e2 en playlist
    expect(s.hasHistory).toBe(true)
    expect(s.topSerie).toBeTruthy()
  })
  it('aucune donnée → signaux vides (cold start)', () => {
    const s = buildMemberSignals([], [], byId(episodes), NOW)
    expect(s.hasHistory).toBe(false)
    expect(s.topSerie).toBeNull()
  })
})

describe('rankRecommendations', () => {
  const catalog = [
    ep('inst1', { serie: 'Instant', publishedAt: daysAgo(100) }),
    ep('inst2', { serie: 'Instant', publishedAt: daysAgo(120) }),
    ep('vis1', { serie: 'Vision', publishedAt: daysAgo(3) }),   // récent
    ep('vis2', { serie: 'Vision', publishedAt: daysAgo(400) }),
    ep('teach1', { serie: 'Enseignement', publishedAt: daysAgo(300) }),
    ep('prem1', { serie: 'Vision', accessLevel: 'premium', publishedAt: daysAgo(10) }),
  ]

  it('cold-start : membre sans historique → liste NON vide (fallback popularité/récence)', () => {
    const out = rankRecommendations({ episodes: catalog, signals: null, popularity: normalizePopularity({ inst1: { plays: 9, unique_listeners: 3, completion_rate: 0.5 } }), nowMs: NOW, mode: 'discovery' })
    expect(out.length).toBeGreaterThan(0)
  })

  it('affinité série : la série écoutée remonte', () => {
    const prog: ProgressSignal[] = [{ podcast_id: 'inst1', completed: false, position_seconds: 100, last_played_at: daysAgo(1) }]
    const signals = buildMemberSignals(prog, [], byId(catalog), NOW)
    const out = rankRecommendations({ episodes: catalog, signals, popularity: new Map(), nowMs: NOW, mode: 'listen_now' })
    // inst1 est "commencé" (exclu) mais inst2 (même série) doit être bien classé.
    expect(ids(out)).toContain('inst2')
    const inst2Rank = ids(out).indexOf('inst2')
    const teachRank = ids(out).indexOf('teach1')
    expect(inst2Rank).toBeLessThan(teachRank) // Instant (affinité) devant Enseignement (aucune)
  })

  it('affinité playlist : un épisode de la série en playlist est boosté', () => {
    const signals = buildMemberSignals([], ['teach1'], byId(catalog), NOW)
    const out = rankRecommendations({ episodes: catalog, signals, popularity: new Map(), nowMs: NOW, mode: 'discovery' })
    // Enseignement gagne une affinité playlist → teach1 devant une série sans signal ni récence.
    expect(ids(out).indexOf('teach1')).toBeLessThan(ids(out).indexOf('inst2'))
  })

  it('épisode terminé → exclu', () => {
    const prog: ProgressSignal[] = [{ podcast_id: 'vis1', completed: true, last_played_at: daysAgo(1) }]
    const signals = buildMemberSignals(prog, [], byId(catalog), NOW)
    const out = rankRecommendations({ episodes: catalog, signals, popularity: new Map(), nowMs: NOW, mode: 'discovery' })
    expect(ids(out)).not.toContain('vis1')
  })

  it('récence : un épisode récent est boosté', () => {
    const out = rankRecommendations({ episodes: catalog, signals: null, popularity: new Map(), nowMs: NOW, mode: 'discovery' })
    expect(ids(out).indexOf('vis1')).toBeLessThan(ids(out).indexOf('vis2')) // vis1 (3j) devant vis2 (400j)
  })

  it('popularité : un épisode populaire est boosté', () => {
    const pop = normalizePopularity({ teach1: { plays: 100, unique_listeners: 50, completion_rate: 0.8 } })
    const out = rankRecommendations({ episodes: catalog, signals: null, popularity: pop, nowMs: NOW, mode: 'discovery' })
    expect(ids(out)[0]).toBe('teach1')
    expect(out[0].reason.kind).toBe('popular')
  })

  it('Premium inaccessible : masqué en listen_now (non-Premium), visible en discovery', () => {
    const listen = rankRecommendations({ episodes: catalog, signals: null, popularity: new Map(), nowMs: NOW, mode: 'listen_now', isPremiumActive: false })
    expect(ids(listen)).not.toContain('prem1')
    const disc = rankRecommendations({ episodes: catalog, signals: null, popularity: new Map(), nowMs: NOW, mode: 'discovery', isPremiumActive: false })
    expect(ids(disc)).toContain('prem1')
    const premMember = rankRecommendations({ episodes: catalog, signals: null, popularity: new Map(), nowMs: NOW, mode: 'listen_now', isPremiumActive: true })
    expect(ids(premMember)).toContain('prem1')
  })

  it('non-membre (visiteur authentifié) : listen_now masque aussi les épisodes member', () => {
    const nonMember = rankRecommendations({ episodes: catalog, signals: null, popularity: new Map(), nowMs: NOW, mode: 'listen_now', isPremiumActive: false, isMember: false })
    // catalog est majoritairement 'member' → tout masqué en listen_now pour un non-membre.
    expect(ids(nonMember).some((id) => ['inst1', 'inst2', 'vis1', 'vis2', 'teach1'].includes(id))).toBe(false)
    // En découverte, ils restent visibles (gate à la lecture).
    const disc = rankRecommendations({ episodes: catalog, signals: null, popularity: new Map(), nowMs: NOW, mode: 'discovery', isMember: false })
    expect(ids(disc).length).toBeGreaterThan(0)
  })

  it('déterminisme : mêmes entrées → même ordre', () => {
    const args = { episodes: catalog, signals: null, popularity: normalizePopularity({ inst1: { plays: 3, unique_listeners: 1, completion_rate: 0.3 } }), nowMs: NOW, mode: 'discovery' as const }
    expect(ids(rankRecommendations(args))).toEqual(ids(rankRecommendations(args)))
  })

  it('hasAudio=false exclu', () => {
    const withNoAudio = [...catalog, ep('noaudio', { serie: 'Vision', hasAudio: false, publishedAt: daysAgo(0) })]
    expect(ids(rankRecommendations({ episodes: withNoAudio, signals: null, popularity: new Map(), nowMs: NOW, mode: 'discovery' }))).not.toContain('noaudio')
  })
})

describe('applyDiversity (max 2 consécutifs d’une série)', () => {
  const it2 = (id: string, serie: string): RecoItem => ({ episode: ep(id, { serie }), score: 1, reason: { kind: 'discover' } })
  it('empêche > 2 épisodes consécutifs de la même série', () => {
    const input = [it2('a1', 'A'), it2('a2', 'A'), it2('a3', 'A'), it2('b1', 'B'), it2('a4', 'A')]
    const out = applyDiversity(input, 2).map((i) => i.episode.serie)
    // Aucune fenêtre de 3 consécutifs identiques.
    for (let i = 2; i < out.length; i++) expect(out[i] === out[i - 1] && out[i - 1] === out[i - 2]).toBe(false)
    expect(out.length).toBe(5) // aucun item perdu
  })
})
