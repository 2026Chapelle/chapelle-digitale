/**
 * PORTÉE DU SUIVI D'INTÉGRATION — logique PURE (RBAC). Testable.
 *
 * Détermine ce qu'un utilisateur peut voir dans le dashboard intégration :
 *  - admin / super_admin            → 'all'      (visibilité globale)
 *  - responsable/pasteur national   → 'nation'   (son périmètre pays)
 *    (ou tout utilisateur avec une affectation nation_responsables active)
 *  - responsable_integration        → 'assigned' (ses membres : berger_id = lui)
 *  - autre                          → 'denied'
 * Respecte la source unique de vérité (src/lib/permissions via roles).
 */
import { isAdmin, isIntegration, isNational } from '@/lib/roles'

export type IntegrationScope = 'all' | 'nation' | 'assigned' | 'denied'

export function resolveIntegrationScope(opts: { role?: string | null; hasNationAssignment?: boolean }): IntegrationScope {
  if (isAdmin(opts.role)) return 'all'
  if (opts.hasNationAssignment || isNational(opts.role)) return 'nation'
  if (isIntegration(opts.role)) return 'assigned'
  return 'denied'
}
