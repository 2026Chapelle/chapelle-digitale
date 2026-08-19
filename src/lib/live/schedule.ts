/**
 * PLANIFICATION LIVE — tri, partitionnement et calcul du prochain direct.
 *
 * Module PUR : aucun programme n'est codé en dur ici. `nextWeeklyOccurrence`
 * est une primitive générique de calcul de date ; la grille des émissions
 * réelles viendra des données (table `cms_lives` ou équivalent) plus tard.
 */
import type { NormalizedLive } from './types'

/** Répartit les lives normalisés par état, en ignorant 'ended' (non affiché). */
export function partitionLives(
  items: NormalizedLive[],
  now: Date = new Date(),
): { live: NormalizedLive[]; upcoming: NormalizedLive[]; replays: NormalizedLive[] } {
  void now // l'état est déjà calculé dans NormalizedLive.state (voir normalizeLive)
  const live: NormalizedLive[] = []
  const upcoming: NormalizedLive[] = []
  const replays: NormalizedLive[] = []

  for (const item of items) {
    if (item.state === 'live') live.push(item)
    else if (item.state === 'upcoming') upcoming.push(item)
    else if (item.state === 'replay') replays.push(item)
  }

  return { live, upcoming, replays }
}

/** Trie les lives à venir par `scheduledAt` croissant ; les dates nulles vont en dernier. */
export function sortUpcoming(items: NormalizedLive[]): NormalizedLive[] {
  return [...items].sort((a, b) => {
    if (a.scheduledAt === null && b.scheduledAt === null) return 0
    if (a.scheduledAt === null) return 1
    if (b.scheduledAt === null) return -1
    return a.scheduledAt.getTime() - b.scheduledAt.getTime()
  })
}

/**
 * Trie les replays du plus récent au plus ancien (`scheduledAt` décroissant).
 * Les dates nulles vont en dernier. Départage par `sort_order` (croissant).
 */
export function sortReplays(items: NormalizedLive[]): NormalizedLive[] {
  return [...items].sort((a, b) => {
    if (a.scheduledAt === null && b.scheduledAt === null) {
      return (a.raw.sort_order ?? 0) - (b.raw.sort_order ?? 0)
    }
    if (a.scheduledAt === null) return 1
    if (b.scheduledAt === null) return -1

    const diff = b.scheduledAt.getTime() - a.scheduledAt.getTime()
    if (diff !== 0) return diff
    return (a.raw.sort_order ?? 0) - (b.raw.sort_order ?? 0)
  })
}

/**
 * Calcule le "prochain live" à mettre en avant :
 *  - l'événement 'upcoming' au `scheduledAt` le plus proche dans le futur, sinon
 *  - un 'live' en cours (le premier trouvé), sinon
 *  - `null`.
 */
export function computeNextLive(items: NormalizedLive[], now: Date = new Date()): NormalizedLive | null {
  const upcoming = items.filter((item) => item.state === 'upcoming' && item.scheduledAt !== null)
  if (upcoming.length > 0) {
    const sorted = sortUpcoming(upcoming)
    return sorted[0] ?? null
  }

  const live = items.find((item) => item.state === 'live')
  if (live) return live

  return null
}

/**
 * Créneau hebdomadaire générique (jour + heure), sans référence à un
 * programme précis : simple primitive de calcul de date.
 */
export interface WeeklyProgramSlot {
  /** 0 = dimanche … 6 = samedi */
  weekday: number
  hour: number
  minute?: number
  label?: string
}

/**
 * Calcule la prochaine occurrence (>= `from`) d'un créneau hebdomadaire.
 * Si le jour/heure du créneau est déjà passé pour la semaine en cours,
 * bascule sur la semaine suivante.
 */
export function nextWeeklyOccurrence(slot: WeeklyProgramSlot, from: Date = new Date()): Date {
  const minute = slot.minute ?? 0
  const candidate = new Date(from.getTime())
  candidate.setHours(slot.hour, minute, 0, 0)

  const fromWeekday = from.getDay()
  let dayDiff = slot.weekday - fromWeekday
  if (dayDiff < 0) dayDiff += 7

  candidate.setDate(from.getDate() + dayDiff)

  if (candidate.getTime() < from.getTime()) {
    candidate.setDate(candidate.getDate() + 7)
  }

  return candidate
}
