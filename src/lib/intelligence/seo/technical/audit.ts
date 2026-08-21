/**
 * CITADELLE INTELLIGENCE HUB — SEO · Audit technique on-page (PUR)
 *
 * Construit la TECHNICAL_SEO_MATRIX à partir de faits de code OBSERVÉS
 * (route-facts.ts) croisés avec la liste canonique IMPORTANT_ROUTES. Fonction
 * PURE : aucune I/O, aucun secret, déterministe (l'instant est injecté). Aucune
 * donnée SEO inventée — chaque verdict découle d'un fait vérifiable dans le code.
 *
 * La SIGNATURE exportée `auditTechnicalSeo(input): TechnicalSeoMatrix` est stable
 * (importée par l'agrégateur du cockpit et la route technique). Les helpers de
 * dérivation sont exportés séparément pour être testés isolément sur des fixtures.
 */

import type {
  TechnicalSeoMatrix,
  SeoRouteAudit,
  SeoCheckStatus,
  SeoSeverity,
} from '../types'
import { IMPORTANT_ROUTES, type ImportantRoute } from '../important-routes'
import {
  ROUTE_FACTS,
  PRIVATE_ROUTE_FACTS,
  type RouteFact,
  type PrivateRouteFact,
} from './route-facts'

export interface TechnicalAuditInput {
  /** Instant de génération (ISO), injecté pour rester déterministe. */
  nowIso: string
  /** Base publique déployée (NEXT_PUBLIC_APP_URL résolu). */
  baseUrl: string
}

/* ------------------------------------------------------------------ */
/* Ordre de gravité (pour les rollups)                                 */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<SeoSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

/** Renvoie la gravité la plus élevée d'une liste (défaut `info`). */
export function maxSeverity(list: ReadonlyArray<SeoSeverity>): SeoSeverity {
  return list.reduce<SeoSeverity>(
    (acc, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[acc] ? s : acc),
    'info',
  )
}

/** Pire statut de check d'une liste : FAIL > WARN > PASS ; NA ignoré sauf si seul. */
export function rollupStatus(list: ReadonlyArray<SeoCheckStatus>): SeoCheckStatus {
  if (list.some((s) => s === 'FAIL')) return 'FAIL'
  if (list.some((s) => s === 'WARN')) return 'WARN'
  if (list.some((s) => s === 'PASS')) return 'PASS'
  return 'NA'
}

/* ------------------------------------------------------------------ */
/* Dérivation d'une ligne de route                                     */
/* ------------------------------------------------------------------ */

/**
 * Dérive une SeoRouteAudit à partir d'un fait de route + de la spec (importance,
 * shouldIndex). Pur et testable sur fixtures synthétiques.
 */
export function deriveRouteAudit(
  route: Pick<ImportantRoute, 'path' | 'shouldIndex'>,
  fact: RouteFact | undefined,
): SeoRouteAudit {
  const issues: string[] = []
  const severities: SeoSeverity[] = []

  // Fait manquant : la route importante n'a AUCUN fait encodé → à instruire.
  if (!fact) {
    return {
      route: route.path,
      indexable: false,
      title: 'NA',
      description: 'NA',
      canonical: 'NA',
      structuredData: 'NA',
      inSitemap: false,
      robots: 'ALLOW',
      issues: ['Aucun fait technique encodé pour cette route importante.'],
      severity: 'medium',
      action: 'Encoder les faits observés (metadata, canonique, sitemap, JSON-LD).',
    }
  }

  const robots = fact.robots
  const blocked = robots === 'DISALLOW' || robots === 'NOINDEX'

  // --- Titre / description ------------------------------------------------
  const title: SeoCheckStatus = fact.hasTitle ? 'PASS' : 'FAIL'
  const description: SeoCheckStatus = fact.hasDescription ? 'PASS' : 'FAIL'
  if (!fact.hasTitle) {
    issues.push('Titre (metadata) manquant.')
    severities.push('high')
  }
  if (!fact.hasDescription) {
    issues.push('Description (metadata) manquante.')
    severities.push('high')
  }

  // --- Canonique ----------------------------------------------------------
  // Sans canonique explicite, la page hérite de la canonique racine ('/') fixée
  // dans le layout racine → risque de canonique erronée. Traité en WARN (medium).
  const canonical: SeoCheckStatus = fact.hasCanonical ? 'PASS' : 'WARN'
  if (!fact.hasCanonical) {
    issues.push(
      'Canonique de page non déclarée (risque d’héritage de la canonique racine « / »).',
    )
    severities.push('medium')
  }

  // --- Données structurées ------------------------------------------------
  let structuredData: SeoCheckStatus
  if (fact.hasPageJsonLd) {
    structuredData = 'PASS'
  } else if (fact.structuredDataExpected) {
    structuredData = 'WARN'
    issues.push('Données structurées de page recommandées mais absentes.')
    severities.push('low')
  } else {
    structuredData = 'NA'
  }

  // --- Sitemap ------------------------------------------------------------
  if (route.shouldIndex && !fact.inSitemap) {
    issues.push('Route indexable absente du sitemap.')
    severities.push('medium')
  }

  // --- Robots / indexabilité ---------------------------------------------
  if (route.shouldIndex && blocked) {
    issues.push(
      `Route censée être indexée mais bloquée (robots: ${robots}).`,
    )
    severities.push('critical')
  }
  const indexable = route.shouldIndex && !blocked

  const severity = maxSeverity(severities)
  const action = issues.length > 0 ? actionFor(issues, fact, route) : undefined

  return {
    route: route.path,
    indexable,
    title,
    description,
    canonical,
    structuredData,
    inSitemap: fact.inSitemap,
    robots,
    issues,
    severity,
    action,
  }
}

/** Action corrective concise, dérivée des problèmes constatés. */
function actionFor(
  issues: ReadonlyArray<string>,
  fact: RouteFact,
  route: Pick<ImportantRoute, 'path' | 'shouldIndex'>,
): string {
  if (!fact.hasTitle || !fact.hasDescription) {
    return `Ajouter un layout metadata (titre + description) pour ${route.path}.`
  }
  if (route.shouldIndex && (fact.robots === 'DISALLOW' || fact.robots === 'NOINDEX')) {
    return `Débloquer ${route.path} (retirer noindex/Disallow) — route censée être indexée.`
  }
  if (!fact.hasCanonical) {
    return `Déclarer alternates.canonical: '${route.path}'.`
  }
  if (route.shouldIndex && !fact.inSitemap) {
    return `Ajouter ${route.path} au sitemap.`
  }
  if (fact.structuredDataExpected && !fact.hasPageJsonLd) {
    return `Émettre des données structurées factuelles pour ${route.path}.`
  }
  return `Revoir la configuration SEO de ${route.path}.`
}

/* ------------------------------------------------------------------ */
/* Vérification des routes privées                                     */
/* ------------------------------------------------------------------ */

/**
 * Statut de la garde « routes privées non indexables ». PASS si toute route
 * privée est bloquée au crawl (Disallow) OU porte un noindex explicite. FAIL si
 * l'une est exposée. NA si aucune route privée fournie.
 */
export function derivePrivateNoindex(
  privateFacts: ReadonlyArray<PrivateRouteFact>,
): SeoCheckStatus {
  if (privateFacts.length === 0) return 'NA'
  const exposed = privateFacts.filter(
    (p) => !p.disallowedInRobots && !p.hasNoindexMeta,
  )
  return exposed.length === 0 ? 'PASS' : 'FAIL'
}

/* ------------------------------------------------------------------ */
/* Assemblage de la matrice                                            */
/* ------------------------------------------------------------------ */

/**
 * Construit la matrice complète à partir de routes, faits et faits privés.
 * Pur — cœur testable de `auditTechnicalSeo`.
 */
export function deriveMatrix(
  routes: ReadonlyArray<Pick<ImportantRoute, 'path' | 'shouldIndex'>>,
  facts: ReadonlyArray<RouteFact>,
  privateFacts: ReadonlyArray<PrivateRouteFact>,
  nowIso: string,
): TechnicalSeoMatrix {
  const byPath = new Map(facts.map((f) => [f.path, f]))
  const rows = routes.map((r) => deriveRouteAudit(r, byPath.get(r.path)))

  const summary = {
    total: rows.length,
    indexable: rows.filter((r) => r.indexable).length,
    withIssues: rows.filter((r) => r.issues.length > 0).length,
    critical: rows.filter((r) => r.severity === 'critical').length,
    high: rows.filter((r) => r.severity === 'high').length,
  }

  const checks = {
    metadata: rollupStatus(
      rows.flatMap((r) => [r.title, r.description]),
    ),
    canonicals: rollupStatus(rows.map((r) => r.canonical)),
    robots: deriveRobotsCheck(rows),
    sitemap: deriveSitemapCheck(routes, byPath),
    jsonLd: deriveJsonLdCheck(rows),
    privateRoutesNoindex: derivePrivateNoindex(privateFacts),
  }

  return { generatedAt: nowIso, routes: rows, summary, checks }
}

/** Robots : FAIL si une route indexable est bloquée ; sinon PASS (NA si vide). */
function deriveRobotsCheck(rows: ReadonlyArray<SeoRouteAudit>): SeoCheckStatus {
  if (rows.length === 0) return 'NA'
  const blockedIndexable = rows.some(
    (r) => !r.indexable && (r.robots === 'DISALLOW' || r.robots === 'NOINDEX'),
  )
  return blockedIndexable ? 'FAIL' : 'PASS'
}

/** Sitemap : FAIL si une route indexable manque ; NA si aucune route. */
function deriveSitemapCheck(
  routes: ReadonlyArray<Pick<ImportantRoute, 'path' | 'shouldIndex'>>,
  byPath: ReadonlyMap<string, RouteFact>,
): SeoCheckStatus {
  const indexables = routes.filter((r) => r.shouldIndex)
  if (indexables.length === 0) return 'NA'
  const missing = indexables.filter((r) => !byPath.get(r.path)?.inSitemap)
  return missing.length === 0 ? 'PASS' : 'FAIL'
}

/** JSON-LD : WARN si une page « attendue » n'émet pas de données structurées. */
function deriveJsonLdCheck(rows: ReadonlyArray<SeoRouteAudit>): SeoCheckStatus {
  if (rows.length === 0) return 'NA'
  const hasWarn = rows.some((r) => r.structuredData === 'WARN')
  return hasWarn ? 'WARN' : 'PASS'
}

/* ------------------------------------------------------------------ */
/* Point d'entrée stable                                               */
/* ------------------------------------------------------------------ */

/**
 * Construit la TECHNICAL_SEO_MATRIX réelle depuis IMPORTANT_ROUTES + les faits
 * observés du code. `input.baseUrl` est conservé pour compat de signature (les
 * chemins de la matrice restent relatifs, absolutisables via `absoluteUrl`).
 */
export function auditTechnicalSeo(input: TechnicalAuditInput): TechnicalSeoMatrix {
  return deriveMatrix(IMPORTANT_ROUTES, ROUTE_FACTS, PRIVATE_ROUTE_FACTS, input.nowIso)
}
