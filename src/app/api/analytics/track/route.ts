import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { parseDevice, parseBrowser, parseOS, detectSource, geoFromHeaders } from '@/lib/analytics-server'

/**
 * Ingestion analytics interne Citadelle (écriture seule, publique).
 *
 *   POST /api/analytics/track
 *   body: {
 *     session: string,            // clé de session aléatoire (client)
 *     type: 'pageview'|'heartbeat'|'click'|'download'|'video'|'conversion',
 *     path?, category?, label?, value?, userId?, referrer?, source?,
 *     duration?: number,          // secondes actives à ajouter (heartbeat)
 *     utm?: { source?, medium?, campaign? }
 *   }
 *
 * - Met à jour/insère la session (présence temps réel via last_seen) puis,
 *   pour les types non-heartbeat, journalise un événement.
 * - Confidentialité : aucune IP stockée ; visiteurs anonymes sans PII.
 * - Réponse 204 immédiate (compatible navigator.sendBeacon), jamais bloquante.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['pageview', 'heartbeat', 'click', 'download', 'video', 'conversion'])
const str = (v: unknown, max = 512): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const ok = () => new NextResponse(null, { status: 204 })

  // Anti-flood : 240 hits / min / IP (heartbeat 30s + navigation reste bien en deçà).
  if (!rateLimit(`analytics:${clientIp(req)}`, { limit: 240, windowMs: 60 * 1000 }).ok) {
    return new NextResponse(null, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = JSON.parse(await req.text()) as Record<string, unknown> } catch { return ok() }
  if (IS_DEMO_MODE) return ok()

  const sessionKey = str(body.session) || str(body.session_id)
  if (!sessionKey) return ok()

  const rawType = (str(body.type) || 'pageview').toLowerCase()
  const type = ALLOWED.has(rawType) ? rawType : 'click'
  const userId = (() => { const u = str(body.userId) || str(body.user_id); return u && UUID_RE.test(u) ? u : null })()

  const ua = req.headers.get('user-agent') || ''
  const { pays, ville } = geoFromHeaders(req.headers)
  const referrer = str(body.referrer, 256)
  const utm = (body.utm && typeof body.utm === 'object') ? (body.utm as Record<string, unknown>) : {}
  const source = str(body.source) || detectSource(referrer, str(utm.source))
  const path = str(body.path, 256)
  const dur = Math.max(0, Math.min(120, Number(body.duration) || 0)) // borne : 0–120s par tick

  try {
    // ── Session : insert si nouvelle, sinon mise à jour de présence/compteurs ──
    const { data: existing } = await supabaseAdmin
      .from('analytics_sessions').select('id, page_views, events_count, duration_sec').eq('session_key', sessionKey).maybeSingle()

    if (!existing) {
      await supabaseAdmin.from('analytics_sessions').insert({
        session_key: sessionKey, user_id: userId, is_auth: !!userId,
        device: parseDevice(ua), browser: parseBrowser(ua), os: parseOS(ua),
        source, referrer, landing_path: path, pays, ville,
        page_views: type === 'pageview' ? 1 : 0,
        events_count: type === 'pageview' || type === 'heartbeat' ? 0 : 1,
        duration_sec: dur,
      })
    } else {
      const upd: Record<string, any> = {
        last_seen: new Date().toISOString(),
        duration_sec: (Number(existing.duration_sec) || 0) + dur,
      }
      if (userId) { upd.user_id = userId; upd.is_auth = true }
      if (type === 'pageview') upd.page_views = (Number(existing.page_views) || 0) + 1
      if (type !== 'pageview' && type !== 'heartbeat') upd.events_count = (Number(existing.events_count) || 0) + 1
      if (pays) upd.pays = pays
      await supabaseAdmin.from('analytics_sessions').update(upd).eq('id', existing.id)
    }

    // ── Événement (sauf heartbeat pur) ──
    if (type !== 'heartbeat') {
      const value = Number.isFinite(Number(body.value)) ? Number(body.value) : null
      await supabaseAdmin.from('analytics_events').insert({
        session_key: sessionKey, user_id: userId, type,
        category: str(body.category, 64), path, label: str(body.label, 256),
        value, pays, meta: (body.meta && typeof body.meta === 'object') ? body.meta : null,
      })
    }
  } catch {
    // Télémétrie : ne jamais propager au client.
  }
  return ok()
}
