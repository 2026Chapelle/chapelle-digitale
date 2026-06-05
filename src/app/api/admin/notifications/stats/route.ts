import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/**
 * Activité NOTIFICATIONS pour le SUPER ADMIN (cockpit gouvernement).
 * Agrège la table `app_notifications` existante (source unique) : total, par type,
 * par audience, fenêtres 24h/7j/30j + 20 dernières. Agrégation JS bornée (aucune
 * RPC, aucune migration). Garde cookie admin.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const { data, error } = await supabaseAdmin.from('app_notifications')
      .select('type, audience, title, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })

    const rows = data || []
    const now = Date.now()
    const within = (ms: number) => rows.filter((r: any) => now - new Date(r.created_at).getTime() <= ms).length
    const tally = (key: string) => {
      const m: Record<string, number> = {}
      for (const r of rows as any[]) { const k = r[key] || 'autre'; m[k] = (m[k] || 0) + 1 }
      return Object.entries(m).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
    }

    return NextResponse.json({
      ok: true,
      total_30j: rows.length,
      last_24h: within(24 * 3600 * 1000),
      last_7j: within(7 * 24 * 3600 * 1000),
      par_type: tally('type'),
      par_audience: tally('audience'),
      recentes: (rows as any[]).slice(0, 20).map((r) => ({ type: r.type, audience: r.audience, title: r.title, date: r.created_at })),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
