/**
 * PODCAST-8 — Recommandations & personnalisation. Modèle PUR, DÉTERMINISTE et EXPLICABLE
 * (aucun ML, aucun random, aucune I/O). Score = somme pondérée de signaux internes déjà
 * disponibles : affinité de série (progression récente), affinité playlists, popularité
 * globale (PODCAST-4 agrégé, non nominatif), fraîcheur, mise en avant, pénalité « déjà terminé ».
 *
 * NE CONTOURNE JAMAIS l'accès : le rang n'a aucun pouvoir de lecture ; la lecture reste
 * gatée par PODCAST-SEC. PRIVACY : aucun PII n'entre ici — uniquement des ids et des signaux
 * agrégés/anonymes. DÉTERMINISME : mêmes entrées ⇒ même ordre (tri stable + tie-break id).
 */
import type { PodcastAccessLevel } from './editorial'

export interface RecoEpisode {
  id: string
  serie?: string | null
  accessLevel?: PodcastAccessLevel
  isFeatured?: boolean
  publishedAt?: string | null
  hasAudio?: boolean
}

/** Ligne de progression (PODCAST-2) réduite aux champs utiles au ranking. */
export interface ProgressSignal {
  podcast_id: string
  completed: boolean
  last_played_at: string
  position_seconds?: number
}

export interface PopularityEntry { plays: number; unique_listeners: number; completion_rate: number }
export type PopularityMap = Record<string, PopularityEntry | undefined>

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

const HALF_LIFE_DAYS = 30
/** Décroissance temporelle douce : 1 (maintenant) → 0.5 à la demi-vie. */
export function recencyDecay(iso: string | null | undefined, nowMs: number, halfLifeDays = HALF_LIFE_DAYS): number {
  const t = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(t)) return 0
  const ageDays = Math.max(0, (nowMs - t) / 86_400_000)
  return Math.pow(0.5, ageDays / halfLifeDays)
}

function normalizeMap(m: Map<string, number>): Map<string, number> {
  let max = 0
  m.forEach((v) => { if (v > max) max = v })
  if (max <= 0) return new Map(m)
  const out = new Map<string, number>()
  m.forEach((v, k) => out.set(k, v / max))
  return out
}

// ── Signaux du membre (dérivés PURS de sa progression + ses playlists) ──────

export interface MemberSignals {
  /** Affinité par série (progression pondérée par la récence), normalisée 0..1. */
  seriesAffinity: Map<string, number>
  /** Affinité par série issue des playlists personnelles, normalisée 0..1. */
  playlistSeries: Map<string, number>
  completedIds: Set<string>
  startedIds: Set<string>
  playlistEpisodeIds: Set<string>
  /** Série la plus écoutée (pour « Parce que tu écoutes … »). */
  topSerie: string | null
  /** Séries par récence d'écoute décroissante. */
  recentSerieOrder: string[]
  hasHistory: boolean
}

export const EMPTY_SIGNALS: MemberSignals = {
  seriesAffinity: new Map(), playlistSeries: new Map(),
  completedIds: new Set(), startedIds: new Set(), playlistEpisodeIds: new Set(),
  topSerie: null, recentSerieOrder: [], hasHistory: false,
}

export function buildMemberSignals(
  progress: ProgressSignal[] | null | undefined,
  playlistEpisodeIds: Iterable<string>,
  episodesById: Map<string, RecoEpisode>,
  nowMs: number,
): MemberSignals {
  const rawSeries = new Map<string, number>()
  const serieRecency = new Map<string, number>()
  const completedIds = new Set<string>()
  const startedIds = new Set<string>()

  for (const r of (Array.isArray(progress) ? progress : [])) {
    if (!r || !r.podcast_id) continue
    if (r.completed) completedIds.add(r.podcast_id)
    else if ((r.position_seconds ?? 1) > 0) startedIds.add(r.podcast_id)
    const serie = episodesById.get(r.podcast_id)?.serie
    if (serie) {
      const s = String(serie)
      rawSeries.set(s, (rawSeries.get(s) ?? 0) + recencyDecay(r.last_played_at, nowMs))
      const at = Date.parse(r.last_played_at) || 0
      if (at > (serieRecency.get(s) ?? 0)) serieRecency.set(s, at)
    }
  }

  const playlistEpisodeIdSet = new Set<string>()
  const rawPlaylistSeries = new Map<string, number>()
  for (const id of Array.from(playlistEpisodeIds ?? [])) {
    playlistEpisodeIdSet.add(id)
    const serie = episodesById.get(id)?.serie
    if (serie) rawPlaylistSeries.set(String(serie), (rawPlaylistSeries.get(String(serie)) ?? 0) + 1)
  }

  const recentSerieOrder = Array.from(serieRecency.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s)
  const topSerie = Array.from(rawSeries.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null

  return {
    seriesAffinity: normalizeMap(rawSeries),
    playlistSeries: normalizeMap(rawPlaylistSeries),
    completedIds, startedIds,
    playlistEpisodeIds: playlistEpisodeIdSet,
    topSerie, recentSerieOrder,
    hasHistory: rawSeries.size > 0 || completedIds.size > 0 || startedIds.size > 0 || playlistEpisodeIdSet.size > 0,
  }
}

/**
 * Popularité globale normalisée 0..1. PODCAST-4 agrégé, non nominatif.
 * Basée sur les AUDITEURS UNIQUES (pas le nombre brut de plays) : un même membre qui rejoue
 * en boucle ne gonfle donc pas le classement pour les autres (anti-auto-inflation).
 */
export function normalizePopularity(pop: PopularityMap | null | undefined): Map<string, number> {
  const out = new Map<string, number>()
  if (!pop) return out
  let max = 0
  for (const k in pop) { const e = pop[k]; if (e && e.unique_listeners > max) max = e.unique_listeners }
  if (max <= 0) return out
  for (const k in pop) { const e = pop[k]; if (e && e.unique_listeners > 0) out.set(k, e.unique_listeners / max) }
  return out
}

// ── Score explicable ────────────────────────────────────────────────────────

export interface RecoWeights {
  series: number; recent: number; playlist: number; popularity: number; recency: number; featured: number; completedPenalty: number
}
export const DEFAULT_WEIGHTS: RecoWeights = {
  series: 0.34, recent: 0.16, playlist: 0.18, popularity: 0.16, recency: 0.12, featured: 0.04, completedPenalty: 0.6,
}

export interface RecoFeatures {
  seriesAffinity: number
  recentListening: number
  playlistAffinity: number
  popularity: number
  recency: number
  isFeatured: boolean
  alreadyCompleted: boolean
}

/** Score déterministe, borné et explicable. « déjà terminé » applique une forte pénalité. */
export function scoreRecommendation(f: RecoFeatures, w: RecoWeights = DEFAULT_WEIGHTS): number {
  const base =
    w.series * clamp01(f.seriesAffinity) +
    w.recent * clamp01(f.recentListening) +
    w.playlist * clamp01(f.playlistAffinity) +
    w.popularity * clamp01(f.popularity) +
    w.recency * clamp01(f.recency) +
    (f.isFeatured ? w.featured : 0)
  return f.alreadyCompleted ? base - w.completedPenalty : base
}

// ── Ranking + diversité ──────────────────────────────────────────────────────

export type RecoMode = 'listen_now' | 'discovery'

export type RecoReason =
  | { kind: 'because_series'; serie: string }
  | { kind: 'popular' }
  | { kind: 'new'; serie: string | null }
  | { kind: 'discover' }

export interface RecoItem { episode: RecoEpisode; score: number; reason: RecoReason }

export interface RankOptions {
  episodes: RecoEpisode[]
  signals?: MemberSignals | null
  popularity?: Map<string, number> | null
  nowMs: number
  isPremiumActive?: boolean
  /** L'utilisateur est-il un MEMBRE réel (membre_statut <> 'visiteur') ? Défaut true.
   *  En mode listen_now, un non-membre ne voit pas les épisodes 'member' (cohérence « écoutable maintenant »). */
  isMember?: boolean
  mode: RecoMode
  excludeIds?: Iterable<string>
  limit?: number
  maxConsecutiveSerie?: number
  weights?: RecoWeights
}

function recentListeningFeature(serie: string | null, recentSerieOrder: string[]): number {
  if (!serie) return 0
  const i = recentSerieOrder.indexOf(serie)
  if (i < 0) return 0
  return i === 0 ? 1 : i <= 2 ? 0.6 : 0.3
}

/** Recommandations classées. Filtre l'accès selon le MODE (jamais un contournement),
 *  exclut le déjà-terminé / en-cours, score, trie de façon stable, applique la diversité. */
export function rankRecommendations(o: RankOptions): RecoItem[] {
  const signals = o.signals ?? EMPTY_SIGNALS
  const popularity = o.popularity ?? new Map<string, number>()
  const exclude = new Set(o.excludeIds ? Array.from(o.excludeIds) : [])
  const limit = o.limit ?? 12
  const maxConsecutive = o.maxConsecutiveSerie ?? 2
  const premium = o.isPremiumActive === true
  const isMember = o.isMember !== false // défaut : membre

  const candidates: RecoItem[] = []
  for (const ep of (Array.isArray(o.episodes) ? o.episodes : [])) {
    if (!ep || !ep.id) continue
    if (ep.hasAudio === false) continue
    if (exclude.has(ep.id)) continue
    // Déjà terminé / commencé → hors reco (le commencé est repris via « Continuer l'écoute »).
    if (signals.completedIds.has(ep.id) || signals.startedIds.has(ep.id)) continue
    // Accès en mode « écoutable maintenant » (stratégie A) : on masque ce qui n'est PAS
    // lisible tout de suite — Premium sans droit, ET 'member' pour un non-membre (visiteur
    // authentifié). En mode « découverte » (stratégie B) on garde tout : badge + gate PODCAST-6.
    if (o.mode === 'listen_now') {
      if (ep.accessLevel === 'premium' && !premium) continue
      if (ep.accessLevel === 'member' && !isMember) continue
    }

    const serie = ep.serie ? String(ep.serie) : null
    const seriesAffinity = serie ? (signals.seriesAffinity.get(serie) ?? 0) : 0
    const playlistAffinity = serie ? (signals.playlistSeries.get(serie) ?? 0) : 0
    const pop = popularity.get(ep.id) ?? 0
    const recency = recencyDecay(ep.publishedAt, o.nowMs, 45)
    const recent = recentListeningFeature(serie, signals.recentSerieOrder)

    const score = scoreRecommendation({
      seriesAffinity, recentListening: recent, playlistAffinity, popularity: pop,
      recency, isFeatured: ep.isFeatured === true, alreadyCompleted: false,
    }, o.weights)

    let reason: RecoReason
    if (serie && seriesAffinity > 0) reason = { kind: 'because_series', serie }
    else if (pop >= 0.6) reason = { kind: 'popular' }
    else if (recency >= 0.6) reason = { kind: 'new', serie }
    else reason = { kind: 'discover' }

    candidates.push({ episode: ep, score, reason })
  }

  // Tri stable : score décroissant, puis publié le plus récent, puis id (déterministe).
  candidates.sort((a, b) =>
    (b.score - a.score) ||
    ((Date.parse(b.episode.publishedAt || '') || 0) - (Date.parse(a.episode.publishedAt || '') || 0)) ||
    a.episode.id.localeCompare(b.episode.id),
  )

  return applyDiversity(candidates, maxConsecutive).slice(0, Math.max(0, limit))
}

/**
 * Diversité : empêche plus de `maxConsecutive` épisodes consécutifs d'une même série,
 * en réinsérant au plus tôt un item d'une autre série. Déterministe, préserve au mieux l'ordre.
 */
export function applyDiversity(items: RecoItem[], maxConsecutive = 2): RecoItem[] {
  if (maxConsecutive <= 0) return items.slice()
  const pending = items.slice()
  const result: RecoItem[] = []
  while (pending.length) {
    let idx = 0
    const lastSerie = result.length ? (result[result.length - 1].episode.serie ?? null) : undefined
    if (lastSerie !== undefined) {
      let streak = 0
      for (let i = result.length - 1; i >= 0; i--) {
        if ((result[i].episode.serie ?? null) === lastSerie) streak++
        else break
      }
      if (streak >= maxConsecutive) {
        const alt = pending.findIndex((it) => (it.episode.serie ?? null) !== lastSerie)
        if (alt >= 0) idx = alt
      }
    }
    result.push(pending.splice(idx, 1)[0])
  }
  return result
}
