/**
 * CHARGEMENT LIVE — lecture serveur de `cms_lives`, normalisée et prête à l'affichage.
 *
 * Réutilise `cmsList` (@/lib/cms, server-only) pour la lecture Supabase — aucun
 * nouveau client n'est créé ici — et les fondations pures du module `@/lib/live`
 * (normalisation, partitionnement, calcul du prochain direct).
 *
 * SERVER-ONLY (chaîne d'import : cms.ts → supabaseAdmin). Ne pas importer depuis
 * un composant client.
 */
import { cmsList, type CmsLive } from '@/lib/cms'
import {
  computeNextLive,
  normalizeLives,
  partitionLives,
  sortReplays,
  sortUpcoming,
  type NormalizedLive,
  type RawCmsLive,
} from '@/lib/live'

/** Vue agrégée de `cms_lives`, prête pour l'affichage de la page /live. */
export interface LiveHubData {
  /** Premier live réellement en cours, sinon `null`. */
  liveNow: NormalizedLive | null
  /** Prochain à venir ; à défaut le live en cours ; sinon `null`. */
  nextLive: NormalizedLive | null
  /** Directs à venir, triés par date croissante. */
  upcoming: NormalizedLive[]
  /** Rediffusions disponibles, plus récentes en premier. */
  replays: NormalizedLive[]
  /** Ensemble normalisé, ordre brut de lecture. */
  all: NormalizedLive[]
  /** `true` si un contenu (en cours, à venir ou rediffusion) est disponible. */
  hasAny: boolean
}

/** Vue vide (démo, table absente ou erreur de lecture) — jamais d'exception exposée. */
function emptyLiveHubData(): LiveHubData {
  return { liveNow: null, nextLive: null, upcoming: [], replays: [], all: [], hasAny: false }
}

/**
 * Charge et normalise les données `cms_lives` publiques pour la page /live.
 * `now` est injectable pour des lectures déterministes (tests, previews).
 */
export async function loadLiveHubData(now?: Date): Promise<LiveHubData> {
  const rows = await cmsList<CmsLive>('cms_lives', {
    publicOnly: true,
    orderBy: 'scheduled_at',
    ascending: false,
  })

  if (!rows || rows.length === 0) return emptyLiveHubData()

  const all = normalizeLives(rows as unknown as RawCmsLive[], now)
  const { live, upcoming, replays } = partitionLives(all, now)

  const liveNow = live[0] ?? null
  const nextLive = computeNextLive(all, now)
  const sortedUpcoming = sortUpcoming(upcoming)
  const sortedReplays = sortReplays(replays)
  const hasAny = liveNow !== null || sortedUpcoming.length > 0 || sortedReplays.length > 0

  return { liveNow, nextLive, upcoming: sortedUpcoming, replays: sortedReplays, all, hasAny }
}
