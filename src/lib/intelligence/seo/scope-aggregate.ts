/**
 * CITADELLE INTELLIGENCE — 5A · Helpers PURS d'agrégation de portée (host/scope).
 * Isolés hors de route.ts : un fichier `route.ts` Next ne peut exporter que des
 * handlers/params de route, jamais des helpers. Pur, testable hors-ligne.
 */

import {
  DEFAULT_SEO_SCOPE,
  classifyHost,
  classifyUrl,
  extractHost,
  type SeoScope,
} from './scope'
import type { GscPageRow, SeoOpportunity, SitemapInfo } from './types'

/**
 * Portée demandée par l'UI. La propriété Search Console est un DOMAINE couvrant
 * plusieurs hôtes : on ne suppose JAMAIS « citadelle ». Toute valeur invalide
 * retombe sur la portée par défaut (citadelle) — jamais d'invention.
 */
export function parseSeoScope(raw: string | null | undefined): SeoScope {
  if (raw === 'citadelle' || raw === 'institutional' || raw === 'global') return raw
  return DEFAULT_SEO_SCOPE
}

/**
 * Annote chaque page de sa vérité d'HÔTE/PORTÉE (5A), classée depuis l'URL
 * réelle (jamais depuis la propriété de domaine). Additif : reste assignable au
 * contrat gelé `GscPageRow`. Pur — testable hors-ligne.
 */
export function annotatePagesScope(pages: ReadonlyArray<GscPageRow>): GscPageRow[] {
  return pages.map((p) => {
    const host = extractHost(p.page)
    return { ...p, scope: classifyUrl(p.page), ...(host ? { host } : {}) }
  })
}

/**
 * Annote les opportunités d'une portée quand elle n'est pas déjà fournie (5A).
 * - SITEMAP_ISSUE : hérite la portée du sitemap concerné (sinon classée depuis
 *   le sujet). Garantit qu'une erreur du sitemap INSTITUTIONNEL n'est jamais
 *   présentée comme un problème « Citadelle ».
 * - Autres : classées depuis l'hôte du sujet quand il est déterminable ; sinon
 *   laissées inchangées (une requête n'est pas rattachable à un hôte).
 * Pur — ne masque rien, ne fabrique rien.
 */
export function annotateOpportunitiesScope(
  opportunities: ReadonlyArray<SeoOpportunity>,
  sitemaps: ReadonlyArray<SitemapInfo>,
): SeoOpportunity[] {
  const sitemapScope = new Map<string, SeoScope>()
  for (const s of sitemaps) if (s.scope) sitemapScope.set(s.path, s.scope)
  return opportunities.map((o) => {
    if (o.scope) return o
    let scope: SeoScope | undefined
    let host: string | undefined
    if (o.kind === 'SITEMAP_ISSUE') {
      scope = sitemapScope.get(o.subject) ?? classifyUrl(o.subject)
      host = extractHost(o.subject) ?? undefined
    } else {
      const h = extractHost(o.subject)
      if (h) {
        host = h
        scope = classifyHost(h)
      }
    }
    if (!scope) return o
    return { ...o, scope, ...(host ? { host } : {}) }
  })
}
