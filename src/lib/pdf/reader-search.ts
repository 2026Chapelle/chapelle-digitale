/**
 * CITADELLE LIVING BOOKS — LB-1 : recherche PURE dans le document.
 *
 * Aucune dépendance (ni React, ni pdfjs, ni DOM). Le composant extrait le texte
 * de chaque page (pdf.js `getTextContent`) puis délègue ICI toute la logique :
 * normalisation, comptage des occurrences, navigation résultat suivant/précédent.
 * 100 % testable en isolation (environnement node).
 *
 * Insensible à la casse ET aux accents (français) : « citadelle » trouve
 * « Citadelle », « CITADELLE », « Citadèlle ».
 */

export interface PageText {
  page: number
  text: string
}

export interface SearchMatch {
  /** Page (1-indexée) contenant l'occurrence. */
  page: number
  /** Rang de l'occurrence DANS la page (0-indexé), pour surligner la bonne. */
  indexInPage: number
}

export interface SearchResult {
  query: string
  matches: SearchMatch[]
}

/** Retire les diacritiques et met en minuscules (comparaison FR robuste). */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Normalise une requête (trim + repli des espaces multiples). */
export function normalizeQuery(query: string): string {
  return typeof query === 'string' ? query.replace(/\s+/g, ' ').trim() : ''
}

/**
 * Construit la liste ordonnée des occurrences (par page croissante, puis ordre
 * d'apparition). Occurrences NON chevauchantes. Requête < 2 caractères → vide
 * (évite le bruit d'une recherche d'une seule lettre).
 */
export function buildSearchResult(pages: PageText[], rawQuery: string): SearchResult {
  const query = normalizeQuery(rawQuery)
  if (query.length < 2) return { query, matches: [] }

  const needle = foldText(query)
  const matches: SearchMatch[] = []
  const ordered = [...pages].sort((a, b) => a.page - b.page)

  for (const { page, text } of ordered) {
    const hay = foldText(text ?? '')
    let from = 0
    let indexInPage = 0
    // indexOf sur le texte plié : les longueurs sont préservées (NFD retire des
    // marques combinantes 1:1, la casse ne change pas la longueur en FR courant).
    for (;;) {
      const at = hay.indexOf(needle, from)
      if (at === -1) break
      matches.push({ page, indexInPage })
      indexInPage += 1
      from = at + needle.length
    }
  }
  return { query, matches }
}

/** Déplace l'index courant avec bouclage. `total<=0` → -1 (aucun). */
export function stepMatchIndex(total: number, current: number, dir: 1 | -1): number {
  if (total <= 0) return -1
  const base = current < 0 ? (dir === 1 ? -1 : 0) : current
  return (base + dir + total) % total
}

/** Libellé « 3 / 7 » (1-indexé pour l'humain) ou « 0 résultat ». */
export function matchLabel(total: number, current: number): string {
  if (total <= 0) return '0 résultat'
  const human = current < 0 ? 1 : current + 1
  return `${human} / ${total}`
}
