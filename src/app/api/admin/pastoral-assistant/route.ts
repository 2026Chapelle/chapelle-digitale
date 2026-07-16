import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { routeIntent, DATA_INTENTS } from '@/lib/pastoral/intent-router'
import { buildAssistantResponse } from '@/lib/pastoral/assistant-report'
import type { IntakeLite } from '@/lib/pastoral/newcomer-intelligence'
import {
  getNewcomerIntakesRepository,
  getNewcomerOrgLookupClient,
  resolveNewcomerAdminOrganizationId,
} from '@/lib/pastoral/newcomer-admin-client'
import { requireOrganizationId } from '@/lib/pastoral/newcomer-organization-id'
import { NewcomerTenantScopeError } from '@/lib/pastoral/newcomer-tenant-scope'

/**
 * Assistant Pastoral — route serveur CONTRÔLÉE (V2.5-B.2-B-① + Lot 2-A tenant).
 *
 * POST { question } → { ok, intent, confidence, matched, data }
 *
 * SÉCURITÉ :
 *  - Garde admin obligatoire (isAdminRequest) — sinon 401.
 *  - Lectures newcomer_intakes bornées par organization_id (scope canonique cier_admin).
 *  - LECTURE SEULE STRICTE : aucun INSERT/UPDATE/DELETE.
 *  - Intent inconnu / hors périmètre → réponse prudente, jamais d'invention.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Colonnes EXPOSÉES au moteur (minimisation : ni téléphone ni email ici).
const READ_COLS = 'id, prenom, nom, status, priority, created_at, processed_at, metadata, assigned_to_profile_id, converted_profile_id'
const MAX_QUESTION_LEN = 500

/** Lecteur CONTRÔLÉ unique : lecture seule, colonnes/table fixes, borné, tenant-scoped. */
async function readNewcomerIntakes(organizationId: unknown): Promise<IntakeLite[]> {
  if (IS_DEMO_MODE) return []
  const orgId = requireOrganizationId(organizationId)
  const repo = getNewcomerIntakesRepository()
  const data = await repo.listForOrganization(orgId, {
    columns: READ_COLS,
    limit: 500,
  })
  return data.map((r: Record<string, unknown>) => ({
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
    let organizationId: unknown = null
    if (DATA_INTENTS.has(intent) && !IS_DEMO_MODE) {
      organizationId = await resolveNewcomerAdminOrganizationId(getNewcomerOrgLookupClient(), {
        adminCookieOk: true,
      })
    }
    const intakes = DATA_INTENTS.has(intent) ? await readNewcomerIntakes(organizationId) : []
    const data = buildAssistantResponse(intent, intakes, Date.now())
    return NextResponse.json({ ok: true, intent, confidence, matched, data })
  } catch (e: unknown) {
    if (e instanceof NewcomerTenantScopeError) {
      return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    }
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
