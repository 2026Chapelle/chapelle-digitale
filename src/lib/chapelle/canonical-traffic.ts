import { isReservedSessionKey } from '@/lib/analytics-server-events'

/**
 * Trafic du dashboard général depuis la source CANONIQUE public.analytics_*
 * (pipeline /api/analytics/track), en remplacement des agrégats « visiteurs »
 * de chapelle.admin_dashboard, structurellement à 0 (session_id jamais écrit).
 *
 * Préparation P0 L1 : activé uniquement par INTEL_CANONICAL_DASHBOARD=1
 * (défaut coupé). Aucune fonction SQL n'est modifiée ; la sémantique des
 * périodes reproduit celle de chapelle.admin_dashboard (UTC).
 */

export type TrafficRange = 'today' | '7d' | '30d'
type Row = Record<string, any>

const DAY = 86400_000
const HOUR = 3600_000

export function canonicalDashboardEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.INTEL_CANONICAL_DASHBOARD === '1'
}

const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

export function rangeStart(range: TrafficRange, now: Date): Date {
  if (range === 'today') return utcMidnight(now)
  if (range === '30d') return new Date(now.getTime() - 29 * DAY)
  return new Date(now.getTime() - 6 * DAY)
}

/** Borne basse de lecture couvrant la période, la semaine glissante et aujourd'hui. */
export function readSince(range: TrafficRange, now: Date): Date {
  return new Date(Math.min(rangeStart(range, now).getTime(), now.getTime() - 7 * DAY, utcMidnight(now).getTime()))
}

const pad = (n: number) => String(n).padStart(2, '0')

export function computeCanonicalTraffic(input: { range: TrafficRange; now: Date; sessions: Row[]; events: Row[]; clicksAvailable?: boolean }) {
  const { range, now } = input
  const pageviews = input.events
    .filter((e) => e.type === 'pageview' && e.session_key && !isReservedSessionKey(e.session_key))
    .map((e) => ({ key: String(e.session_key), path: e.path as string | null, t: Date.parse(e.created_at) }))
    // Pas de borne haute : un léger décalage d'horloge base/serveur ne doit pas exclure d'événements récents.
    .filter((e) => Number.isFinite(e.t))

  const visitorsSince = (from: number, to = Infinity) =>
    new Set(pageviews.filter((e) => e.t >= from && e.t < to).map((e) => e.key))

  const from = rangeStart(range, now).getTime()
  const periodVisitors = visitorsSince(from)

  const views = new Map<string, number>()
  for (const e of pageviews) if (e.t >= from && e.path) views.set(e.path, (views.get(e.path) || 0) + 1)
  const topPages = Array.from(views.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, n]) => ({ path, views: n }))

  // Le dashboard général ne doit pas dépendre du vieux pipeline chapelle.analytics_events
  // pour ses clics. Conserver uniquement les vrais clics d'action (label + catégorie),
  // jamais les pages vues, événements serveur ou conversions.
  const clicksByAction = new Map<string, { label: string; clicks: number }>()
  for (const e of input.events) {
    if (e.type !== 'click' || !e.session_key || isReservedSessionKey(e.session_key)) continue
    const t = Date.parse(String(e.created_at ?? ''))
    if (!Number.isFinite(t) || t < from) continue
    const category = typeof e.category === 'string' ? e.category.trim().toLowerCase() : ''
    const label = typeof e.label === 'string' ? e.label.trim().slice(0, 120) : ''
    if (!category || !label) continue
    const key = `${category}:\0${label.toLowerCase()}`
    const current = clicksByAction.get(key)
    if (current) current.clicks += 1
    else clicksByAction.set(key, { label, clicks: 1 })
  }
  const clicsBoutons = Array.from(clicksByAction.values())
    .sort((a, b) => b.clicks - a.clicks || a.label.localeCompare(b.label))
    .slice(0, 8)

  const paysBySession = new Map<string, string>()
  for (const s of input.sessions) if (s.session_key) paysBySession.set(String(s.session_key), (s.pays && String(s.pays).trim()) || 'Inconnu')
  const paysCount = new Map<string, number>()
  for (const k of Array.from(periodVisitors)) { const p = paysBySession.get(k) || 'Inconnu'; paysCount.set(p, (paysCount.get(p) || 0) + 1) }
  const pays = Array.from(paysCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => ({ pays: p, visiteurs: n }))

  const step = range === 'today' ? HOUR : DAY
  const tendance: { label: string; visiteurs: number }[] = []
  for (let b = (range === 'today' ? from : utcMidnight(new Date(from)).getTime()); b <= now.getTime(); b += step) {
    const d = new Date(b)
    const label = range === 'today' ? `${pad(d.getUTCHours())}h` : `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`
    tendance.push({ label, visiteurs: visitorsSince(b, b + step).size })
  }

  return {
    visiteursToday: visitorsSince(utcMidnight(now).getTime()).size,
    visiteursSemaine: visitorsSince(now.getTime() - 7 * DAY).size,
    visiteursPeriode: periodVisitors.size,
    clicsBoutons,
    clicksAvailable: input.clicksAvailable ?? true,
    topPages,
    pays,
    tendance,
  }
}

type MinimalClient = { from: (table: string) => any }

/** Lecture bornée (service role) puis calcul pur. Lève en cas d'erreur : l'appelant garde ses valeurs. */
export async function fetchCanonicalTraffic(client: MinimalClient, range: TrafficRange, now = new Date()) {
  const since = readSince(range, now).toISOString()
  // Une requête "clics" peut retourner { error } OU rejeter (timeout/réseau).
  // Dans les deux cas, préserver la télémétrie principale sans masquer l'échec.
  const readClicks = async () => {
    try {
      return await client.from('analytics_events').select('session_key, type, category, label, created_at')
        .eq('type', 'click').gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
    } catch {
      return { data: null, error: { code: 'CLICK_READ_FAILED' } }
    }
  }
  const [ev, se, clicks] = await Promise.all([
    client.from('analytics_events').select('session_key, path, type, created_at')
      .eq('type', 'pageview').gte('created_at', since).order('created_at', { ascending: false }).limit(20000),
    client.from('analytics_sessions').select('session_key, pays, last_seen')
      .gte('last_seen', since).order('last_seen', { ascending: false }).limit(5000),
    readClicks(),
  ])
  if (ev.error || se.error) throw new Error('canonical traffic read failed')
  // Les clics sont un enrichissement : une erreur de lecture n'annule jamais les
  // chiffres visiteurs qui viennent d'être calculés avec succès.
  return computeCanonicalTraffic({
    range, now, sessions: se.data || [],
    events: [...(ev.data || []), ...(clicks.error ? [] : (clicks.data || []))],
    clicksAvailable: !clicks.error,
  })
}
