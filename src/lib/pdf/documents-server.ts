/**
 * CITADELLE PDF-2 — Accès SERVEUR au registre canonique des documents PDF.
 *
 * Lit/écrit cms_media (type='pdf') et cms_document_links via la service role
 * (comme /api/member/ressources et /api/admin/cms). Toute la logique pure vit
 * dans document-model.ts (testée) ; ici uniquement l'I/O.
 *
 * Sécurité : les lectures publiques (route /lecture/pdf/[id], bibliothèque)
 * réappliquent EXPLICITEMENT le filtre status='published' (ne jamais exposer un
 * brouillon). L'access_level reste ÉDITORIAL en PDF-2 — aucun gate ici (PDF-3).
 */
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import {
  mapMediaRowToDocument,
  buildDocumentLinkRow,
  validateLinkRow,
  extractTargets,
  TARGET_COLUMN,
  type PdfDocument,
  type CmsMediaRow,
  type DocumentLinkInput,
  type DocumentLinkTarget,
  type LinkTargetKind,
} from './document-model'

/** Résout un document PDF PUBLIÉ par son id (identité canonique). null si absent/brouillon. */
export async function getPublishedPdfDocumentById(id: string): Promise<PdfDocument | null> {
  if (IS_DEMO_MODE || !id) return null
  const { data, error } = await supabaseAdmin
    .from('cms_media')
    .select('*')
    .eq('id', id)
    .eq('type', 'pdf')
    .eq('status', 'published')
    .maybeSingle()
  if (error || !data) return null
  return mapMediaRowToDocument(data as CmsMediaRow)
}

/** Bibliothèque = VUE du registre : PDF publiés ET visibles, triés. */
export async function getLibraryDocuments(): Promise<PdfDocument[]> {
  if (IS_DEMO_MODE) return []
  const { data, error } = await supabaseAdmin
    .from('cms_media')
    .select('*')
    .eq('type', 'pdf')
    .eq('status', 'published')
    .eq('visible_in_library', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as CmsMediaRow[]).map(mapMediaRowToDocument)
}

/** Destinations (cibles typées) d'un document. */
export async function getDocumentDestinations(documentId: string): Promise<DocumentLinkTarget[]> {
  if (IS_DEMO_MODE || !documentId) return []
  const { data, error } = await supabaseAdmin
    .from('cms_document_links')
    .select('*')
    .eq('document_id', documentId)
    .eq('status', 'published')
  if (error || !data) return []
  return extractTargets(data as Array<Record<string, unknown>>)
}

/** Documents PUBLIÉS rattachés à une cible donnée (ex. « PDF de ce parcours »). */
export async function getDocumentsForTarget(
  kind: LinkTargetKind,
  targetId: string,
): Promise<PdfDocument[]> {
  if (IS_DEMO_MODE || !targetId) return []
  const column = TARGET_COLUMN[kind]
  if (!column) return []
  const { data: links, error } = await supabaseAdmin
    .from('cms_document_links')
    .select('document_id, position')
    .eq(column, targetId)
    .eq('status', 'published')
    .order('position', { ascending: true })
  if (error || !links || links.length === 0) return []
  const ids = Array.from(new Set(links.map((l) => (l as { document_id: string }).document_id)))
  const { data: docs } = await supabaseAdmin
    .from('cms_media')
    .select('*')
    .in('id', ids)
    .eq('type', 'pdf')
    .eq('status', 'published')
  if (!docs) return []
  // Conserve l'ordre des liens (position).
  const byId = new Map((docs as CmsMediaRow[]).map((d) => [d.id, mapMediaRowToDocument(d)]))
  return ids.map((id) => byId.get(id)).filter((d): d is PdfDocument => Boolean(d))
}

export interface CreateDocumentLinkResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * Crée un rattachement document → destination (back-office / service role).
 * Valide « exactement une cible » côté application AVANT insertion (le CHECK SQL
 * est la garantie ultime). Idempotent grâce aux index uniques partiels.
 */
export async function createDocumentLink(input: DocumentLinkInput): Promise<CreateDocumentLinkResult> {
  if (IS_DEMO_MODE) return { ok: false, error: 'Supabase requis.' }
  let row: Record<string, unknown>
  try {
    row = buildDocumentLinkRow(input)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Cible invalide.' }
  }
  const check = validateLinkRow(row)
  if (!check.ok) return { ok: false, error: check.error }
  const { data, error } = await supabaseAdmin
    .from('cms_document_links')
    .insert(row)
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: (data as { id?: string } | null)?.id }
}
