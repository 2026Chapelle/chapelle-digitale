/**
 * CITADELLE LIVING BOOKS — LB-SEC : livraison sécurisée des documents (partie SERVEUR / I/O).
 *
 * Point d'application UNIQUE, réutilisé par la route `/api/documents/[id]/access`
 * ET par le server component `/lecture/pdf/[id]`. Le client ne décide jamais.
 *
 * Chaîne : lire le document (service_role) → publication → décision d'accès pure
 * → si autorisé, résoudre la source et SIGNER (objet Storage privé) → sinon ne
 * JAMAIS renvoyer d'URL. Fail-closed sur toute erreur.
 */
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import {
  decideDocumentAccess,
  normalizeAccessLevel,
  resolveDeliverySource,
  DOCUMENT_DELIVERY_TTL_SECONDS,
  type DocumentAccessContext,
  type DocumentAccessReason,
} from './document-delivery'

export interface DocumentDeliveryResult {
  allowed: boolean
  reason: DocumentAccessReason
  /** URL de lecture résolue (signée si objet privé). JAMAIS présente si refusé. */
  url?: string
  title?: string
  /** ISO d'expiration si URL signée, sinon null. */
  expiresAt?: string | null
  /** Origine de la source résolue (diagnostic, jamais l'URL/token en clair). */
  source?: 'storage_signed' | 'storage_unsigned' | 'external' | 'youtube'
}

function expectedStorageHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || null
  } catch {
    return null
  }
}

/**
 * Résout l'accès + la source de livraison d'un document par son id canonique.
 * `ctx` porte l'identité déjà vérifiée par l'appelant (authenticated/isMember/
 * isAdmin/hasPremiumEntitlement) — même contrat que PODCAST-SEC.
 */
export async function getDocumentDelivery(
  id: string,
  ctx: DocumentAccessContext,
): Promise<DocumentDeliveryResult> {
  const docId = (id || '').trim()
  if (!docId || IS_DEMO_MODE) return { allowed: false, reason: 'not_found' }

  try {
    const { data, error } = await supabaseAdmin
      .from('cms_media')
      .select('id, type, status, title, access_level, url, storage_bucket, storage_path')
      .eq('id', docId)
      .eq('type', 'pdf')
      .maybeSingle()

    if (error || !data) return { allowed: false, reason: 'not_found' }
    const row = data as {
      status?: string | null
      title?: string | null
      access_level?: string | null
      url?: string | null
      storage_bucket?: string | null
      storage_path?: string | null
    }

    // Seuls les documents publiés sont lisibles (l'admin peut prévisualiser un brouillon).
    if (row.status !== 'published' && !ctx.isAdmin) return { allowed: false, reason: 'not_found' }

    const accessLevel = normalizeAccessLevel(row.access_level)
    const decision = decideDocumentAccess(accessLevel, ctx)
    if (!decision.allowed) {
      // Log minimal — jamais d'URL ni de token.
      console.info(`[documents/access] denied id=${docId} level=${accessLevel} reason=${decision.reason}`)
      return { allowed: false, reason: decision.reason }
    }

    const source = resolveDeliverySource(row, expectedStorageHost())

    // Objet Supabase Storage → URL signée courte (vraie confidentialité si bucket privé).
    if (source.kind === 'storage' && source.bucket && source.path) {
      try {
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from(source.bucket)
          .createSignedUrl(source.path, DOCUMENT_DELIVERY_TTL_SECONDS)
        if (!signErr && signed?.signedUrl) {
          return {
            allowed: true,
            reason: 'ok',
            url: signed.signedUrl,
            title: row.title ?? undefined,
            expiresAt: new Date(Date.now() + DOCUMENT_DELIVERY_TTL_SECONDS * 1000).toISOString(),
            source: 'storage_signed',
          }
        }
      } catch {
        /* signature indisponible */
      }
      // Signature impossible : pour un contenu NON public, fail-closed (ne pas
      // livrer un objet privé non signé). Pour un contenu public, repli sur l'URL.
      if (accessLevel !== 'public') return { allowed: false, reason: 'no_media' }
      const publicUrl = (typeof row.url === 'string' && row.url.trim()) || ''
      if (!publicUrl) return { allowed: false, reason: 'no_media' }
      return { allowed: true, reason: 'ok', url: publicUrl, title: row.title ?? undefined, expiresAt: null, source: 'storage_unsigned' }
    }

    // Source externe / YouTube : accessible publiquement à sa source, non signable.
    if (source.kind === 'external' || source.kind === 'youtube') {
      const externalUrl = (typeof row.url === 'string' && row.url.trim()) || ''
      if (!externalUrl) return { allowed: false, reason: 'no_media' }
      return {
        allowed: true,
        reason: 'ok',
        url: externalUrl,
        title: row.title ?? undefined,
        expiresAt: null,
        source: source.kind === 'youtube' ? 'youtube' : 'external',
      }
    }

    // Aucune source exploitable.
    return { allowed: false, reason: 'no_media' }
  } catch (e) {
    console.error(`[documents/access] error id=${docId}: ${(e as Error)?.message ?? 'unknown'}`)
    return { allowed: false, reason: 'not_found' }
  }
}
