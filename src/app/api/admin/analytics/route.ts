import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { cached } from '@/lib/cache'

/**
 * Tableau de bord analytics interne — agrégats temps réel + historique.
 *   GET /api/admin/analytics?range=7d&pays=CD
 *
 * Sécurité :
 *  - Garde cookie admin (isAdminRequest). Lecture service role.
 *  - `pays` : restreint la vue à un pays (scope nation_pastor). Le super_admin
 *    laisse `pays` vide pour tout voir.
 *  - Ne lit QUE les tables analytics_* : aucune donnée de prière / cure d'âme,
 *    visiteurs anonymes sans PII.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RANGES: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }
const ONLINE_WINDOW_SEC = 90 // heartbeat 30s → 3 ticks de tolérance
const ANALYTICS_TTL_MS = 15_000 // cache court (< heartbeat) : agrégat mutualisé, reste « temps réel »

type Row = Record<string, any>
const topN = (rows: Row[], key: string, n = 8) => {
  const m = new Map<string, number>()
  for (const r of rows) { const k = r[key]; if (k) m.set(k, (m.get(k) || 0) + 1) }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const sp = req.nextUrl.searchParams
  const days = RANGES[sp.get('range') || '7d'] || 7
  const pays = (sp.get('pays') || '').trim().toUpperCase() || null

  try {
    const payload = await cached(`analytics:${days}:${pays || 'all'}`, ANALYTICS_TTL_MS, () => computeAnalytics(days, pays))
    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

async function computeAnalytics(days: number, pays: string | null) {
  const now = Date.now()
  const sinceRange = new Date(now - days * 86400_000).toISOString()
  const sinceToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  const sinceOnline = new Date(now - ONLINE_WINDOW_SEC * 1000).toISOString()

  const paysEq = (q: any): any => (pays ? q.eq('pays', pays) : q)

  {
    // ── En ligne maintenant (sessions actives) ──
    const onlineQ = await paysEq(
      supabaseAdmin.from('analytics_sessions').select('is_auth, pays, device, user_id').gte('last_seen', sinceOnline),
    )
    const online = onlineQ.data || []
    const onlineAuth = online.filter((s: Row) => s.is_auth).length

    // ── Pages actuellement actives (pageviews très récents) ──
    const activePagesQ = await paysEq(
      supabaseAdmin.from('analytics_events').select('path').eq('type', 'pageview').gte('created_at', sinceOnline),
    )

    // ── Sessions sur la période (échantillon borné) ──
    const sessQ = await paysEq(
      supabaseAdmin.from('analytics_sessions')
        .select('session_key, user_id, is_auth, device, browser, source, pays, page_views, events_count, duration_sec, first_seen, last_seen')
        .gte('last_seen', sinceRange).order('last_seen', { ascending: false }).limit(5000),
    )
    const sessions: Row[] = sessQ.data || []

    // ── Événements sur la période (échantillon borné) ──
    const evtQ = await paysEq(
      supabaseAdmin.from('analytics_events')
        .select('type, category, path, label, value, user_id, session_key, created_at')
        .gte('created_at', sinceRange).order('created_at', { ascending: false }).limit(20000),
    )
    const events: Row[] = evtQ.data || []

    // KPIs
    const visiteursAujourdhui = sessions.filter((s) => s.last_seen >= sinceToday).length
    const dureeMoyenne = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + (Number(s.duration_sec) || 0), 0) / sessions.length)
      : 0
    const tempsTotal = sessions.reduce((a, s) => a + (Number(s.duration_sec) || 0), 0)

    // Top pages / actions
    const pageviews = events.filter((e) => e.type === 'pageview')
    const actions = events.filter((e) => ['click', 'download', 'video', 'conversion'].includes(e.type))
    const topPages = topN(pageviews, 'path')
    const topActions = topN(actions.map((a) => ({ k: a.category || a.label || a.type })), 'k')

    // Répartitions
    const parDevice = topN(sessions, 'device', 5)
    const parNavigateur = topN(sessions, 'browser', 6)
    const parSource = topN(sessions, 'source', 8)
    const parPays = topN(sessions, 'pays', 12)
    const activePages = topN((activePagesQ.data || []) as Row[], 'path', 8)

    // Entonnoir de conversion : visite → inscription → don → formation (sessions distinctes)
    const setOf = (pred: (e: Row) => boolean) => new Set(events.filter(pred).map((e) => e.session_key))
    const sVisite = new Set(sessions.map((s) => s.session_key))
    const sInscription = setOf((e) => e.category === 'inscription' || (e.type === 'conversion' && e.category === 'inscription'))
    const sDon = setOf((e) => e.category === 'don')
    const sFormation = setOf((e) => e.category === 'formation')
    const funnel = [
      { etape: 'Visite', n: sVisite.size },
      { etape: 'Inscription', n: sInscription.size },
      { etape: 'Don', n: sDon.size },
      { etape: 'Formation', n: sFormation.size },
    ]

    // Membres les plus engagés (sessions authentifiées)
    const byUser = new Map<string, { duration: number; events: number; views: number }>()
    for (const s of sessions) {
      if (!s.user_id) continue
      const cur = byUser.get(s.user_id) || { duration: 0, events: 0, views: 0 }
      cur.duration += Number(s.duration_sec) || 0
      cur.events += Number(s.events_count) || 0
      cur.views += Number(s.page_views) || 0
      byUser.set(s.user_id, cur)
    }
    const topUserIds = Array.from(byUser.entries())
      .sort((a, b) => (b[1].duration + b[1].events * 30) - (a[1].duration + a[1].events * 30))
      .slice(0, 10)
    let topMembres: Row[] = []
    if (topUserIds.length) {
      const { data: profs } = await supabaseAdmin.from('profiles')
        .select('id, prenom, nom, email, pays').in('id', topUserIds.map(([id]) => id))
      const pm = new Map((profs || []).map((p: Row) => [p.id, p]))
      topMembres = topUserIds.map(([id, v]) => {
        const p: Row = pm.get(id) || {}
        const nom = [p.prenom, p.nom].filter(Boolean).join(' ').trim() || p.email || 'Membre'
        return { user_id: id, nom, pays: p.pays || null, duration_sec: v.duration, events: v.events, views: v.views }
      })
    }

    // Progression moyenne (événements video/formation portant une valeur %)
    const progEvents = events.filter((e) => (e.type === 'video' || e.category === 'formation') && Number.isFinite(Number(e.value)))
    const progressionMoyenne = progEvents.length
      ? Math.round(progEvents.reduce((a, e) => a + Number(e.value), 0) / progEvents.length)
      : null

    return {
      ok: true,
      range: `${days}d`, pays,
      temps_reel: {
        connectes: online.length,
        connectes_auth: onlineAuth,
        connectes_anon: online.length - onlineAuth,
        pages_actives: activePages,
      },
      kpis: {
        visiteurs_aujourdhui: visiteursAujourdhui,
        sessions_periode: sessions.length,
        duree_moyenne_sec: dureeMoyenne,
        temps_total_sec: tempsTotal,
        progression_moyenne: progressionMoyenne,
      },
      top_pages: topPages,
      top_actions: topActions,
      repartition: { device: parDevice, navigateur: parNavigateur, source: parSource, pays: parPays },
      funnel,
      top_membres: topMembres,
    }
  }
}
