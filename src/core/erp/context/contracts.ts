/**
 * Core ERP — port abstrait du contexte organisation courant (Lot 0.6-A).
 *
 * Aucune implémentation concrète ici : le Lot 1 pourra brancher
 * ActiveOrganizationResolver + repositories réels.
 */

import type { OrganizationContext } from './types'

/**
 * Fournit le contexte d'organisation courant.
 * Implémentation future uniquement — pas de Supabase, pas de cookie legacy.
 */
export interface CurrentOrganizationProvider {
  getCurrentOrganizationContext(): Promise<OrganizationContext | null>
}
