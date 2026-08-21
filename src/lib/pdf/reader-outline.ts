/**
 * CITADELLE LIVING BOOKS — LB-1 : table des matières PURE.
 *
 * pdf.js `getOutline()` renvoie un ARBRE de signets. Ce module APLATIT l'arbre en
 * liste indentée (titre + profondeur + destination), SANS toucher pdfjs : la
 * résolution destination→page (async : getDestination / getPageIndex) reste dans
 * le composant. LB-1 n'INVENTE jamais de sommaire : si le PDF n'en a pas, la liste
 * est vide et l'UI affiche « Aucun sommaire disponible ».
 */

export interface RawOutlineNode {
  title?: unknown
  dest?: unknown
  items?: RawOutlineNode[] | null
}

export interface FlatOutlineItem {
  /** Identifiant stable (chemin dans l'arbre), pour les clés React. */
  id: string
  title: string
  /** Profondeur d'indentation (0 = racine). */
  depth: number
  /** Destination brute pdf.js (string nommée, ou tableau de dest explicite). */
  dest: string | unknown[] | null
}

/** Y a-t-il au moins une entrée de sommaire exploitable ? */
export function hasOutline(nodes: RawOutlineNode[] | null | undefined): boolean {
  return Array.isArray(nodes) && nodes.length > 0
}

/** Aplati l'arbre d'outline en liste indentée, dans l'ordre du document. */
export function flattenOutline(
  nodes: RawOutlineNode[] | null | undefined,
  depth = 0,
  prefix = '',
): FlatOutlineItem[] {
  if (!Array.isArray(nodes)) return []
  const out: FlatOutlineItem[] = []
  nodes.forEach((node, i) => {
    const id = prefix ? `${prefix}.${i}` : `${i}`
    const title = typeof node.title === 'string' && node.title.trim() ? node.title.trim() : 'Sans titre'
    const dest = (typeof node.dest === 'string' || Array.isArray(node.dest)) ? (node.dest as string | unknown[]) : null
    out.push({ id, title, depth, dest })
    if (Array.isArray(node.items) && node.items.length) {
      out.push(...flattenOutline(node.items, depth + 1, id))
    }
  })
  return out
}

/**
 * Extrait la RÉFÉRENCE de page d'une destination EXPLICITE (tableau pdf.js dont
 * le 1er élément est un ref {num,gen}). Renvoie null si non résoluble purement
 * (destination nommée → l'appelant fera pdf.getDestination d'abord).
 */
export function firstDestRef(explicitDest: unknown): { num: number; gen: number } | null {
  if (!Array.isArray(explicitDest) || explicitDest.length === 0) return null
  const ref = explicitDest[0] as { num?: unknown; gen?: unknown } | null
  if (ref && typeof ref.num === 'number' && typeof ref.gen === 'number') {
    return { num: ref.num, gen: ref.gen }
  }
  return null
}
