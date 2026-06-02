import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Ingestion analytics (append-only) → table `chapelle.analytics_events`.
 *
 *   POST /api/analytics
 *   body: { type, path?, session?, referrer?, cta?, label?, country?, utm?, metadata? }
 *
 * Alimente en TEMPS RÉEL le tableau de bord admin (visiteurs, pages vues,
 * clics CTA, pays, tendance). Pensé pour `navigator.sendBeacon` : corps
 * text/plain JSON, réponse 204 immédiate, jamais d'échec bloquant côté client.
 *
 * Mode démo (Supabase non configuré) : accepte et ignore silencieusement.
 * Aucune authentification : endpoint public d'écriture seule via service role,
 * surface limitée (insert only) ; les lectures restent réservées à /admin.
 */
export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set([
  'page_view', 'cta_click', 'don_started', 'don_completed',
  'live_joined', 'prayer_submitted', 'formation_viewed', 'formation_started',
  'sign_up_started', 'sign_up_completed', 'newsletter_subscribe', 'join_funnel_step',
])

function clamp(v: unknown, max = 512): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}

export async function POST(req: NextRequest) {
  // Réponse standard : 204 (aucune donnée à renvoyer à un beacon).
  const ok = () => new NextResponse(null, { status: 204 })

  let body: Record<string, unknown>
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>
  } catch {
    return ok() // corps illisible → on ne fait rien, mais on ne casse pas le client
  }

  // Le type peut venir de `type` (tracker) ou `event` (wrapper track()).
  const rawType = clamp(body.type) || clamp(body.event) || 'page_view'
  const eventType = ALLOWED_TYPES.has(rawType) ? rawType : 'custom'

  if (IS_DEMO_MODE) return ok()

  // Pays : header CDN si présent (sinon métadonnée client, sinon inconnu).
  const country =
    clamp(body.country) ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    null

  // metadata = props libres + cta/label/country normalisés.
  const metadata: Record<string, unknown> = {
    ...(body.metadata && typeof body.metadata === 'object' ? (body.metadata as object) : {}),
  }
  const cta = clamp(body.cta)
  const label = clamp(body.label)
  if (cta) metadata.cta = cta
  if (label) metadata.label = label
  if (country) metadata.country = country

  try {
    await supabaseAdmin.schema('chapelle').from('analytics_events').insert({
      event_type: eventType,
      path: clamp(body.path),
      session_id: clamp(body.session) || clamp(body.session_id),
      referrer: clamp(body.referrer),
      utm: body.utm && typeof body.utm === 'object' ? body.utm : null,
      metadata,
    })
  } catch {
    // Télémétrie : ne jamais propager une erreur au client.
  }

  return ok()
}
