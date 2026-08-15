import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import {
  PODCAST_PREMIUM_ENTITLEMENT_KEY,
  grantEntitlementByAdmin,
  revokeEntitlementForUser,
  getEntitlementStatus,
} from '@/lib/podcast/premium-acquisition'

/**
 * PODCAST-5C — Administration du Premium podcast (octroi / révocation / statut).
 *   GET  /api/admin/podcast-premium?q=<recherche>   → membres + statut Premium
 *   GET  /api/admin/podcast-premium?user_id=<uuid>  → statut d'un membre (avec historique)
 *   POST /api/admin/podcast-premium { action:'grant'|'revoke', user_id, expires_at?, note? }
 *
 * Garde : cookie admin (RBAC existant — admin/super_admin). Écriture service_role via les
 * primitives canoniques premium-acquisition (aucune source concurrente, fail-closed en amont).
 * Le membre ne peut jamais s'auto-octroyer un droit : ce chemin est exclusivement admin.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY = PODCAST_PREMIUM_ENTITLEMENT_KEY
const writeLimited = (req: NextRequest) => !rateLimit(`admin-premium:${clientIp(req)}`, { limit: 60, windowMs: 60 * 1000 }).ok

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { members: [] } })
  try {
    const sp = req.nextUrl.searchParams
    const userId = (sp.get('user_id') || '').trim()

    // Statut détaillé d'un membre précis (fiche).
    if (userId) {
      const status = await getEntitlementStatus(supabaseAdmin, userId, KEY)
      return NextResponse.json({ ok: true, data: { user_id: userId, ...status } })
    }

    // Recherche de membres + statut Premium synthétique.
    const q = (sp.get('q') || '').replace(/[%,()]/g, ' ').trim()
    let query = supabaseAdmin.from('profiles')
      .select('id, prenom, nom, email, membre_statut')
      .order('date_inscription', { ascending: false })
      .limit(25)
    if (q) query = query.or(`prenom.ilike.%${q}%,nom.ilike.%${q}%,email.ilike.%${q}%`)
    const { data: profiles, error } = await query
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    const rows = (profiles || []) as Array<{ id: string }>
    const members = await Promise.all(rows.map(async (p) => {
      const status = await getEntitlementStatus(supabaseAdmin, p.id, KEY)
      return { ...p, premium_active: status.active }
    }))
    return NextResponse.json({ ok: true, data: { members } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (writeLimited(req)) return NextResponse.json({ ok: false, message: 'Trop de requêtes.' }, { status: 429 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').trim()
    const userId = String(body?.user_id || '').trim()
    if (!userId) return NextResponse.json({ ok: false, message: 'user_id requis.' }, { status: 400 })

    // Le membre cible doit exister (aucun octroi sur un id fantôme).
    const { data: target } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle()
    if (!target) return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })

    if (action === 'grant') {
      // Expiration optionnelle (ISO). Vide/absente ⇒ à vie. Une date passée est refusée
      // (jamais octroyer un droit déjà expiré).
      const raw = typeof body?.expires_at === 'string' ? body.expires_at.trim() : ''
      let expiresAt: string | null = null
      if (raw) {
        const t = Date.parse(raw)
        if (!Number.isFinite(t)) return NextResponse.json({ ok: false, message: 'expires_at invalide.' }, { status: 400 })
        if (t <= Date.now()) return NextResponse.json({ ok: false, message: 'expires_at doit être dans le futur.' }, { status: 400 })
        expiresAt = new Date(t).toISOString()
      }
      const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null
      const res = await grantEntitlementByAdmin(supabaseAdmin, { userId, entitlementKey: KEY, expiresAt, note })
      if (res.error) return NextResponse.json({ ok: false, message: res.error }, { status: 500 })
      const status = await getEntitlementStatus(supabaseAdmin, userId, KEY)
      return NextResponse.json({ ok: true, data: { granted: res.granted, idempotent: res.idempotent, ...status } })
    }

    if (action === 'revoke') {
      const res = await revokeEntitlementForUser(supabaseAdmin, { userId, entitlementKey: KEY })
      if (res.error) return NextResponse.json({ ok: false, message: res.error }, { status: 500 })
      const status = await getEntitlementStatus(supabaseAdmin, userId, KEY)
      return NextResponse.json({ ok: true, data: { revoked: res.revoked, ...status } })
    }

    return NextResponse.json({ ok: false, message: 'Action inconnue (grant | revoke).' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
