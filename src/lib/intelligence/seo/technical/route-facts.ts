/**
 * CITADELLE INTELLIGENCE HUB — SEO · Faits techniques observés par route (DONNÉES)
 *
 * Ce fichier encode, en DONNÉES pures, ce qui a été RÉELLEMENT observé dans le
 * code de l'app (`src/app/**`) au moment de l'audit : la page ou son layout
 * exporte-t-il `metadata`/`generateMetadata` ? Une canonique explicite est-elle
 * déclarée ? La route est-elle dans `sitemap.ts` ? Émet-elle du JSON-LD de page ?
 *
 * ⚠️ Ces faits reflètent l'état APRÈS les correctifs sûrs appliqués par le
 * chantier 1 (ajout de layouts metadata sur /servir, /communaute, /parcours ;
 * ajout de canoniques sur /articles, /enseignements, /partenariat ; injection
 * d'un fil d'Ariane JSON-LD sur les pages piliers réparées). Aucune donnée SEO
 * inventée : seulement des faits de code vérifiables.
 *
 * `auditTechnicalSeo` (audit.ts) dérive la matrice à partir de ces faits + de
 * IMPORTANT_ROUTES. La logique de dérivation reste PURE et testable isolément.
 */

import type { RobotsPosture } from '../types'

/** Faits observés pour une route publique candidate à l'index. */
export interface RouteFact {
  path: string
  /** La page (ou son layout) exporte un titre via metadata/generateMetadata. */
  hasTitle: boolean
  /** Le metadata fournit une description. */
  hasDescription: boolean
  /** Une canonique explicite (`alternates.canonical`) est déclarée pour CETTE route. */
  hasCanonical: boolean
  /** La route figure dans src/app/sitemap.ts. */
  inSitemap: boolean
  /** La page émet des données structurées JSON-LD au niveau page. */
  hasPageJsonLd: boolean
  /** Page à forte valeur où des données structurées de page sont RECOMMANDÉES. */
  structuredDataExpected: boolean
  /** Posture robots observée (croisée avec robots.ts + metadata). */
  robots: RobotsPosture
}

/** Faits observés pour une route PRIVÉE (ne doit jamais être indexée). */
export interface PrivateRouteFact {
  path: string
  /** Bloquée au crawl par robots.ts (Disallow). */
  disallowedInRobots: boolean
  /** Une balise robots `noindex` explicite est posée (via metadata). */
  hasNoindexMeta: boolean
}

/**
 * Faits par route importante. Ordre aligné sur IMPORTANT_ROUTES.
 * Toutes ces routes ont `robots: 'ALLOW'` (aucun noindex, non bloquées).
 */
export const ROUTE_FACTS: ReadonlyArray<RouteFact> = [
  { path: '/',                 hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: true,  robots: 'ALLOW' },
  { path: '/ouverture',        hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/ouverture/vision', hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/live',             hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/formations',       hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/podcast',          hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/priere',           hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  // /evenements : contenu événementiel à forte valeur — Event JSON-LD recommandé
  // mais NON émis (pas de données d'événement réelles au niveau metadata ; on
  // n'invente pas). Gap honnête conservé (WARN low), jamais un faux Event.
  { path: '/evenements',       hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: true,  robots: 'ALLOW' },
  { path: '/dons',             hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/rejoindre',        hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/plateformes',      hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/notre-histoire',   hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/temoignages',      hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  // /enseignements & /articles : titre+description présents ; canonique AJOUTÉE
  // par le correctif (sinon héritage de la canonique racine '/').
  { path: '/enseignements',    hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/articles',         hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  // /servir, /communaute, /parcours : layout metadata + fil d'Ariane JSON-LD
  // AJOUTÉS par le correctif (auparavant pages client sans aucun metadata).
  { path: '/servir',           hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/partenariat',      hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/communaute',       hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/parcours',         hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: true,  structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/groupes',          hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/contact',          hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/faq',              hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
  { path: '/benevolat',        hasTitle: true, hasDescription: true, hasCanonical: true,  inSitemap: true, hasPageJsonLd: false, structuredDataExpected: false, robots: 'ALLOW' },
]

/**
 * Routes privées vérifiées : toutes bloquées au crawl par robots.ts. Elles ne
 * portent PAS de balise `noindex` explicite (protection = Disallow robots +
 * garde d'authentification serveur). C'est la posture opérante retenue.
 */
export const PRIVATE_ROUTE_FACTS: ReadonlyArray<PrivateRouteFact> = [
  { path: '/admin',         disallowedInRobots: true, hasNoindexMeta: false },
  { path: '/member',        disallowedInRobots: true, hasNoindexMeta: false },
  { path: '/api',           disallowedInRobots: true, hasNoindexMeta: false },
  { path: '/auth',          disallowedInRobots: true, hasNoindexMeta: false },
  { path: '/bienvenue',     disallowedInRobots: true, hasNoindexMeta: false },
]

/** Fait d'une route par chemin (utilitaire de test/lecture). */
export function routeFact(path: string): RouteFact | undefined {
  return ROUTE_FACTS.find((f) => f.path === path)
}
