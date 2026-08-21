/**
 * CITADELLE INTELLIGENCE HUB — SEO · Constructeurs JSON-LD (PURS)
 *
 * Helpers factuels pour émettre des données structurées schema.org sur des pages
 * publiques. Règle d'or : AUCUNE donnée inventée. Ces constructeurs ne fabriquent
 * ni note, ni avis, ni auteur, ni date : ils ne reflètent que des faits fournis
 * (nom de page, fil d'Ariane dérivé de la route, URL absolue). Fonctions pures,
 * sérialisables, sans I/O — testables et réutilisables côté serveur.
 */

import { absoluteUrl } from '../important-routes'

/** Objet JSON-LD sérialisable (schema.org). */
export type JsonLd = Record<string, unknown>

/** Un maillon de fil d'Ariane : libellé humain + chemin absolu-isable. */
export interface BreadcrumbCrumb {
  name: string
  path: string
}

/**
 * BreadcrumbList schema.org. 100 % factuel : chaque position est dérivée de la
 * route réelle et du libellé de page fourni. N'invente aucun niveau.
 */
export function buildBreadcrumbJsonLd(
  crumbs: ReadonlyArray<BreadcrumbCrumb>,
  base?: string,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path, base),
    })),
  }
}

/**
 * Fil d'Ariane par défaut à deux niveaux (Accueil → page courante). Utilisé par
 * les pages publiques piliers dépourvues de données structurées propres.
 */
export function homeBreadcrumb(
  pageName: string,
  path: string,
  base?: string,
): JsonLd {
  return buildBreadcrumbJsonLd(
    [
      { name: 'Accueil', path: '/' },
      { name: pageName, path },
    ],
    base,
  )
}

/**
 * WebPage schema.org minimal : uniquement des faits fournis (nom, description,
 * URL). `description` est omis s'il est absent — jamais de remplissage inventé.
 */
export function buildWebPageJsonLd(input: {
  name: string
  path: string
  description?: string
  base?: string
}): JsonLd {
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    url: absoluteUrl(input.path, input.base),
    inLanguage: 'fr-FR',
  }
  if (input.description && input.description.trim()) {
    node.description = input.description.trim()
  }
  return node
}

/**
 * FAQPage schema.org à partir de couples question/réponse RÉELS. Les entrées vides
 * sont ignorées ; si aucune paire valide n'est fournie, renvoie `null` (on n'émet
 * jamais une FAQ vide ou fictive).
 */
export function buildFaqJsonLd(
  pairs: ReadonlyArray<{ question: string; answer: string }>,
): JsonLd | null {
  const clean = pairs.filter((p) => p.question?.trim() && p.answer?.trim())
  if (clean.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: clean.map((p) => ({
      '@type': 'Question',
      name: p.question.trim(),
      acceptedAnswer: { '@type': 'Answer', text: p.answer.trim() },
    })),
  }
}

/** Sérialise un nœud JSON-LD pour injection dans un `<script type="application/ld+json">`. */
export function serializeJsonLd(node: JsonLd): string {
  return JSON.stringify(node)
}
