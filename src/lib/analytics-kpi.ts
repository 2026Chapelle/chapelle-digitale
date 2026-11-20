import { SERVER_EVENT_ORIGIN, SERVER_SESSION_PREFIX, isReservedSessionKey, isServerSignupEvent } from '@/lib/analytics-server-events'

/**
 * Règles de comptage des indicateurs analytics internes (P0 L1).
 *
 * Inscription réussie ≠ clic CTA :
 *  - source canonique : public.profiles.created_at sur la période (même source
 *    que Citadelle Intelligence, `conversions/count-specs.ts`) ;
 *  - repli si le comptage profils est indisponible : événements serveur
 *    `signup_complete` (non falsifiables via /api/analytics/track) ;
 *  - un clic sur un lien /rejoindre, /register… reste une INTENTION, exposée
 *    séparément (`intentions_inscription`).
 */

type Row = Record<string, any>

/** Catégories de repli pour « pages convertissantes » : jamais 'inscription' (clic ≠ inscription). */
export const CONVERSION_FALLBACK_CATEGORIES = ['don', 'formation'] as const

export function buildAnalyticsFunnel(input: { sessions: Row[]; events: Row[]; profileSignups: number | null }) {
  const visitorKeys = new Set(
    input.sessions.map((s) => s.session_key).filter((k) => k && !isReservedSessionKey(k)),
  )
  const sessionsWhere = (pred: (e: Row) => boolean) =>
    new Set(input.events.filter((e) => pred(e) && !isReservedSessionKey(e.session_key)).map((e) => e.session_key))

  const serverSignups = new Set(input.events.filter(isServerSignupEvent).map((e) => e.session_key)).size
  const inscriptions = typeof input.profileSignups === 'number' ? input.profileSignups : serverSignups
  const intentions = sessionsWhere((e) => e.type === 'click' && e.category === 'inscription').size

  return {
    funnel: [
      { etape: 'Visite', n: visitorKeys.size },
      { etape: 'Inscription', n: inscriptions },
      { etape: 'Don', n: sessionsWhere((e) => e.category === 'don').size },
      { etape: 'Formation', n: sessionsWhere((e) => e.category === 'formation').size },
    ],
    intentions_inscription: intentions,
    inscriptions_source: typeof input.profileSignups === 'number' ? 'profiles.created_at' : 'analytics_events:signup_complete',
  }
}

/**
 * Conversion fiable = événement métier écrit par le serveur : session réservée
 * `srv:` ET meta.origin = 'server' (public.analytics_events.meta jsonb).
 * Une conversion envoyée par le navigateur via /api/analytics/track n'en est jamais une.
 */
export function isServerConversion(e: Row): boolean {
  const meta = (e.meta && typeof e.meta === 'object' ? e.meta : {}) as Row
  return e.type === 'conversion'
    && typeof e.session_key === 'string'
    && e.session_key.startsWith(SERVER_SESSION_PREFIX)
    && meta.origin === SERVER_EVENT_ORIGIN
}

type MinimalClient = { from: (table: string) => any }

/**
 * « Pages convertissantes » (cockpit Gouvernement) : uniquement les conversions
 * serveur, filtrées en base (session_key like 'srv:%', meta->>origin = 'server')
 * puis revérifiées ici. Repli si aucune : clics (type 'click') don/formation uniquement.
 */
export async function topConvertingPages(client: MinimalClient, since: string, top = 6) {
  const mp = new Map<string, number>()
  const { data } = await client.from('analytics_events')
    .select('path, type, session_key, meta')
    .eq('type', 'conversion')
    .like('session_key', `${SERVER_SESSION_PREFIX}%`)
    .eq('meta->>origin', SERVER_EVENT_ORIGIN)
    .gte('created_at', since)
    .limit(5000)
  for (const e of (data || []) as Row[]) if (e.path && isServerConversion(e)) mp.set(e.path, (mp.get(e.path) || 0) + 1)
  if (mp.size === 0) {
    // Repli explicitement libellé « clics » : jamais une conversion envoyée par le navigateur.
    const { data: d2 } = await client.from('analytics_events').select('path')
      .eq('type', 'click').in('category', [...CONVERSION_FALLBACK_CATEGORIES]).gte('created_at', since).limit(8000)
    for (const e of (d2 || []) as Row[]) if (e.path) mp.set(e.path, (mp.get(e.path) || 0) + 1)
  }
  return Array.from(mp.entries()).sort((a, b) => b[1] - a[1]).slice(0, top).map(([label, count]) => ({ label, count }))
}
