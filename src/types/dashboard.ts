/**
 * Types « vue » du dashboard — client-safe.
 *
 * Volontairement séparé de lib/queries.ts (qui importe next/headers, côté serveur)
 * pour pouvoir être importé aussi bien côté serveur que côté client (hooks).
 */

export interface DashboardSummary {
  prenom: string
  score_engagement: number
  parcours_etape: number
  formations_en_cours: number
  formations_terminees: number
  prieres_actives: number
  notifications_non_lues: number
}
