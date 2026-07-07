/**
 * Filtrage/recherche de l'inbox « Nouveau Venu » (V2.2-C) — FRONT-ONLY.
 *
 * Fonctions PURES (aucune dépendance Supabase / React) : filtre par statut +
 * recherche texte insensible à la casse ET aux accents. Testables en isolation.
 */
export interface NewcomerFilterItem {
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  source: string | null
  status: string
}

export interface NewcomerFilterCriteria {
  status?: string
  query?: string
}

/** Minuscule + suppression des accents (NFD) + trim, pour une recherche tolérante. */
export function normalizeSearch(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Filtre une liste de demandes par statut puis par requête texte.
 * - status vide → tous les statuts.
 * - query vide/blanche → aucune restriction texte.
 * - la recherche couvre : prénom, nom, nom complet, email, téléphone (brut +
 *   chiffres seuls) et source ; insensible à la casse et aux accents.
 */
export function filterNewcomers<T extends NewcomerFilterItem>(
  list: T[],
  criteria: NewcomerFilterCriteria = {},
): T[] {
  const status = criteria.status || ''
  const q = normalizeSearch(criteria.query)
  return (list || []).filter((it) => {
    if (!it) return false
    if (status && it.status !== status) return false
    if (!q) return true
    const digits = String(it.telephone || '').replace(/\D/g, '')
    const hay = normalizeSearch(
      [
        it.prenom,
        it.nom,
        `${it.prenom || ''} ${it.nom || ''}`,
        it.email,
        it.telephone,
        digits,
        it.source,
      ].filter(Boolean).join(' '),
    )
    return hay.includes(q)
  })
}
