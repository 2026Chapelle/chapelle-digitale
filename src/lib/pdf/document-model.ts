/**
 * CITADELLE PDF-2 — Modèle PUR du document PDF canonique + rattachements.
 *
 * Aucune dépendance (ni React, ni supabase, ni DOM) : 100 % testable en `node`.
 * Sépare les TROIS axes sans jamais les confondre :
 *   • NATURE      → DocumentType (document_type)
 *   • DESTINATION → LinkTargetKind (table cms_document_links, FK typées)
 *   • ACCÈS       → AccessLevel (access_level, éditorial en PDF-2)
 *
 * L'identité canonique d'un document = son `id` (uuid cms_media). Le lecteur
 * PDF-1 reste inchangé : ce module ne fait que RÉSOUDRE id → {url,title}.
 */

// ── NATURE ───────────────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  'livre', 'livret', 'manuel', 'workbook', 'support_cours', 'fiche_etude',
  'guide', 'declaration', 'programme', 'ressource', 'autre',
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

// ── ACCÈS (éditorial en PDF-2, pas un verrou) ────────────────────────────────
export const ACCESS_LEVELS = ['public', 'member', 'premium'] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

// ── DESTINATION (cibles typées FK) ───────────────────────────────────────────
export const LINK_TARGET_KINDS = [
  'parcours', 'formation', 'module', 'teaching', 'podcast',
  'show', 'series', 'season', 'event', 'academy_module', 'academy_lesson',
] as const
export type LinkTargetKind = (typeof LINK_TARGET_KINDS)[number]

export const LINK_ROLES = ['attachment', 'download', 'annexe', 'reference'] as const
export type LinkRole = (typeof LINK_ROLES)[number]

/** Correspondance cible → colonne FK dans cms_document_links. */
export const TARGET_COLUMN: Record<LinkTargetKind, string> = {
  parcours: 'parcours_id',
  formation: 'formation_id',
  module: 'module_id',
  teaching: 'teaching_id',
  podcast: 'podcast_id',
  show: 'show_id',
  series: 'series_id',
  season: 'season_id',
  event: 'event_id',
  academy_module: 'academy_module_id',
  academy_lesson: 'academy_lesson_id',
}
/** Colonne FK → cible (inverse). */
export const COLUMN_TARGET: Record<string, LinkTargetKind> = Object.fromEntries(
  Object.entries(TARGET_COLUMN).map(([k, v]) => [v, k as LinkTargetKind]),
) as Record<string, LinkTargetKind>

// ── Entité document canonique (projection applicative de cms_media type='pdf') ─
export interface PdfDocument {
  id: string
  title: string
  url: string
  slug: string | null
  documentType: DocumentType | null
  description: string | null
  pageCount: number | null
  author: string | null
  accessLevel: AccessLevel
  coverUrl: string | null
  category: string | null
  tags: string[]
  status: string
  visibleInLibrary: boolean
  publishedAt: string | null
  storagePath: string | null
}

/** Ligne brute cms_media (colonnes utiles) — tolérante (colonnes optionnelles). */
export interface CmsMediaRow {
  id: string
  type?: string | null
  title?: string | null
  url?: string | null
  thumbnail_url?: string | null
  category?: string | null
  tags?: string[] | null
  slug?: string | null
  document_type?: string | null
  description?: string | null
  page_count?: number | null
  author?: string | null
  access_level?: string | null
  status?: string | null
  visible_in_library?: boolean | null
  published_at?: string | null
  storage_path?: string | null
  platform?: string | null
}

/** Normalise une valeur d'accès inconnue vers un AccessLevel sûr (fail-safe 'public'). */
export function toAccessLevel(value: unknown): AccessLevel {
  return (ACCESS_LEVELS as readonly string[]).includes(value as string)
    ? (value as AccessLevel)
    : 'public'
}

/** Normalise une nature inconnue → DocumentType | null. */
export function toDocumentType(value: unknown): DocumentType | null {
  return (DOCUMENT_TYPES as readonly string[]).includes(value as string)
    ? (value as DocumentType)
    : null
}

/** Mappe une ligne cms_media vers le document canonique applicatif. */
export function mapMediaRowToDocument(row: CmsMediaRow): PdfDocument {
  return {
    id: row.id,
    title: row.title ?? 'Document',
    url: row.url ?? '',
    slug: row.slug ?? null,
    documentType: toDocumentType(row.document_type),
    description: row.description ?? null,
    pageCount: typeof row.page_count === 'number' ? row.page_count : null,
    // `author` dédié ; repli sur `platform` (auteur de facto historique).
    author: row.author ?? row.platform ?? null,
    accessLevel: toAccessLevel(row.access_level),
    coverUrl: row.thumbnail_url ?? null,
    category: row.category ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status ?? 'draft',
    // Défaut sûr : un PDF sans flag explicite est considéré visible (comme la migration).
    visibleInLibrary: row.visible_in_library !== false,
    publishedAt: row.published_at ?? null,
    storagePath: row.storage_path ?? null,
  }
}

/** Un document doit-il apparaître dans la BIBLIOTHÈQUE (vue du registre) ? */
export function isVisibleInLibrary(doc: Pick<PdfDocument, 'status' | 'visibleInLibrary'>): boolean {
  return doc.status === 'published' && doc.visibleInLibrary
}

/**
 * Source de lecture RÉSOLUE : privilégie l'URL canonique du document ; à défaut,
 * repli sur une URL legacy (formation_modules.pdf_url, etc.). Garantit qu'un
 * documentId n'écrase jamais un PDF legacy encore non canonicalisé.
 */
export function resolveDocumentSource(
  doc: Pick<PdfDocument, 'url'> | null | undefined,
  legacyUrl?: string | null,
): string | null {
  const canonical = doc?.url?.trim()
  if (canonical) return canonical
  const legacy = legacyUrl?.trim()
  return legacy || null
}

/** Lien de lecture stable du document (identité = id, pas l'URL du fichier). */
export function documentReaderHref(doc: Pick<PdfDocument, 'id'>): string {
  return `/lecture/pdf/${doc.id}`
}

// ── slug / URL ───────────────────────────────────────────────────────────────
/** Slug lisible dérivé d'un titre (sans accents, alphanumérique, tirets, ≤ 80). */
export function slugify(title: string): string {
  return (title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '') || 'document'
}

/** Normalise une URL pour la déduplication (host bas de casse, sans query/fragment). */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ''
    u.search = ''
    u.hostname = u.hostname.toLowerCase()
    return u.toString().replace(/\/$/, '')
  } catch {
    return (raw || '').trim()
  }
}

/**
 * Une source PDF est-elle autorisée dans le lecteur (garde-fou anti-SSRF léger) ?
 * PUR : l'origine same-origin est fournie par l'appelant (le composant client la
 * lit dans window.location.origin). Autorise http(s) same-origin OU *.supabase.co.
 */
export function isAllowedDocumentSource(raw: string, sameOrigin?: string): string | null {
  try {
    const u = new URL(raw, sameOrigin)
    if (!/^https?:$/.test(u.protocol)) return null
    if (sameOrigin && u.origin === sameOrigin) return u.toString()
    if (u.hostname.endsWith('.supabase.co')) return u.toString()
    return null
  } catch {
    return null
  }
}

// ── Rattachements (liens) ────────────────────────────────────────────────────
export interface DocumentLinkTarget {
  kind: LinkTargetKind
  id: string
}
export interface DocumentLinkInput {
  documentId: string
  target: DocumentLinkTarget
  role?: LinkRole
  position?: number
  status?: 'draft' | 'published'
}

/**
 * Construit la ligne d'insertion cms_document_links : document_id + LA seule
 * colonne FK de la cible. (Miroir applicatif du CHECK « exactement une non-nulle ».)
 */
export function buildDocumentLinkRow(input: DocumentLinkInput): Record<string, unknown> {
  const column = TARGET_COLUMN[input.target.kind]
  if (!column) throw new Error(`Cible de destination inconnue : ${input.target.kind}`)
  return {
    document_id: input.documentId,
    [column]: input.target.id,
    role: input.role ?? 'attachment',
    position: input.position ?? 0,
    status: input.status ?? 'published',
  }
}

/** Compte les colonnes cible non-nulles d'une ligne de lien (doit valoir 1). */
export function countLinkTargets(row: Record<string, unknown>): number {
  return LINK_TARGET_KINDS.reduce((n, kind) => {
    const col = TARGET_COLUMN[kind]
    return n + (row[col] != null ? 1 : 0)
  }, 0)
}

/** Valide qu'une ligne de lien pointe exactement UNE cible typée. */
export function validateLinkRow(row: Record<string, unknown>): { ok: boolean; error?: string } {
  if (!row.document_id) return { ok: false, error: 'document_id manquant.' }
  const count = countLinkTargets(row)
  if (count === 0) return { ok: false, error: 'Aucune destination : une cible est requise.' }
  if (count > 1) return { ok: false, error: 'Ambigu : une seule destination autorisée par lien.' }
  return { ok: true }
}

/** Extrait les cibles typées d'un ensemble de lignes de liens (destinations d'un doc). */
export function extractTargets(rows: Array<Record<string, unknown>>): DocumentLinkTarget[] {
  const out: DocumentLinkTarget[] = []
  for (const row of rows) {
    for (const kind of LINK_TARGET_KINDS) {
      const id = row[TARGET_COLUMN[kind]]
      if (id != null) {
        out.push({ kind, id: String(id) })
        break // une seule cible par ligne (invariant du CHECK)
      }
    }
  }
  return out
}
