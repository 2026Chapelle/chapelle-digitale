import { timingSafeEqual } from 'node:crypto'

/**
 * Authentification des routes cron : secret EXCLUSIVEMENT via l'en-tête `x-cron-secret`
 * (jamais de paramètre d'URL : un secret en query string finit dans les journaux d'accès et les proxys).
 * Comparaison à temps constant. Utilisé par /api/cron/youtube-live-sync.
 */
export function isAuthorizedCron(req: { headers: { get(name: string): string | null } }, secret = process.env.CRON_SECRET): boolean {
  const expected = (secret ?? '').trim()
  const given = (req.headers.get('x-cron-secret') ?? '').trim()
  if (!expected || !given) return false
  const a = Buffer.from(expected), b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}
