'use client'
/**
 * Citadelle — Lot Offline 1 : orchestration client du hors-ligne.
 *
 * Coordonne : autorisation serveur → téléchargement proxy (avec progression) →
 * validation (taille/MIME) → stockage Blob local → écriture des métadonnées
 * (seulement APRÈS confirmation) → nettoyage en cas d'échec.
 *
 * Aucune règle métier ici : la logique décisionnelle est dans `policy.ts` (pure,
 * testée), l'I/O de stockage dans `db.ts`. Ce module fait le lien.
 */
import {
  makeItemId,
  computeExpiresAt,
  computeDownloadPercent,
  validateSize,
  validateMime,
  MAX_OFFLINE_FILE_SIZE_BYTES,
  type OfflineItem,
  type OfflineContentType,
} from '@/lib/offline/policy'
import * as db from '@/lib/offline/db'

export interface DownloadRequest {
  userId: string
  contentId: string
  type: OfflineContentType
  title: string
  description?: string
  coverUrl?: string
  onProgress?: (percent: number, downloadedBytes: number, totalBytes: number) => void
  signal?: AbortSignal
}

interface AuthorizeResponse {
  ok: boolean
  authorized?: boolean
  downloadAllowed?: boolean
  contentId?: string
  contentType?: OfflineContentType
  title?: string
  mimeType?: string | null
  sizeBytes?: number | null
  coverUrl?: string | null
  duration?: string | null
  accessVersion?: string
  expiresAt?: string
  reason?: string
}

export class OfflineError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'OfflineError'
  }
}

async function authorize(contentId: string, signal?: AbortSignal): Promise<AuthorizeResponse> {
  const res = await fetch('/api/member/offline/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ contentId }),
    signal,
  })
  if (res.status === 401) throw new OfflineError('unauthenticated', 'Connexion requise pour télécharger.')
  const json = (await res.json().catch(() => null)) as AuthorizeResponse | null
  if (!json || !json.ok) throw new OfflineError('server', 'Autorisation refusée par le serveur.')
  return json
}

/**
 * Télécharge et stocke un contenu hors-ligne. Idempotent : réécrit proprement un
 * item existant. En cas d'échec, nettoie tout téléchargement partiel.
 */
export async function downloadContent(reqData: DownloadRequest): Promise<OfflineItem> {
  const { userId, contentId, type, title, description, coverUrl, onProgress, signal } = reqData
  if (!userId) throw new OfflineError('no_user', 'Utilisateur inconnu.')

  const id = makeItemId(userId, contentId)

  // 1) Droits serveur (source de vérité).
  const auth = await authorize(contentId, signal)
  if (!auth.authorized || !auth.downloadAllowed) {
    throw new OfflineError(auth.reason || 'not_authorized', 'Ce contenu n’est pas disponible au téléchargement.')
  }

  // 2) Validation préalable de la taille annoncée (si connue).
  if (typeof auth.sizeBytes === 'number' && auth.sizeBytes > 0) {
    const v = validateSize(auth.sizeBytes)
    if (!v.ok) throw new OfflineError('too_large', v.reason || 'Fichier trop volumineux.')
  }

  // 3) Marque l'item « downloading » (état visible dès le départ).
  const now = new Date().toISOString()
  const base: OfflineItem = {
    id,
    userId,
    contentId,
    type,
    title: auth.title || title,
    description,
    coverUrl: auth.coverUrl || coverUrl,
    mimeType: auth.mimeType || '',
    sizeBytes: auth.sizeBytes || 0,
    downloadedBytes: 0,
    downloadStatus: 'downloading',
    updatedAt: now,
    accessVersion: auth.accessVersion,
    localBlobKey: id,
    durationSeconds: undefined,
  }
  await db.putItem(base)

  try {
    // 4) Flux proxy avec suivi de progression.
    const res = await fetch(`/api/member/offline/download?contentId=${encodeURIComponent(contentId)}`, {
      credentials: 'same-origin',
      signal,
    })
    if (res.status === 401) throw new OfflineError('unauthenticated', 'Connexion requise.')
    if (!res.ok || !res.body) throw new OfflineError('download_failed', 'Téléchargement impossible.')

    const headerLen = Number(res.headers.get('Content-Length') || '0')
    const total = headerLen || base.sizeBytes || 0
    const accessVersion = res.headers.get('X-Offline-Access-Version') || auth.accessVersion

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        received += value.byteLength
        // Garde-fou taille pendant le flux (protège même sans Content-Length).
        if (received > MAX_OFFLINE_FILE_SIZE_BYTES) {
          await reader.cancel()
          throw new OfflineError('too_large', 'Fichier trop volumineux pour le hors-ligne.')
        }
        chunks.push(value)
        if (onProgress) onProgress(computeDownloadPercent(received, total), received, total)
        // Progression persistée légèrement (best-effort, non bloquant).
        base.downloadedBytes = received
      }
    }

    const contentType = res.headers.get('Content-Type') || base.mimeType || ''
    const blob = new Blob(chunks as BlobPart[], { type: contentType })

    // 5) Validation finale (taille réelle + MIME réel).
    const vSize = validateSize(blob.size)
    if (!vSize.ok) throw new OfflineError('too_large', vSize.reason || 'Fichier trop volumineux.')
    const vMime = validateMime(type, contentType || blob.type)
    if (!vMime.ok) throw new OfflineError('bad_mime', vMime.reason || 'Type de fichier non autorisé.')

    // 6) Stocke le Blob, PUIS fige les métadonnées (ordre important).
    try {
      await db.putBlob(id, blob)
    } catch (e: any) {
      throw new OfflineError('quota', 'Stockage insuffisant sur l’appareil.')
    }

    const completedAt = new Date().toISOString()
    const finalItem: OfflineItem = {
      ...base,
      mimeType: contentType || base.mimeType,
      sizeBytes: blob.size,
      downloadedBytes: blob.size,
      downloadStatus: 'completed',
      downloadedAt: completedAt,
      updatedAt: completedAt,
      expiresAt: computeExpiresAt(completedAt),
      accessVersion,
    }
    await db.putItem(finalItem)
    return finalItem
  } catch (err) {
    // 7) Nettoyage du téléchargement partiel.
    await db.deleteBlob(id).catch(() => {})
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    if (aborted) {
      // Annulation utilisateur : retire complètement l'item (pas de résidu).
      await db.deleteItem(id).catch(() => {})
      throw new OfflineError('aborted', 'Téléchargement annulé.')
    }
    // Échec : conserve l'item en « failed » (téléchargement interrompu visible).
    await db
      .putItem({ ...base, downloadStatus: 'failed', updatedAt: new Date().toISOString() })
      .catch(() => {})
    throw err instanceof OfflineError ? err : new OfflineError('unknown', 'Échec du téléchargement.')
  }
}

/** Supprime un contenu (blob + métadonnées), scopé utilisateur. */
export async function deleteContent(userId: string, contentId: string): Promise<void> {
  const id = makeItemId(userId, contentId)
  const item = await db.getItem(id)
  if (item && item.userId !== userId) return // garde d'isolation
  await db.deleteBlob(id).catch(() => {})
  await db.deleteItem(id).catch(() => {})
}

/** Supprime TOUS les contenus hors-ligne du compte courant. */
export async function deleteAllForUser(userId: string): Promise<number> {
  const items = await db.getItemsByUser(userId)
  for (const it of items) {
    await db.deleteBlob(it.localBlobKey || it.id).catch(() => {})
    await db.deleteItem(it.id).catch(() => {})
  }
  return items.length
}

export interface EnrichedItem extends OfflineItem {
  hasLocalFile: boolean
}

/** Bibliothèque du compte courant, enrichie de la présence réelle du blob. */
export async function getLibrary(userId: string): Promise<EnrichedItem[]> {
  if (!userId) return []
  const items = await db.getItemsByUser(userId)
  const enriched = await Promise.all(
    items.map(async (it) => ({
      ...it,
      hasLocalFile: await db.hasBlob(it.localBlobKey || it.id).catch(() => false),
    })),
  )
  return enriched.sort((a, b) => (b.downloadedAt || '').localeCompare(a.downloadedAt || ''))
}

/**
 * Re-vérifie l'accès serveur d'un item complété (au retour en ligne). Met à jour
 * `accessVersion` et marque `expired` si l'accès est perdu. Best-effort.
 */
export async function syncItemAccess(
  userId: string,
  contentId: string,
): Promise<{ authorized: boolean; accessVersion?: string } | null> {
  const id = makeItemId(userId, contentId)
  const item = await db.getItem(id)
  if (!item || item.userId !== userId) return null
  try {
    const auth = await authorize(contentId)
    if (!auth.authorized) {
      await db.putItem({ ...item, downloadStatus: 'expired', updatedAt: new Date().toISOString() })
      return { authorized: false }
    }
    // On NE réécrit PAS l'item : l'ancienne `accessVersion` locale est comparée à
    // la version serveur fraîche (renvoyée ici) pour dériver « mise à jour
    // disponible » côté UI. La version locale ne change qu'après un re-téléchargement.
    return { authorized: true, accessVersion: auth.accessVersion }
  } catch (e) {
    if (e instanceof OfflineError && e.code === 'unauthenticated') {
      // Session perdue : l'accès ne peut plus être prouvé → expiré.
      await db.putItem({ ...item, downloadStatus: 'expired', updatedAt: new Date().toISOString() })
      return { authorized: false }
    }
    return null // erreur réseau : on ne dégrade pas l'état hors-ligne
  }
}

/** Enregistre la position de lecture audio (reprise). */
export async function savePlaybackPosition(
  userId: string,
  contentId: string,
  positionSeconds: number,
  durationSeconds?: number,
): Promise<void> {
  const id = makeItemId(userId, contentId)
  const item = await db.getItem(id)
  if (!item || item.userId !== userId) return
  await db.putItem({
    ...item,
    playbackPositionSeconds: Math.max(0, Math.floor(positionSeconds)),
    durationSeconds: durationSeconds ?? item.durationSeconds,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Ouvre le Blob local et renvoie une ObjectURL (à révoquer par l'appelant).
 * Renvoie null si le blob est absent (fichier local manquant).
 */
export async function openLocalObjectUrl(
  userId: string,
  contentId: string,
): Promise<string | null> {
  const id = makeItemId(userId, contentId)
  const item = await db.getItem(id)
  if (!item || item.userId !== userId) return null
  const blob = await db.getBlob(item.localBlobKey || id)
  if (!blob) return null
  return URL.createObjectURL(blob)
}
