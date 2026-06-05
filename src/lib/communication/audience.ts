/**
 * CIBLAGE DES COMMUNICATIONS — réutilisé par campagnes ET annonces.
 * Partie PURE (matchesAudience, renderTemplate) testable + résolution serveur.
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface AudienceTarget {
  roles?: string[]
  statuts?: string[]   // membre_statut
  pays?: string[]
  plateformes?: string[] // plateforme_principale
}

export interface ProfileLike {
  role?: string | null
  membre_statut?: string | null
  pays?: string | null
  plateforme_principale?: string | null
}

const nonEmpty = (a?: string[]) => Array.isArray(a) && a.length > 0

/**
 * Un profil correspond-il à la cible ? Cible VIDE (aucun critère) = TOUS.
 * Chaque critère renseigné doit matcher (ET logique).
 */
export function matchesAudience(profile: ProfileLike, target?: AudienceTarget | null): boolean {
  const t = target || {}
  if (nonEmpty(t.roles) && !t.roles!.includes(String(profile.role || ''))) return false
  if (nonEmpty(t.statuts) && !t.statuts!.includes(String(profile.membre_statut || ''))) return false
  if (nonEmpty(t.pays) && !t.pays!.includes(String(profile.pays || ''))) return false
  if (nonEmpty(t.plateformes) && !t.plateformes!.includes(String(profile.plateforme_principale || ''))) return false
  return true
}

/** Substitution simple de variables `{cle}` (variable manquante → vide). */
export function renderTemplate(text: string, vars: Record<string, string | null | undefined>): string {
  return String(text || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '').toString())
}

/** Résout la cible en liste de destinataires (profils non archivés). */
export async function resolveAudience(target?: AudienceTarget | null): Promise<{ id: string; email: string | null; prenom: string | null }[]> {
  const t = target || {}
  let q = supabaseAdmin.from('profiles').select('id, email, prenom').is('archived_at', null)
  if (nonEmpty(t.roles)) q = q.in('role', t.roles!)
  if (nonEmpty(t.statuts)) q = q.in('membre_statut', t.statuts!)
  if (nonEmpty(t.pays)) q = q.in('pays', t.pays!)
  if (nonEmpty(t.plateformes)) q = q.in('plateforme_principale', t.plateformes!)
  const { data } = await q.limit(5000)
  return (data || []).map((p: any) => ({ id: p.id, email: p.email ?? null, prenom: p.prenom ?? null }))
}
