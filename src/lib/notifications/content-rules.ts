/**
 * RÈGLES PURES des notifications de publication de contenu (aucune dépendance
 * serveur — testable en isolation). La diffusion effective vit dans `content.ts`.
 *
 * Ressources notifiables : Articles, Podcasts, Formations, Lives & Cultes,
 * Événements. Les autres tables CMS (médias, témoignages, pages, blocs d'accueil,
 * enseignements…) NE déclenchent PAS de notification.
 */

export interface ContentCfg {
  /** Colonne de statut (cms_* = `status`, LMS formations = `statut`). */
  statusField: string
  /** Valeur « publié » (cms_* = `published`, formations = `publie`). */
  publishedValue: string
  /** Type de notification (voir NotifType). */
  type: string
  /** Libellé au singulier pour le titre. */
  label: string
  emoji: string
  /** Lien public vers le contenu (ou sa liste). */
  href: (row: Record<string, any>) => string
}

/** Liste blanche des tables notifiables + leur configuration. */
export const CONTENT: Record<string, ContentCfg> = {
  cms_articles: { statusField: 'status', publishedValue: 'published', type: 'info', label: 'article', emoji: '📰', href: (r) => (r.slug ? `/articles/${r.slug}` : '/articles') },
  cms_podcasts: { statusField: 'status', publishedValue: 'published', type: 'info', label: 'podcast', emoji: '🎧', href: () => '/podcast' },
  cms_lives: { statusField: 'status', publishedValue: 'published', type: 'live', label: 'live', emoji: '🔴', href: () => '/live' },
  cms_events: { statusField: 'status', publishedValue: 'published', type: 'evenement', label: 'événement', emoji: '📅', href: () => '/evenements' },
  formations: { statusField: 'statut', publishedValue: 'publie', type: 'formation', label: 'formation', emoji: '📚', href: () => '/formations' },
}

/** La table est-elle notifiable ? (évite une pré-lecture inutile côté route). */
export function isNotifiableContent(table: string): boolean {
  return table in CONTENT
}

/** dedup_key stable d'une publication (idempotent). */
export function publishDedupKey(table: string, id: string | number): string {
  return `content:${table}:${id}:published`
}

/**
 * Décision PURE : ce write constitue-t-il une 1re publication notifiable ?
 * `before` = ligne avant écriture (null en création). Vrai uniquement pour une
 * transition brouillon → publié sur une table notifiable (jamais update d'un
 * déjà-publié, jamais dépublication, jamais table non listée).
 */
export function isFirstPublishTransition(
  table: string,
  before: Record<string, any> | null,
  after: Record<string, any> | null,
): boolean {
  const cfg = CONTENT[table]
  if (!cfg || !after) return false
  const wasPublished = before ? before[cfg.statusField] === cfg.publishedValue : false
  const isPublished = after[cfg.statusField] === cfg.publishedValue
  return !wasPublished && isPublished
}
