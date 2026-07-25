/**
 * Citadelle — Lot Offline 1 : politique & logique PURE du hors-ligne (PDF/audio).
 *
 * Ce module NE contient AUCUN accès I/O (ni IndexedDB, ni fetch, ni DOM) : il est
 * volontairement pur pour être testé sous Vitest (environnement `node`), comme
 * toutes les libs métier du projet. La couche navigateur vit dans `db.ts` /
 * `manager.ts` et n'est jamais importée par les tests ni par le serveur.
 *
 * Décisions de conception (Evidence First) :
 *  - Taille maximale hors-ligne = 150 Mo. Justification : c'est le plafond
 *    d'upload audio côté serveur (`src/app/api/admin/upload/route.ts` :
 *    `audio/* → 150 * MB`), le PDF y étant plafonné à 50 Mo. On mirroir la
 *    contrainte serveur existante plutôt que d'inventer une valeur arbitraire.
 *  - Validité hors-ligne par défaut = 30 jours (configurable). Après expiration,
 *    l'accès doit être renouvelé en ligne.
 *  - Isolation : chaque item porte `userId` ; toute la logique de sélection filtre
 *    sur l'utilisateur courant (un autre compte ne voit jamais les contenus d'un
 *    précédent).
 */

/** Types de contenu supportés par le Lot Offline 1 (pas de vidéo). */
export type OfflineContentType = 'pdf' | 'audio'

/** Statut brut de téléchargement stocké en IndexedDB. */
export type OfflineDownloadStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'expired'

/**
 * État dérivé, orienté UI, calculé à la volée à partir du statut brut + contexte
 * (présence du blob local, connexion, version d'accès serveur, expiration).
 */
export type OfflineItemState =
  | 'queued' // en file d'attente
  | 'downloading' // téléchargement en cours
  | 'interrupted' // téléchargement partiel interrompu
  | 'failed' // échec sans octets utiles
  | 'available' // disponible hors ligne
  | 'update_available' // une nouvelle version existe côté serveur
  | 'expired' // validité locale dépassée ou accès révoqué
  | 'missing' // métadonnées présentes mais blob local absent

export interface OfflineItem {
  /** Clé primaire locale, déterministe et SCOPÉE utilisateur (cf. makeItemId). */
  id: string
  /** Identité du propriétaire local — pilier de l'isolation multi-comptes. */
  userId: string
  /** Identifiant du contenu source (ex. cms_media.id). */
  contentId: string
  type: OfflineContentType
  title: string
  description?: string
  coverUrl?: string
  mimeType: string
  sizeBytes: number
  downloadedBytes: number
  downloadStatus: OfflineDownloadStatus
  downloadedAt?: string
  updatedAt?: string
  expiresAt?: string
  /**
   * Empreinte d'accès renvoyée par le serveur (dérivée de la publication + date
   * de mise à jour du contenu). Sert à détecter « mise à jour disponible » et la
   * révocation d'accès au retour en ligne. Ce n'est PAS un secret.
   */
  accessVersion?: string
  /** Clé de rangement du blob dans le store `offline_files`. */
  localBlobKey?: string
  /** Reprise audio : position de lecture mémorisée. */
  playbackPositionSeconds?: number
  durationSeconds?: number
}

// ---------------------------------------------------------------------------
// Constantes de politique (configurables, justifiées)
// ---------------------------------------------------------------------------

const MB = 1_048_576

/**
 * Plafond d'un fichier hors-ligne. Aligné sur le plafond d'upload audio serveur
 * (150 Mo). Voir `src/app/api/admin/upload/route.ts`.
 */
export const MAX_OFFLINE_FILE_SIZE_BYTES = 150 * MB

/** Durée de validité locale par défaut d'un contenu téléchargé (jours). */
export const OFFLINE_VALIDITY_DAYS = 30

/**
 * Cadence minimale d'écriture de la position de lecture audio en IndexedDB
 * (secondes). Évite d'écrire à chaque `timeupdate` (~4/s).
 */
export const PLAYBACK_SAVE_INTERVAL_SECONDS = 8

/** Types MIME autorisés par type de contenu (miroir de l'upload serveur). */
export const ALLOWED_OFFLINE_MIME: Record<OfflineContentType, readonly string[]> = {
  pdf: ['application/pdf'],
  audio: [
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
  ],
}

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Isolation multi-comptes
// ---------------------------------------------------------------------------

/**
 * Clé primaire locale déterministe scopée par utilisateur : deux comptes qui
 * téléchargent le même contenu obtiennent deux enregistrements distincts, et un
 * item n'est jamais confondu entre comptes.
 */
export function makeItemId(userId: string, contentId: string): string {
  return `${userId}::${contentId}`
}

/** Vrai si l'item appartient bien à l'utilisateur donné (garde d'isolation). */
export function belongsToUser(item: Pick<OfflineItem, 'userId'>, userId: string): boolean {
  return !!userId && item.userId === userId
}

/** Filtre une liste d'items sur l'utilisateur courant (isolation stricte). */
export function itemsForUser<T extends Pick<OfflineItem, 'userId'>>(
  items: readonly T[],
  userId: string,
): T[] {
  return items.filter((it) => belongsToUser(it, userId))
}

// ---------------------------------------------------------------------------
// Validation du fichier (taille, type MIME)
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean
  reason?: string
}

export function validateSize(
  sizeBytes: number,
  max: number = MAX_OFFLINE_FILE_SIZE_BYTES,
): ValidationResult {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, reason: 'Taille de fichier invalide.' }
  }
  if (sizeBytes > max) {
    return {
      ok: false,
      reason: `Fichier trop volumineux (max ${Math.round(max / MB)} Mo).`,
    }
  }
  return { ok: true }
}

/** Normalise un type MIME (retire les paramètres, ex. `; charset=...`). */
export function normalizeMime(mime: string): string {
  return (mime || '').split(';')[0].trim().toLowerCase()
}

export function isAllowedOfflineMime(type: OfflineContentType, mime: string): boolean {
  return ALLOWED_OFFLINE_MIME[type]?.includes(normalizeMime(mime)) ?? false
}

export function validateMime(type: OfflineContentType, mime: string): ValidationResult {
  if (!isAllowedOfflineMime(type, mime)) {
    return { ok: false, reason: `Type de fichier non autorisé pour « ${type} ».` }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Expiration
// ---------------------------------------------------------------------------

/** Calcule la date d'expiration ISO à partir d'une date de téléchargement. */
export function computeExpiresAt(
  downloadedAtISO: string,
  validityDays: number = OFFLINE_VALIDITY_DAYS,
): string {
  const base = new Date(downloadedAtISO).getTime()
  return new Date(base + validityDays * DAY_MS).toISOString()
}

/** Vrai si l'item est expiré à l'instant `nowMs`. Sans `expiresAt` → non expiré. */
export function isExpired(
  item: Pick<OfflineItem, 'expiresAt'>,
  nowMs: number,
): boolean {
  if (!item.expiresAt) return false
  const exp = new Date(item.expiresAt).getTime()
  if (!Number.isFinite(exp)) return false
  return nowMs >= exp
}

/** Millisecondes restantes avant expiration (0 si expiré / inconnu). */
export function remainingValidityMs(
  item: Pick<OfflineItem, 'expiresAt'>,
  nowMs: number,
): number {
  if (!item.expiresAt) return 0
  const exp = new Date(item.expiresAt).getTime()
  if (!Number.isFinite(exp)) return 0
  return Math.max(0, exp - nowMs)
}

// ---------------------------------------------------------------------------
// Version d'accès (mise à jour / révocation)
// ---------------------------------------------------------------------------

/**
 * Vrai si la version locale diffère de la version serveur → une mise à jour est
 * disponible. Si l'une des deux est absente, on ne signale PAS de mise à jour
 * (on ne veut pas de faux positifs).
 */
export function isAccessStale(
  localVersion: string | undefined,
  serverVersion: string | undefined | null,
): boolean {
  if (!localVersion || !serverVersion) return false
  return localVersion !== serverVersion
}

// ---------------------------------------------------------------------------
// Dérivation d'état UI
// ---------------------------------------------------------------------------

export interface DeriveStateContext {
  nowMs: number
  /** Le blob local est-il réellement présent en base ? */
  hasLocalFile: boolean
  /** Version d'accès renvoyée par le serveur au dernier contrôle (si en ligne). */
  serverAccessVersion?: string | null
  /**
   * Le serveur a-t-il révoqué l'accès (non authentifié / non publié / non
   * autorisé) lors du dernier contrôle en ligne ?
   */
  accessRevoked?: boolean
}

/**
 * Traduit le statut brut + contexte en un état UI unique et déterministe.
 * Priorité : révocation/expiration > intégrité locale > mise à jour > disponible.
 */
export function deriveItemState(item: OfflineItem, ctx: DeriveStateContext): OfflineItemState {
  switch (item.downloadStatus) {
    case 'queued':
      return 'queued'
    case 'downloading':
      return 'downloading'
    case 'expired':
      return 'expired'
    case 'failed':
      return item.downloadedBytes > 0 ? 'interrupted' : 'failed'
    case 'completed': {
      if (ctx.accessRevoked) return 'expired'
      if (isExpired(item, ctx.nowMs)) return 'expired'
      if (!ctx.hasLocalFile) return 'missing'
      if (isAccessStale(item.accessVersion, ctx.serverAccessVersion)) return 'update_available'
      return 'available'
    }
    default:
      return 'failed'
  }
}

/**
 * Un item est-il ouvrable/lisible hors ligne ? (blob présent, complété, non
 * expiré, accès non révoqué). L'ouverture reste possible SANS connexion tant que
 * la validité locale n'est pas dépassée.
 */
export function isOpenable(item: OfflineItem, ctx: DeriveStateContext): boolean {
  return deriveItemState(item, ctx) === 'available' || deriveItemState(item, ctx) === 'update_available'
}

// ---------------------------------------------------------------------------
// Progression & reprise audio
// ---------------------------------------------------------------------------

/** Pourcentage de téléchargement borné [0..100] (0 si taille inconnue). */
export function computeDownloadPercent(downloadedBytes: number, sizeBytes: number): number {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return 0
  const pct = (downloadedBytes / sizeBytes) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

/**
 * Faut-il persister la position de lecture ? Throttle par intervalle. `force`
 * (pause, fin, fermeture) court-circuite le throttle.
 */
export function shouldPersistPosition(
  lastSavedMs: number,
  nowMs: number,
  force = false,
  intervalSeconds: number = PLAYBACK_SAVE_INTERVAL_SECONDS,
): boolean {
  if (force) return true
  return nowMs - lastSavedMs >= intervalSeconds * 1000
}

/** Position de reprise sûre : bornée, et remise à 0 si trop proche de la fin. */
export function resumePosition(
  positionSeconds: number | undefined,
  durationSeconds: number | undefined,
): number {
  const pos = Number(positionSeconds) || 0
  if (pos <= 0) return 0
  if (durationSeconds && durationSeconds > 0) {
    // Si on est à moins de 2 s de la fin, on repart du début.
    if (pos >= durationSeconds - 2) return 0
    return Math.min(pos, durationSeconds)
  }
  return pos
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

/** Formatage humain d'une taille en octets (FR). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  const rounded = i === 0 ? value : Math.round(value * 10) / 10
  return `${rounded} ${units[i]}`
}

/** Libellés FR par état, pour l'UI (source unique). */
export const STATE_LABELS: Record<OfflineItemState, string> = {
  queued: 'En attente',
  downloading: 'Téléchargement…',
  interrupted: 'Téléchargement interrompu',
  failed: 'Échec du téléchargement',
  available: 'Disponible hors ligne',
  update_available: 'Mise à jour disponible',
  expired: 'Accès expiré',
  missing: 'Fichier local manquant',
}
