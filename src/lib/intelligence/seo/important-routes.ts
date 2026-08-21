/**
 * CITADELLE INTELLIGENCE HUB — SEO
 * Liste CANONIQUE des routes publiques importantes de Citadelle.
 *
 * Source de vérité partagée par :
 *  - l'audit technique on-page (matrice de routes),
 *  - la cible bornée de l'URL Inspection Search Console,
 *  - la vue Indexation du cockpit.
 *
 * Pur (aucun I/O). Aligné sur src/app/sitemap.ts et src/app/robots.ts. On ne
 * liste ici QUE des routes destinées à l'index Google — jamais /admin, /member,
 * /api, /auth, ni /bienvenue (bloqués par robots).
 */

/** Base publique (déployée). Fallback = domaine de production Citadelle. */
export const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'

/** Importance relative d'une route (borne l'inspection et priorise les alertes). */
export type RouteImportance = 'primary' | 'secondary'

export interface ImportantRoute {
  path: string
  importance: RouteImportance
  /** Doit être indexable (dans le sitemap, sans noindex) ? */
  shouldIndex: boolean
}

/**
 * Routes publiques importantes. `primary` = pages piliers (inspectées en
 * priorité, quota URL Inspection borné). Aligné sur le sitemap statique.
 */
export const IMPORTANT_ROUTES: ReadonlyArray<ImportantRoute> = [
  { path: '/', importance: 'primary', shouldIndex: true },
  { path: '/ouverture', importance: 'primary', shouldIndex: true },
  { path: '/ouverture/vision', importance: 'secondary', shouldIndex: true },
  { path: '/live', importance: 'primary', shouldIndex: true },
  { path: '/formations', importance: 'primary', shouldIndex: true },
  { path: '/podcast', importance: 'primary', shouldIndex: true },
  { path: '/priere', importance: 'secondary', shouldIndex: true },
  { path: '/evenements', importance: 'secondary', shouldIndex: true },
  { path: '/dons', importance: 'secondary', shouldIndex: true },
  { path: '/rejoindre', importance: 'primary', shouldIndex: true },
  { path: '/plateformes', importance: 'secondary', shouldIndex: true },
  { path: '/notre-histoire', importance: 'secondary', shouldIndex: true },
  { path: '/temoignages', importance: 'secondary', shouldIndex: true },
  { path: '/enseignements', importance: 'primary', shouldIndex: true },
  { path: '/articles', importance: 'secondary', shouldIndex: true },
  { path: '/servir', importance: 'secondary', shouldIndex: true },
  { path: '/partenariat', importance: 'secondary', shouldIndex: true },
  { path: '/communaute', importance: 'secondary', shouldIndex: true },
  { path: '/parcours', importance: 'secondary', shouldIndex: true },
  { path: '/groupes', importance: 'secondary', shouldIndex: true },
  { path: '/contact', importance: 'secondary', shouldIndex: true },
  { path: '/faq', importance: 'secondary', shouldIndex: true },
  { path: '/benevolat', importance: 'secondary', shouldIndex: true },
]

/** Absolutise une route sur la base publique donnée (défaut = PUBLIC_BASE_URL). */
export function absoluteUrl(path: string, base: string = PUBLIC_BASE_URL): string {
  const b = base.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p === '/' ? '/' : p.replace(/\/+$/, '')}`
}

/** Sous-ensemble prioritaire (pour bornage strict de l'URL Inspection). */
export function primaryRoutes(): ReadonlyArray<ImportantRoute> {
  return IMPORTANT_ROUTES.filter((r) => r.importance === 'primary')
}
