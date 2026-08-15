/**
 * V2.9-B — Contenus en vedette (accueil). Logique PURE : sélection éditoriale +
 * validation des mutations. Réutilisée serveur (route) + client (hints) + tests.
 * Aucune dépendance réseau/UI.
 *
 * Source canonique : `public.formations` (les « Parcours » = lignes type='parcours').
 * Événements : `public.cms_events`. La table `public.parcours` n'est JAMAIS lue ici.
 */

export const FEATURED_LIMITS = { formations: 3, parcours: 3, events: 6 } as const
export type FeaturedGroup = keyof typeof FEATURED_LIMITS

export type DisplayType = 'Formation' | 'Programme' | 'Enseignement' | 'Parcours'
/** Libellé d'affichage dérivé du champ administrable `formations.type`. */
export function deriveDisplayType(type?: string | null): DisplayType {
  switch ((type || '').toLowerCase()) {
    case 'masterclass': return 'Enseignement'
    case 'parcours': return 'Parcours'
    case 'certification': return 'Programme'
    default: return 'Formation'
  }
}
export function isParcoursType(type?: string | null): boolean {
  return (type || '').toLowerCase() === 'parcours'
}
/** Groupe éditorial (limites) d'une formation selon son type. */
export function formationGroup(type?: string | null): 'formations' | 'parcours' {
  return isParcoursType(type) ? 'parcours' : 'formations'
}

// ── Sélection accueil — FORMATIONS (fusion tous types) ──────────────────────
export interface FormationRow {
  id: string; slug?: string | null; titre?: string | null; statut?: string | null
  type?: string | null; image_couverture?: string | null
  is_featured?: boolean | null; featured_order?: number | null
  date_publication?: string | null; created_at?: string | null
}

/** Repli déterministe : plus récent d'abord (date_publication → created_at), puis id. */
function cmpFormationFallback(a: FormationRow, b: FormationRow): number {
  const da = a.date_publication || a.created_at || ''
  const db = b.date_publication || b.created_at || ''
  if (da !== db) return da < db ? 1 : -1
  return String(a.id).localeCompare(String(b.id))
}

/**
 * Sélection FUSIONNÉE des formations pour l'accueil (tous types confondus).
 * `rows` = formations PUBLIÉES. Si ≥1 en vedette → UNIQUEMENT les vedettes, triées par
 * featured_order asc puis date desc/id (sélection partielle JAMAIS complétée). Sinon →
 * repli : publiées triées par date desc. Toujours ≤ limit, sans doublon.
 */
export function selectHomeFormations(rows: FormationRow[], limit = FEATURED_LIMITS.formations): FormationRow[] {
  const featured = rows.filter((r) => r.is_featured === true)
  if (featured.length > 0) {
    return [...featured].sort((a, b) => {
      const fo = (a.featured_order ?? 0) - (b.featured_order ?? 0)
      return fo !== 0 ? fo : cmpFormationFallback(a, b)
    }).slice(0, limit)
  }
  return [...rows].sort(cmpFormationFallback).slice(0, limit)
}

// ── Sélection accueil — ÉVÉNEMENTS ──────────────────────────────────────────
export interface EventRow {
  id: string; status?: string | null; is_featured?: boolean | null
  sort_order?: number | null; starts_at?: string | null; cover_url?: string | null
}

/**
 * Sélection des événements pour l'accueil. `rows` = événements PUBLIÉS & FUTURS
 * (filtre appliqué en amont par la requête, préservé). Si ≥1 en vedette → UNIQUEMENT
 * les vedettes triées par sort_order asc, starts_at asc, id (≤ limit). Sinon → repli :
 * ordre entrant (starts_at asc) tronqué à fallbackLimit.
 */
export function selectHomeEvents(rows: EventRow[], limit = FEATURED_LIMITS.events, fallbackLimit = 8): EventRow[] {
  const featured = rows.filter((r) => r.is_featured === true)
  if (featured.length > 0) {
    return [...featured].sort((a, b) => {
      const so = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      if (so !== 0) return so
      const sa = a.starts_at || '', sb = b.starts_at || ''
      if (sa !== sb) return sa < sb ? -1 : 1
      return String(a.id).localeCompare(String(b.id))
    }).slice(0, limit)
  }
  return rows.slice(0, fallbackLimit)
}

// ── Validation des mutations (serveur + hints client) ───────────────────────
export const FEATURED_RESOURCES = ['formations', 'cms_events'] as const
export type FeaturedResource = typeof FEATURED_RESOURCES[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface FeaturedInput { resource: FeaturedResource; id: string; is_featured: boolean; order: number }

/** Valide une demande de mise en vedette. Liste blanche stricte de ressources/champs. */
export function validateFeaturedInput(body: any): { ok: true; value: FeaturedInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Corps invalide.' }
  if (!(FEATURED_RESOURCES as readonly string[]).includes(body.resource)) return { ok: false, error: 'Ressource non autorisée.' }
  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return { ok: false, error: 'Identifiant invalide.' }
  if (typeof body.is_featured !== 'boolean') return { ok: false, error: 'is_featured doit être booléen.' }
  const order = Number(body.order)
  if (!Number.isInteger(order)) return { ok: false, error: 'Ordre invalide (entier requis).' }
  if (body.resource === 'formations' && order < 0) return { ok: false, error: 'Ordre négatif interdit.' }
  return { ok: true, value: { resource: body.resource, id: body.id, is_featured: body.is_featured, order } }
}

/** Activer dépasserait-il la limite du groupe ? `activeCountExcludingSelf` = vedettes actives du groupe hors cet id. */
export function exceedsFeaturedLimit(group: FeaturedGroup, activeCountExcludingSelf: number, willBeActive: boolean): boolean {
  if (!willBeActive) return false
  return activeCountExcludingSelf + 1 > FEATURED_LIMITS[group]
}

/** Un autre contenu ACTIF du même groupe a-t-il déjà cet ordre ? `existingActiveOrders` = ordres des vedettes actives hors cet id. */
export function hasDuplicateOrder(existingActiveOrders: number[], newOrder: number, willBeActive: boolean): boolean {
  if (!willBeActive) return false
  return existingActiveOrders.includes(newOrder)
}
