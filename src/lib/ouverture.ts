/**
 * Ouverture publique de La Citadelle — logique pure (aucune I/O, aucun DOM).
 *
 * Sert la landing page /ouverture : instant d'ouverture, compte à rebours,
 * bascule des CTA avant/après ouverture, résolution de l'URL vidéo de campagne.
 *
 * Testée dans src/lib/__tests__/ouverture.test.ts.
 */

/**
 * Instant d'ouverture : dimanche 02 août 2026 à 00H00, heure d'Abidjan.
 *
 * La Côte d'Ivoire est sur UTC+00:00 toute l'année (aucun changement d'heure) :
 * l'heure d'Abidjan est donc strictement égale à UTC, et l'instant s'exprime
 * exactement en `Z`. Aucune bibliothèque de fuseaux n'est nécessaire.
 */
export const OPENING_ISO = '2026-08-02T00:00:00.000Z'

/** Timestamp (ms epoch) de l'ouverture. */
export const OPENING_MS = Date.parse(OPENING_ISO)

/** Libellés d'affichage — une seule source de vérité pour la page et les métadonnées. */
export const OPENING_DATE_LABEL = 'DIMANCHE 02 AOÛT 2026 — 00H00'
export const OPENING_TZ_LABEL = 'Heure d’Abidjan (GMT)'

/**
 * Routes réelles du projet (vérifiées dans src/app) — jamais inventées.
 * `/register` accepte `?next=`, `/login` accepte `?redirect=`.
 */
export const OUVERTURE_ROUTES = {
  inscription: '/register',
  connexion: '/login',
  motDePasseOublie: '/forgot-password',
  espaceMembre: '/member/dashboard',
  adhesion: '/rejoindre',
} as const

/** Vrai si l'ouverture publique a eu lieu à l'instant donné. */
export function isOpen(nowMs: number, openingMs: number = OPENING_MS): boolean {
  return nowMs >= openingMs
}

export type Countdown = {
  days: number
  hours: number
  minutes: number
  seconds: number
  /** Vrai une fois l'échéance atteinte — toutes les valeurs sont alors à 0. */
  done: boolean
}

/**
 * Temps restant jusqu'à l'ouverture. Ne renvoie jamais de valeur négative :
 * après l'échéance tout est à 0 et `done` passe à vrai.
 */
export function countdownTo(nowMs: number, openingMs: number = OPENING_MS): Countdown {
  const remaining = openingMs - nowMs
  if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }

  let ms = remaining
  const days = Math.floor(ms / 86_400_000); ms -= days * 86_400_000
  const hours = Math.floor(ms / 3_600_000); ms -= hours * 3_600_000
  const minutes = Math.floor(ms / 60_000); ms -= minutes * 60_000
  const seconds = Math.floor(ms / 1_000)
  return { days, hours, minutes, seconds, done: false }
}

/** Libellés des CTA principaux, selon que les portes sont ouvertes ou non. */
export function heroCtaLabel(open: boolean): string {
  return open ? 'ENTRER DANS LA CITADELLE' : 'ME PRÉPARER À ENTRER'
}

export function finalCtaLabel(open: boolean): string {
  return open ? 'ENTRER MAINTENANT' : 'ME PRÉPARER POUR L’OUVERTURE'
}

/**
 * Destination du CTA principal.
 *
 * Avant comme après l'ouverture, le parcours passe par la création de compte :
 * `/register` redirige un visiteur déjà connecté et accepte `?next=` pour
 * déposer l'utilisateur dans son espace après inscription.
 */
export function primaryCtaHref(): string {
  return `${OUVERTURE_ROUTES.inscription}?next=${encodeURIComponent(OUVERTURE_ROUTES.espaceMembre)}`
}

export type OpeningVideo =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'file'; src: string }

/**
 * Résout l'URL vidéo de campagne fournie par la configuration
 * (`NEXT_PUBLIC_OUVERTURE_VIDEO_URL`).
 *
 * - identifiant ou lien YouTube  → embed `youtube-nocookie` (autorisé par la CSP)
 * - fichier .mp4 / .webm / .ogg  → lecture native <video>
 * - valeur absente ou inexploitable → `null`, la page affiche alors un
 *   emplacement explicitement marqué « en attente de configuration ».
 */
export function resolveOpeningVideo(raw?: string | null): OpeningVideo | null {
  const value = raw?.trim()
  if (!value) return null

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(value)) return { kind: 'file', src: value }

  const id = youtubeId(value)
  if (!id) return null

  return {
    kind: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&autoplay=1`,
  }
}

/** Miniature YouTube (servie par i.ytimg.com, déjà autorisé dans next.config.js). */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
}

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/

function youtubeId(value: string): string | null {
  if (YT_ID_RE.test(value)) return value

  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = value.match(re)
    if (m) return m[1]
  }
  return null
}
