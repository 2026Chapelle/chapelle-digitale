/**
 * Visibilité de la navigation admin (V2.5-C-①) — helper PUR, testable.
 *
 * ⚠️ NON DESTRUCTIF PAR DÉFAUT : sans contexte de rôle, TOUTES les sections/items sont
 * renvoyés (comportement identique à l'existant). Ce module ne sécurise RIEN ; il prépare
 * seulement le futur socle d'identité/rôle admin (V2.5-C-②) qui, lui, passera un contexte.
 * La vraie protection reste au niveau route/API (isAdminRequest).
 */
import type { AdminNavItem, AdminNavSection } from './admin-nav'

export interface NavContext {
  role?: string | null
  /** évaluateur de permission optionnel (ex. can(role, perm)) — fourni par le futur socle */
  can?: (permission: string) => boolean
}

/** Un item est-il visible dans ce contexte ? (sans contexte → toujours visible) */
export function isItemVisible(item: AdminNavItem, ctx?: NavContext): boolean {
  if (!ctx || !ctx.role) return true // aucun rôle connu → non destructif : tout visible
  if (item.permission && ctx.can && !ctx.can(item.permission)) return false
  if (item.roles && item.roles.length > 0 && !item.roles.includes(ctx.role)) return false
  return true
}

/**
 * Renvoie les sections visibles. Sans contexte → renvoie l'intégralité (fallback sûr).
 * Avec contexte, filtre par métadonnées et retire les sections devenues vides.
 */
export function getVisibleSections(sections: AdminNavSection[], ctx?: NavContext): AdminNavSection[] {
  if (!ctx || !ctx.role) return sections
  return sections
    .map((s) => ({ ...s, items: s.items.filter((it) => isItemVisible(it, ctx)) }))
    .filter((s) => s.items.length > 0)
}
