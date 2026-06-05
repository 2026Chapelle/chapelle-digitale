/**
 * VISIOCONFÉRENCE V1 — plateforme de réunion (PUR, testable). Aucune I/O.
 * La plateforme est DÉRIVÉE de `group_reunions.lien_visio` (aucune nouvelle colonne,
 * aucune migration). Sert à l'affichage clair (« Plateforme : Zoom ») et au champ
 * visuel du formulaire. Aucun SDK, aucune API, aucune présence automatique.
 */

export interface MeetingPlatform { key: string; label: string }

export const MEETING_PLATFORMS: MeetingPlatform[] = [
  { key: 'zoom', label: 'Zoom' },
  { key: 'google-meet', label: 'Google Meet' },
  { key: 'jitsi', label: 'Jitsi' },
  { key: 'teams', label: 'Microsoft Teams' },
  { key: 'autre', label: 'Autre' },
]

const AUTRE = MEETING_PLATFORMS[4]

/** Détecte la plateforme à partir de l'URL du lien visio. Vide/inconnu → « Autre ». */
export function detectMeetingPlatform(url?: string | null): MeetingPlatform {
  const u = (url || '').toLowerCase()
  if (!u) return AUTRE
  if (u.includes('zoom.us') || u.includes('zoom.com')) return MEETING_PLATFORMS[0]
  if (u.includes('meet.google.')) return MEETING_PLATFORMS[1]
  if (u.includes('jit.si') || u.includes('jitsi')) return MEETING_PLATFORMS[2]
  if (u.includes('teams.microsoft.') || u.includes('teams.live.')) return MEETING_PLATFORMS[3]
  return AUTRE
}

/** Libellé lisible de la plateforme déduite d'une URL. */
export function meetingPlatformLabel(url?: string | null): string {
  return detectMeetingPlatform(url).label
}

/**
 * URL de réunion valide ? (vide = toléré → pas de bouton Rejoindre).
 * Rejette tout schéma non http(s) (sécurité : pas de javascript:, data:, etc.).
 */
export function isValidMeetingUrl(url?: string | null): boolean {
  const s = (url || '').trim()
  if (!s) return true
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Exemple d'URL (placeholder) selon la plateforme choisie dans le formulaire. */
export function platformUrlHint(key: string): string {
  switch (key) {
    case 'zoom': return 'https://zoom.us/j/...'
    case 'google-meet': return 'https://meet.google.com/xxx-xxxx-xxx'
    case 'jitsi': return 'https://meet.jit.si/...'
    case 'teams': return 'https://teams.microsoft.com/l/meetup-join/...'
    default: return 'https://...'
  }
}
