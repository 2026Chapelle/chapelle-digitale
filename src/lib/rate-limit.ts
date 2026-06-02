/**
 * Rate-limiting léger en mémoire (par processus).
 *
 * Suffisant pour le serveur standalone mono-processus (Passenger/PlanetHoster)
 * afin de freiner le brute-force sur les endpoints sensibles (auth admin,
 * webhooks). Pour un déploiement multi-instances, brancher un store partagé.
 */

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * Consomme une unité pour `key`. Renvoie ok=false si la limite est atteinte
 * sur la fenêtre glissante.
 */
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  // Purge opportuniste (évite la croissance mémoire).
  if (store.size > 5000) {
    store.forEach((b, k) => { if (b.resetAt < now) store.delete(k) })
  }

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 }
  }

  existing.count += 1
  if (existing.count > opts.limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) }
  }
  return { ok: true, remaining: opts.limit - existing.count, retryAfterSec: 0 }
}

/** Extrait une clé d'IP raisonnable d'une requête (derrière proxy Passenger). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
