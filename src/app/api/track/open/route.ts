import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Pixel de suivi d'ouverture des emails de campagne.
 *   GET /api/track/open?c=<campaign>&u=<user>  → renvoie un GIF 1×1 transparent.
 * Marque la ligne communication_log comme « opened » et incrémente opens_count
 * (une seule fois par destinataire). Public, inoffensif, non bloquant.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const gif = () => new Response(PIXEL, { status: 200, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Length': String(PIXEL.length) } })

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return gif()
  const c = req.nextUrl.searchParams.get('c')
  const u = req.nextUrl.searchParams.get('u')
  if (c && u) {
    try {
      const nowIso = new Date().toISOString()
      // Marque l'ouverture (idempotent : seulement si pas déjà ouvert).
      const { data: updated } = await supabaseAdmin.from('communication_log')
        .update({ opened_at: nowIso, status: 'opened' })
        .eq('campaign_id', c).eq('recipient_id', u).is('opened_at', null).select('id')
      if (updated && updated.length > 0) {
        const { data: camp } = await supabaseAdmin.from('communication_campaigns').select('opens_count').eq('id', c).maybeSingle()
        await supabaseAdmin.from('communication_campaigns').update({ opens_count: (camp?.opens_count ?? 0) + 1 }).eq('id', c)
      }
    } catch { /* non bloquant */ }
  }
  return gif()
}
