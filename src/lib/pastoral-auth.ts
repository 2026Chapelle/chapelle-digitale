import type { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'
import { can } from '@/lib/permissions'

/**
 * Garde des ACTIONS PASTORALES (répondre aux demandes : cure d'âme, prières,
 * accompagnement). Étend le garde admin existant SANS le remplacer :
 *   - Admin back-office (cookie) → autorisé.
 *   - Membre connecté avec un rôle pastoral (capacité `can_respond_pastoral` :
 *     pasteur, pasteur national, responsable national, berger) → autorisé.
 *
 * Réutilise les acquis : admin-auth (cookie), member-auth (session), permissions
 * (source unique RBAC). Aucune nouvelle base ni nouveau système d'auth.
 */
export interface PastoralActor { ok: boolean; actorId: string | null; via: 'admin' | 'role' | null }

export async function getPastoralActor(req: NextRequest): Promise<PastoralActor> {
  if (isAdminRequest(req)) return { ok: true, actorId: null, via: 'admin' }
  const sp = await getSessionProfile()
  if (sp && can({ role: sp.role }, 'can_respond_pastoral')) {
    return { ok: true, actorId: sp.uid, via: 'role' }
  }
  return { ok: false, actorId: null, via: null }
}
