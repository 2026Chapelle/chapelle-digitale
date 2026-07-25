/*
 * Citadelle — Mini service worker app-shell (Lot Offline 1.1).
 *
 * Objectif UNIQUE : permettre le rechargement à froid hors ligne (le shell se
 * charge, la page /offline s'affiche, la bibliothèque lit IndexedDB). Ce SW n'est
 * PAS un second stockage des médias : PDF/audio restent servis depuis IndexedDB.
 *
 * ⚠️ Cette logique MIROITE `src/lib/offline/sw-policy.ts` (module pur testé).
 * Toute modification doit être répercutée dans les deux fichiers.
 *
 * Règles de sûreté (ne JAMAIS mettre en cache) :
 *   - toute route /api/ (dont /api/member/offline/authorize|download) ;
 *   - toute réponse média (application/pdf, audio/*, video/*, octet-stream) ;
 *   - tout HTML de navigation (peut contenir des données personnelles) ;
 *   - les payloads RSC / _next/data ;
 *   - les réponses Cache-Control: no-store | private ;
 *   - les méthodes non-GET, le cross-origin.
 * Seuls sont mis en cache : le shell générique pré-listé + /_next/static/ immuable.
 */

var CACHE_PREFIX = 'citadelle-shell'
var CACHE_VERSION = 'v1'
var SHELL_CACHE = CACHE_PREFIX + '-' + CACHE_VERSION

var SHELL_URLS = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png', '/images/logo-mark.png']

function isApiRequest(pathname) {
  return pathname === '/api' || pathname.indexOf('/api/') === 0
}
function isStaticAsset(pathname) {
  if (pathname.indexOf('/_next/static/') === 0) return true
  return /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico)$/i.test(pathname)
}
function isRscOrData(pathname, search) {
  if (pathname.indexOf('/_next/data/') === 0) return true
  return /(?:\?|&)_rsc=/.test('?' + String(search || '').replace(/^\?/, ''))
}
function isMediaContentType(ct) {
  if (!ct) return false
  ct = ct.split(';')[0].trim().toLowerCase()
  return (
    ct === 'application/pdf' ||
    ct === 'application/octet-stream' ||
    ct.indexOf('audio/') === 0 ||
    ct.indexOf('video/') === 0
  )
}
function isUncacheableByHeader(cc) {
  if (!cc) return false
  cc = cc.toLowerCase()
  return cc.indexOf('no-store') !== -1 || cc.indexOf('private') !== -1
}
function shouldCacheRequest(method, sameOrigin, pathname, search) {
  if (method !== 'GET') return false
  if (!sameOrigin) return false
  if (isApiRequest(pathname)) return false
  if (isRscOrData(pathname, search)) return false
  return isStaticAsset(pathname)
}
function shouldCacheResponse(res) {
  if (!res || res.status === 0) return false
  if (!res.ok) return false
  if (isUncacheableByHeader(res.headers.get('Cache-Control'))) return false
  if (isMediaContentType(res.headers.get('Content-Type'))) return false
  return true
}

// --- Installation : précache du shell générique ----------------------------
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      // addAll échouerait en bloc si une URL manque : on tolère les absences.
      return Promise.all(
        SHELL_URLS.map(function (url) {
          return fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
              if (res && res.ok) return cache.put(url, res.clone())
            })
            .catch(function () {})
        }),
      )
    }),
  )
  // Pas de skipWaiting agressif : la nouvelle version s'activera au prochain
  // chargement, sans prendre le contrôle au milieu d'une opération.
})

// --- Activation : purge des anciens caches Citadelle uniquement -------------
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (n) {
            return n.indexOf(CACHE_PREFIX) === 0 && n !== SHELL_CACHE
          })
          .map(function (n) {
            return caches.delete(n)
          }),
      )
    }),
  )
  // On NE touche PAS à IndexedDB (contenus hors-ligne du Lot 1).
})

// --- Interception ----------------------------------------------------------
self.addEventListener('fetch', function (event) {
  var req = event.request
  if (req.method !== 'GET') return // POST/PUT/PATCH/DELETE : réseau seul

  var url
  try {
    url = new URL(req.url)
  } catch (e) {
    return
  }
  var sameOrigin = url.origin === self.location.origin
  if (!sameOrigin) return // cross-origin (ex. Supabase) : laissé au réseau

  var pathname = url.pathname
  var search = url.search

  // API privée : réseau strict, jamais de cache.
  if (isApiRequest(pathname)) return

  // Navigation HTML : network-first, repli /offline (générique). On NE met
  // JAMAIS en cache le HTML de navigation (données potentiellement personnelles).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match('/offline').then(function (r) {
          return (
            r ||
            new Response('<h1>Hors connexion</h1>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          )
        })
      }),
    )
    return
  }

  // Payloads RSC / _next/data : peuvent contenir du personnel → réseau seul.
  if (isRscOrData(pathname, search)) return

  // Assets statiques immuables : cache-first (+ remplissage runtime).
  if (shouldCacheRequest('GET', sameOrigin, pathname, search)) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached
        return fetch(req).then(function (res) {
          if (shouldCacheResponse(res)) {
            var copy = res.clone()
            caches.open(SHELL_CACHE).then(function (cache) {
              cache.put(req, copy)
            })
          }
          return res
        })
      }),
    )
    return
  }

  // Autres GET same-origin : réseau, repli cache si déjà présent (shell).
  event.respondWith(
    fetch(req).catch(function () {
      return caches.match(req)
    }),
  )
})
