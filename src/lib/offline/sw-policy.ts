/**
 * Citadelle — Lot Offline 1.1 : décisions PURES du service worker.
 *
 * `public/sw.js` (JS classique, non importable) MIROITE exactement cette logique.
 * On l'isole ici pour la TESTER sous Vitest (env `node`), conformément à la
 * consigne « extraire les fonctions de décision dans un module pur testable ».
 * Toute évolution de la politique de cache doit modifier LES DEUX en tandem.
 *
 * Principe de sûreté : le SW ne met JAMAIS en cache de HTML de navigation (il
 * pourrait contenir des données personnelles), ni les routes `/api/`, ni les
 * médias, ni les réponses `no-store` / `private`. Seuls sont mis en cache :
 *   1) le shell générique pré-listé (page /offline, manifest, icônes, logo) ;
 *   2) les assets statiques immuables (`/_next/static/…`).
 * Les médias hors-ligne restent EXCLUSIVEMENT servis depuis IndexedDB.
 */

export const CACHE_PREFIX = 'citadelle-shell'
export const CACHE_VERSION = 'v1'
export const SHELL_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`

/** Ressources GÉNÉRIQUES (sans donnée personnelle) précachées à l'installation. */
export const SHELL_URLS: readonly string[] = [
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/images/logo-mark.png',
]

/** Route API privée → jamais de cache. */
export function isApiRequest(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

/** Requête de navigation (chargement d'un document HTML). */
export function isNavigationRequest(req: { mode?: string; destination?: string }): boolean {
  return req.mode === 'navigate' || req.destination === 'document'
}

/** Asset statique immuable, sûr à cacher (versionné par le hash de build). */
export function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/_next/static/')) return true
  return /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico)$/i.test(pathname)
}

/** Payload RSC / données Next : peut contenir du personnel → jamais de cache. */
export function isRscOrDataRequest(pathname: string, search: string): boolean {
  if (pathname.startsWith('/_next/data/')) return true
  return /(?:\?|&)_rsc=/.test(`?${search.replace(/^\?/, '')}`)
}

/** Type MIME de média (protégé ou non) → jamais mis dans Cache Storage. */
export function isMediaContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false
  const ct = contentType.split(';')[0].trim().toLowerCase()
  return (
    ct === 'application/pdf' ||
    ct === 'application/octet-stream' ||
    ct.startsWith('audio/') ||
    ct.startsWith('video/')
  )
}

/** `Cache-Control` interdit la mise en cache partagée/persistante ? */
export function isUncacheableByHeader(cacheControl: string | null | undefined): boolean {
  if (!cacheControl) return false
  const cc = cacheControl.toLowerCase()
  return cc.includes('no-store') || cc.includes('private')
}

export interface RequestFacts {
  method: string
  sameOrigin: boolean
  pathname: string
  search?: string
}

/**
 * Faut-il tenter de SERVIR/METTRE EN CACHE cette requête via le cache statique ?
 * Uniquement les GET same-origin d'assets statiques immuables, hors API/RSC.
 */
export function shouldCacheRequest(f: RequestFacts): boolean {
  if (f.method !== 'GET') return false
  if (!f.sameOrigin) return false
  if (isApiRequest(f.pathname)) return false
  if (isRscOrDataRequest(f.pathname, f.search ?? '')) return false
  return isStaticAsset(f.pathname)
}

export interface ResponseFacts {
  method: string
  ok: boolean
  status: number
  cacheControl?: string | null
  contentType?: string | null
}

/**
 * Une réponse est-elle sûre à ÉCRIRE en Cache Storage ? Exclut : non-GET, non-ok,
 * `no-store`/`private`, et tout média. (Le statique immuable passe.)
 */
export function shouldCacheResponse(r: ResponseFacts): boolean {
  if (r.method !== 'GET') return false
  if (!r.ok) return false
  // Les réponses opaques (status 0) ne sont pas mises en cache ici.
  if (r.status === 0) return false
  if (isUncacheableByHeader(r.cacheControl)) return false
  if (isMediaContentType(r.contentType)) return false
  return true
}

/**
 * Anciens caches Citadelle à supprimer lors de l'activation. On NE TOUCHE JAMAIS
 * aux caches non-Citadelle ni à IndexedDB.
 */
export function staleCitadelleCaches(names: readonly string[], current: string = SHELL_CACHE): string[] {
  return names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== current)
}
