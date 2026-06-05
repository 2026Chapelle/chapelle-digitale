/**
 * PORTÉE COMMUNAUTAIRE — logique PURE (RBAC). Testable.
 *
 * Détermine ce qu'un utilisateur peut voir/gérer dans le module Groupes :
 *  - admin / super_admin            → 'all'      (global, toutes plateformes)
 *  - responsable/pasteur national   → 'nation'   (son périmètre pays)
 *    (ou tout utilisateur avec une affectation nation_responsables active)
 *  - responsable_integration        → 'assigned' (ses cellules : responsable_id = lui)
 *  - autre                          → 'denied'
 * Aligné sur src/lib/integration-scope.ts (même patron) et la source unique
 * de vérité src/lib/permissions via roles.
 */
import { isAdmin, isIntegration, isNational } from '@/lib/roles'

export type GroupScope = 'all' | 'nation' | 'assigned' | 'denied'

export function resolveGroupScope(opts: { role?: string | null; hasNationAssignment?: boolean }): GroupScope {
  if (isAdmin(opts.role)) return 'all'
  if (opts.hasNationAssignment || isNational(opts.role)) return 'nation'
  if (isIntegration(opts.role)) return 'assigned'
  return 'denied'
}
