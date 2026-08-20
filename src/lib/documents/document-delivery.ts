/**
 * CITADELLE LIVING BOOKS — LB-SEC : livraison sécurisée des documents (partie PURE).
 *
 * Un document MEMBER/PREMIUM ne doit JAMAIS être « caché par l'interface » : la
 * décision d'accès est prise côté serveur et un contenu non autorisé ne renvoie
 * jamais d'URL. Ce module isole la logique PURE (testable, sans I/O) :
 *
 *   • La MATRICE d'accès (public/member/premium) est RÉUTILISÉE telle quelle
 *     depuis PODCAST-SEC (`decidePlaybackAccess`) — UNE seule source de vérité,
 *     déjà auditée et testée. On ne réécrit pas une seconde logique premium.
 *   • L'entitlement Premium LIVRES réutilise la primitive canonique
 *     `has_entitlement` via la clé 'books_premium' (spécialisée en SQL par
 *     `has_books_premium_access`). Aucun nouveau RBAC.
 *   • La résolution de l'objet de stockage privilégie storage_bucket/storage_path
 *     (identité de stockage), sinon retombe sur la classification d'URL.
 */
import {
  decidePlaybackAccess,
  normalizeAccessLevel,
  isMemberStatus,
  reasonToStatus,
  classifyMediaSource,
  type PlaybackAccessLevel,
  type PlaybackContext,
  type PlaybackDecision,
  type PlaybackReason,
  type MediaSource,
} from '@/lib/podcast/playback-access'

// ── Réexports (vocabulaire « document », même source de vérité) ──────────────
export type DocumentAccessLevel = PlaybackAccessLevel
export type DocumentAccessContext = PlaybackContext
export type DocumentAccessDecision = PlaybackDecision
export type DocumentAccessReason = PlaybackReason

export { normalizeAccessLevel, isMemberStatus, reasonToStatus }

/** Décision d'accès à un document — RÉUTILISE la règle pure de PODCAST-SEC. */
export function decideDocumentAccess(
  accessLevel: DocumentAccessLevel,
  ctx: DocumentAccessContext,
): DocumentAccessDecision {
  return decidePlaybackAccess(accessLevel, ctx)
}

/** Clé d'entitlement canonique du Premium LIVRES (miroir de la fonction SQL). */
export const BOOKS_PREMIUM_ENTITLEMENT_KEY = 'books_premium'

/**
 * TTL (secondes) d'une URL signée de document. Assez large pour couvrir la
 * lecture d'un livre entier (pdf.js charge des plages à la demande) sans expirer
 * en cours ; régénérable à chaque ouverture (route/page en force-dynamic).
 */
export const DOCUMENT_DELIVERY_TTL_SECONDS = 60 * 60 // 1 h

/** Ligne minimale de document nécessaire à la livraison (lue via service_role). */
export interface DeliveryDocumentRow {
  id: string
  type?: string | null
  status?: string | null
  title?: string | null
  access_level?: string | null
  url?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
}

/**
 * Résout l'objet source d'un document (PUR). Privilégie l'identité de stockage
 * explicite (storage_bucket + storage_path) — cas des documents privés dont
 * `url` doit rester vide — sinon classe l'URL (objet Storage public/privé,
 * externe, YouTube, aucune).
 */
export function resolveDeliverySource(
  row: Pick<DeliveryDocumentRow, 'url' | 'storage_bucket' | 'storage_path'>,
  expectedStorageHost?: string | null,
): MediaSource {
  const bucket = typeof row.storage_bucket === 'string' ? row.storage_bucket.trim() : ''
  const path = typeof row.storage_path === 'string' ? row.storage_path.trim() : ''
  if (bucket && path) return { kind: 'storage', bucket, path }
  return classifyMediaSource(row.url, expectedStorageHost)
}

// ── Entitlement Premium LIVRES (I/O RPC minimal, fail-closed) ────────────────
interface RpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>
}

/**
 * Le membre possède-t-il le droit Premium LIVRES ACTIF ?
 * Délègue à la primitive SQL canonique `has_books_premium_access` (source unique).
 * FAIL-CLOSED : userId absent, erreur RPC, ou réponse non booléenne ⇒ false.
 */
export async function hasBooksPremiumAccess(
  client: RpcClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false
  try {
    const { data, error } = await client.rpc('has_books_premium_access', { p_user: userId })
    if (error) return false
    return data === true
  } catch {
    return false
  }
}
