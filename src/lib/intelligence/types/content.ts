/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Content graph : un même enseignement diffusé partout reste UN SEUL contenu logique.
 *
 * Décision d'architecture (Agent 8) : le graphe INTERNE Chapelle/Citadelle est déjà
 * modélisé par `cms_document_links` (jonction FK-typée). On NE le réimplémente PAS.
 * La nouveauté du Hub = la dimension MULTI-PLATEFORME (destinations externes :
 * YouTube / Facebook / WhatsApp) + une clé de contenu canonique transverse.
 */

/** Plateformes de diffusion d'un contenu. */
export const CONTENT_PLATFORMS = [
  'chapelle',
  'citadelle',
  'youtube',
  'facebook',
  'whatsapp',
] as const

export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number]

/** Types de contenus canoniques (alignés sur le CMS existant). */
export const CONTENT_TYPES = [
  'culte',
  'live',
  'enseignement',
  'podcast',
  'article',
  'formation',
  'parcours',
  'document',
  'evenement',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

/**
 * Nœud de contenu logique canonique. `content_id` est la clé transverse ; il
 * s'appuie sur les identités CMS existantes (cms_teachings/cms_podcasts/… ) et NE
 * duplique pas leurs données — il les référence.
 */
export interface ContentEntity {
  content_id: string
  type: ContentType
  title: string
  canonical_slug: string | null
  published_at: string | null // ISO 8601 ou null si brouillon
  /** Référence vers la ligne CMS source (table + id) — traçabilité, pas de copie. */
  sourceRef?: { table: string; id: string }
}

/**
 * Destination : où un contenu logique est diffusé. La combinaison
 * (platform, external_id) est unique par contenu. `campaign_id` relie à
 * l'attribution (cf. attribution.ts).
 */
export interface ContentDestination {
  content_id: string
  platform: ContentPlatform
  external_id: string | null // ex : YouTube video id, post id Facebook
  url: string
  campaign_id?: string | null
}

/** Vue jointe pratique pour l'UI : un contenu et l'ensemble de ses destinations. */
export interface ContentGraphNode {
  entity: ContentEntity
  destinations: ReadonlyArray<ContentDestination>
}

export function isContentPlatform(value: unknown): value is ContentPlatform {
  return typeof value === 'string' && (CONTENT_PLATFORMS as readonly string[]).includes(value)
}
