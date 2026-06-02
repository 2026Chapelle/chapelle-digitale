import type { MemberIntel } from '@/lib/pastoral-intelligence'

/** Instant de référence fixe pour des tests déterministes. */
export const NOW = Date.parse('2026-06-02T12:00:00.000Z')
export const DAY = 86_400_000

/** ISO d'une date « il y a N jours » par rapport à NOW. */
export const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

/** Construit un MemberIntel à zéro, surchargeable champ par champ. */
export function member(overrides: Partial<MemberIntel> = {}): MemberIntel {
  return {
    userId: 'u1', nom: 'Test Membre', pays: null, role: null, membre_statut: null,
    parcours_etape: 0, derniere_connexion: null, created_at: null, last_seen: null,
    connexions: 0, total_duration: 0, active_days_30: 0,
    prieres: 0, prieres_sans_suivi: 0, formations: 0, formations_abandonnees: 0,
    lives: 0, downloads: 0, events: 0, dons: 0,
    ...overrides,
  }
}
