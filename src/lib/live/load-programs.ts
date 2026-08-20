/**
 * CHARGEMENT PROGRAMMES — lecture serveur de `live_programs` (publiés + actifs),
 * normalisée pour l'affichage. Réutilise `cmsList` (@/lib/cms, server-only) — aucun
 * client Supabase ajouté. UN SEUL loader de domaine ; plusieurs consommateurs
 * (/live public + espace membre).
 *
 * NB : ne lit JAMAIS cms_lives et ne calcule aucun état LIVE_NOW/UPCOMING/REPLAY —
 * ce module ne décrit que la programmation régulière (définition permanente).
 */
import { cmsList } from '@/lib/cms'
import { normalizeProgram, type LiveProgram, type RawLiveProgram } from './programs'

export async function loadLivePrograms(): Promise<LiveProgram[]> {
  // publicOnly ⇒ status='published' (PUBLIC_STATUSES par défaut). is_active filtré ici
  // (cmsList ne l'applique qu'à une liste blanche de tables ; pas à live_programs).
  const rows = await cmsList<RawLiveProgram>('live_programs', { publicOnly: true, orderBy: 'sort_order', ascending: true })
  if (!rows) return []
  return rows.filter((r) => r.is_active !== false).map(normalizeProgram)
}
