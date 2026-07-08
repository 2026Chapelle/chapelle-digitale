import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { routeIntent, DATA_INTENTS } from '@/lib/pastoral/intent-router'
import { buildAssistantResponse } from '@/lib/pastoral/assistant-report'
import type { IntakeLite } from '@/lib/pastoral/newcomer-intelligence'

/**
 * Assistant Pastoral — route serveur CONTRÔLÉE (V2.5-B.2-B-①).
 *
 * POST { question } → { ok, intent, confidence, matched, data }
 *
 * SÉCURITÉ :
 *  - Garde admin obligatoire (isAdminRequest) — sinon 401.
 *  - LECTURE SEULE STRICTE : aucun INSERT/UPDATE/DELETE, aucun changement de statut,
 *    aucun envoi (email/WhatsApp).
 *  - Le texte utilisateur ne sert QU'À choisir un intent (routeIntent, déterministe).
 *    Il n'est JAMAIS interpolé dans une requête ni envoyé à une IA externe.
 *  - Accès données borné : un SEUL lecteur contrôlé (colonnes fixes, table fixe,
 *    limite 500) alimente des sélecteurs allow-listés. Aucun SQL dynamique.
 *  - Intent inconnu / hors périmètre → réponse prudente, jamais d'invention.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Colonnes EXPOSÉES au moteur (minimisation : ni téléphone ni email ici).
const READ_COLS = 'id, prenom, nom, status, priority, created_at, processed_at, metadata, assigned_to_profile_id, converted_profile_id'
const MAX_QUESTION_LEN = 500
// Allow-list de l'accès données : DATA_INTENTS est défini dans intent-router (source unique,
// testée). Les intents hors de cet ensemble (unknown, limites_donnees) n'ouvrent aucune lecture.

/** Lecteur CONTRÔLÉ unique : lecture seule, colonnes/table fixes, borné. */
async function readNewcomerIntakes(): Promise<IntakeLite[]> {
  if (IS_DEMO_MODE) return []
  const { data, error } = await supabaseAdmin
    .from('newcomer_intakes')
    .select(READ_COLS)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data || []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    prenom: (r.prenom as string) ?? '',
    nom: (r.nom as string) ?? null,
    status: (r.status as string) ?? 'new',
    created_at: (r.created_at as string) ?? '',
    priority: (r.priority as string) ?? null,
    processed_at: (r.processed_at as string) ?? null,
    assigned_to_profile_id: (r.assigned_to_profile_id as string) ?? null,
    converted_profile_id: (r.converted_profile_id as string) ?? null,
    metadata: (r.metadata as { admin_note?: string } | null) ?? null,
  }))
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })

  // Anti-abus : 60 questions / minute / IP.
  const rl = rateLimit(`pastoral-assistant:${clientIp(req)}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, message: 'Trop de requêtes. Réessayez dans un instant.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
  }

  let question = ''
  try {
    const body = await req.json()
    question = (body?.question ?? '').toString().slice(0, MAX_QUESTION_LEN)
  } catch {
    return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 })
  }
  if (!question.trim()) return NextResponse.json({ ok: false, message: 'Question vide.' }, { status: 400 })

  const { intent, confidence, matched } = routeIntent(question)

  try {
    // N'accède aux données QUE si l'intent le requiert (limites_donnees / unknown → aucune lecture).
    const intakes = DATA_INTENTS.has(intent) ? await readNewcomerIntakes() : []
    const data = buildAssistantResponse(intent, intakes, Date.now())
    return NextResponse.json({ ok: true, intent, confidence, matched, data })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
