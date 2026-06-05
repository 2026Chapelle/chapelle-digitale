/**
 * RÈGLES DE NOTIFICATION — logique PURE (aucun réseau). Testable.
 * Seuils des rappels, niveaux d'alerte, chaîne d'escalade, clés anti-doublon.
 */

export type ReminderKind = 'j7' | 'j1' | 'imminent'

/**
 * Type de rappel pour un événement à venir, selon l'écart (cron quotidien).
 *  - imminent : < 2 h     · j1 : ~1 jour (12-36 h) · j7 : ~7 jours (6-8 j)
 *  - null entre 1,5 j et 6 j, et pour un événement passé.
 */
export function reminderKind(startsAtMs: number, nowMs: number): ReminderKind | null {
  const h = (startsAtMs - nowMs) / 3_600_000
  if (h <= 0) return null
  if (h <= 2) return 'imminent'
  if (h >= 12 && h <= 36) return 'j1'
  if (h >= 144 && h <= 192) return 'j7'
  return null
}

const ALERT_LEVELS: Record<string, string> = {
  priere_non_traitee: 'critique',
  inactif: 'elevee',
  question_sans_reponse: 'elevee',
  suivi_en_retard: 'elevee',
  parcours_bloque: 'moyenne',
  progression_arretee: 'moyenne',
  profil_incomplet: 'faible',
  certificat_non_consulte: 'faible',
}
export function alertLevel(type: string): string {
  return ALERT_LEVELS[type] || 'moyenne'
}

/** Chaîne d'escalade pastorale : responsable → pasteur national → admin → super admin. */
export const ESCALATION_CHAIN = ['responsable', 'pasteur_national', 'admin', 'super_admin'] as const
export function nextEscalation(level: string): string {
  const i = ESCALATION_CHAIN.indexOf(level as any)
  if (i < 0) return 'admin'
  return ESCALATION_CHAIN[Math.min(i + 1, ESCALATION_CHAIN.length - 1)]
}

/** Bucket mensuel (UTC) — pour dédupliquer les alertes récurrentes par mois. */
export function monthBucket(nowMs: number): string {
  const d = new Date(nowMs)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Constructeurs de clés anti-doublon (stables). */
export const dedupKeys = {
  event: (id: string, kind: string) => `event:${id}:${kind}`,
  live: (id: string, kind: string) => `live:${id}:${kind}`,
  welcome: (uid: string) => `welcome:${uid}`,
  certificate: (ref: string) => `cert:${ref}`,
  pastoral: (type: string, uid: string, bucket: string) => `pastoral:${type}:${uid}:${bucket}`,
}
