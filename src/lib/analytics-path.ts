/**
 * Périmètre de mesure grand public de Citadelle.
 * Les pages privées du back-office et d'aperçu ne doivent jamais créer
 * d'événement de visite, clic ou heartbeat dans public.analytics_*.
 */
export function isTrackedPath(pathname: string | null | undefined): boolean {
  return typeof pathname === 'string'
    && pathname.startsWith('/')
    && !/^\/(?:admin|preview)(?:\/|$)/.test(pathname)
}
