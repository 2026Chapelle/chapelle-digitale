/**
 * PODCAST-SEC — Décision d'accès à la LECTURE (pure, testable, source unique de vérité).
 *
 * Le client ne décide JAMAIS lui-même « if access_level === premium then ... ».
 * La décision finale est prise côté serveur (/api/podcast/[id]/play) à partir de
 * l'épisode lu en base (service_role) et de l'identité vérifiée. Ce module isole
 * la RÈGLE métier — 100 % pure — pour qu'elle soit auditée et testée séparément.
 *
 * Matrice cible :
 *   public   → tout le monde (visiteur inclus). Ex. « L'Instant Citadelle » gratuit.
 *   member   → utilisateur authentifié réellement MEMBRE (membre_statut <> 'visiteur').
 *   premium  → membre disposant d'un droit Premium RÉEL. Aucun modèle d'entitlement
 *              Premium n'existe encore dans le repo → fail-closed (refusé) tant que la
 *              décision métier n'est pas prise. L'admin garde l'accès (gestion/preview).
 */

export type PlaybackAccessLevel = 'public' | 'member' | 'premium'

export type PlaybackReason =
  | 'ok'
  | 'auth_required'   // 401 — anonyme sur un contenu réservé
  | 'member_only'     // 403 — authentifié mais pas membre (visiteur)
  | 'premium_denied'  // 403 — membre sans droit premium
  | 'no_media'        // 404 — autorisé mais aucun média
  | 'not_found'       // 404 — épisode inexistant / non publié
  | 'forbidden'       // 403 — access_level inconnu → fail-closed

export interface PlaybackContext {
  /** true si une session serveur vérifiée existe. */
  authenticated: boolean
  /** true si l'utilisateur est réellement MEMBRE (membre_statut <> 'visiteur'). */
  isMember: boolean
  /** true pour un administrateur (cookie/token admin) — gestion & preview. */
  isAdmin: boolean
  /**
   * true si l'utilisateur possède un droit Premium RÉEL selon un modèle
   * d'entitlement existant. Aucun modèle n'existe aujourd'hui → toujours false
   * (décision métier requise). Champ explicite pour préparer le chemin Premium.
   */
  hasPremiumEntitlement: boolean
}

export interface PlaybackDecision {
  allowed: boolean
  reason: PlaybackReason
}

/**
 * Règle « membre » alignée sur la décision métier committée (P1, LARGE) :
 * tout statut réel sauf 'visiteur'. Ne réutilise PAS les littéraux morts
 * ('membre','fidele','actif') de pastoral-intelligence.
 */
export function isMemberStatus(statut: unknown): boolean {
  return typeof statut === 'string' && statut.trim() !== '' && statut.trim() !== 'visiteur'
}

/** Normalise un access_level libre en valeur connue (défaut prudent : 'member'). */
export function normalizeAccessLevel(value: unknown): PlaybackAccessLevel {
  return value === 'public' || value === 'member' || value === 'premium' ? value : 'member'
}

/**
 * Décision d'accès à la lecture — PURE. Fail-closed par défaut.
 */
export function decidePlaybackAccess(
  accessLevel: PlaybackAccessLevel,
  ctx: PlaybackContext,
): PlaybackDecision {
  // L'admin peut toujours résoudre (gestion de contenu / prévisualisation).
  if (ctx.isAdmin) return { allowed: true, reason: 'ok' }

  switch (accessLevel) {
    case 'public':
      // Réellement public : visiteur, membre, premium. Écoute gratuite légitime.
      return { allowed: true, reason: 'ok' }

    case 'member':
      if (!ctx.authenticated) return { allowed: false, reason: 'auth_required' }
      if (!ctx.isMember) return { allowed: false, reason: 'member_only' }
      return { allowed: true, reason: 'ok' }

    case 'premium':
      if (!ctx.authenticated) return { allowed: false, reason: 'auth_required' }
      // Pas de modèle d'entitlement premium → refus (fail-closed) tant que la
      // décision métier n'a pas défini qui est premium.
      if (!ctx.hasPremiumEntitlement) return { allowed: false, reason: 'premium_denied' }
      return { allowed: true, reason: 'ok' }

    default:
      return { allowed: false, reason: 'forbidden' }
  }
}

/** Code HTTP associé à une raison (pour l'endpoint). */
export function reasonToStatus(reason: PlaybackReason): number {
  switch (reason) {
    case 'ok': return 200
    case 'auth_required': return 401
    case 'member_only':
    case 'premium_denied':
    case 'forbidden': return 403
    case 'no_media':
    case 'not_found': return 404
  }
}

// ── Classification de la source média (pure) ────────────────────────────────
export type MediaSourceKind = 'storage' | 'youtube' | 'external' | 'none'

export interface MediaSource {
  kind: MediaSourceKind
  /** Bucket Supabase Storage (si kind === 'storage'). */
  bucket?: string
  /** Chemin de l'objet dans le bucket (si kind === 'storage'). */
  path?: string
}

/** TTL (secondes) d'une URL signée — centralisé. Large pour couvrir une écoute
 *  complète (épisodes longs) sans expirer en cours de lecture ; régénérable. */
export const PODCAST_PLAYBACK_TTL_SECONDS = 6 * 60 * 60 // 6 h

function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '')
  return h === 'youtube.com' || h === 'm.youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com'
}

/**
 * Classe une URL média. Détecte les objets Supabase Storage (bucket public OU
 * privé) via le motif `/storage/v1/object/(public|sign)/{bucket}/{path}`, pour
 * pouvoir générer une URL signée côté serveur. Sinon YouTube / externe.
 */
export function classifyMediaSource(url: unknown, expectedStorageHost?: string | null): MediaSource {
  if (typeof url !== 'string' || !url.trim()) return { kind: 'none' }
  const raw = url.trim()
  let parsed: URL | null = null
  try { parsed = new URL(raw) } catch { parsed = null }
  if (!parsed) return { kind: 'external' }

  if (isYouTubeHost(parsed.hostname)) return { kind: 'youtube' }

  // Supabase Storage : .../storage/v1/object/{public|sign|authenticated}/{bucket}/{path...}
  // Durcissement : si l'hôte attendu (projet Supabase) est fourni, une URL
  // d'apparence Storage sur un host étranger n'est PAS signée → classée externe.
  const m = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/)
  if (m) {
    const hostOk = !expectedStorageHost || parsed.hostname.toLowerCase() === expectedStorageHost.toLowerCase()
    if (hostOk) {
      const bucket = decodeURIComponent(m[1])
      const path = decodeURIComponent(m[2].split('?')[0])
      if (bucket && path) return { kind: 'storage', bucket, path }
    }
  }

  return { kind: 'external' }
}
