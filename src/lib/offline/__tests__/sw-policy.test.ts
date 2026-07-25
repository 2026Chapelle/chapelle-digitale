import { describe, it, expect } from 'vitest'
import {
  SHELL_CACHE,
  CACHE_PREFIX,
  isApiRequest,
  isNavigationRequest,
  isStaticAsset,
  isRscOrDataRequest,
  isMediaContentType,
  isUncacheableByHeader,
  shouldCacheRequest,
  shouldCacheResponse,
  staleCitadelleCaches,
} from '@/lib/offline/sw-policy'

describe('isApiRequest', () => {
  it('exclut toutes les routes /api/', () => {
    expect(isApiRequest('/api/member/offline/authorize')).toBe(true)
    expect(isApiRequest('/api/member/offline/download')).toBe(true)
    expect(isApiRequest('/api')).toBe(true)
    expect(isApiRequest('/apixyz')).toBe(false)
    expect(isApiRequest('/member/dashboard/hors-ligne')).toBe(false)
  })
})

describe('isNavigationRequest', () => {
  it('détecte les documents', () => {
    expect(isNavigationRequest({ mode: 'navigate' })).toBe(true)
    expect(isNavigationRequest({ destination: 'document' })).toBe(true)
    expect(isNavigationRequest({ mode: 'cors', destination: 'script' })).toBe(false)
  })
})

describe('isStaticAsset', () => {
  it('reconnaît le statique immuable Next', () => {
    expect(isStaticAsset('/_next/static/chunks/main-abc.js')).toBe(true)
    expect(isStaticAsset('/_next/static/css/app.css')).toBe(true)
    expect(isStaticAsset('/icon-192.png')).toBe(true)
    expect(isStaticAsset('/fonts/inter.woff2')).toBe(true)
  })
  it('rejette les documents et API', () => {
    expect(isStaticAsset('/member/dashboard/hors-ligne')).toBe(false)
    expect(isStaticAsset('/api/member/offline/download')).toBe(false)
  })
})

describe('isRscOrDataRequest', () => {
  it('détecte RSC et _next/data', () => {
    expect(isRscOrDataRequest('/_next/data/build/x.json', '')).toBe(true)
    expect(isRscOrDataRequest('/member/dashboard', '_rsc=abc')).toBe(true)
    expect(isRscOrDataRequest('/member/dashboard', 'foo=1&_rsc=abc')).toBe(true)
    expect(isRscOrDataRequest('/member/dashboard', 'foo=1')).toBe(false)
  })
})

describe('isMediaContentType', () => {
  it('exclut PDF, audio, vidéo, binaire', () => {
    expect(isMediaContentType('application/pdf')).toBe(true)
    expect(isMediaContentType('audio/mpeg')).toBe(true)
    expect(isMediaContentType('video/mp4')).toBe(true)
    expect(isMediaContentType('application/octet-stream')).toBe(true)
    expect(isMediaContentType('audio/mp4; codecs=mp4a')).toBe(true)
  })
  it('autorise le HTML/CSS/JS', () => {
    expect(isMediaContentType('text/html')).toBe(false)
    expect(isMediaContentType('text/css')).toBe(false)
    expect(isMediaContentType('application/javascript')).toBe(false)
    expect(isMediaContentType(null)).toBe(false)
  })
})

describe('isUncacheableByHeader', () => {
  it('détecte no-store et private', () => {
    expect(isUncacheableByHeader('no-store, private')).toBe(true)
    expect(isUncacheableByHeader('private')).toBe(true)
    expect(isUncacheableByHeader('no-store')).toBe(true)
    expect(isUncacheableByHeader('public, max-age=31536000, immutable')).toBe(false)
    expect(isUncacheableByHeader(null)).toBe(false)
  })
})

describe('shouldCacheRequest', () => {
  const gets = (pathname: string, extra: Partial<Parameters<typeof shouldCacheRequest>[0]> = {}) =>
    shouldCacheRequest({ method: 'GET', sameOrigin: true, pathname, ...extra })

  it('cache uniquement le statique same-origin GET', () => {
    expect(gets('/_next/static/chunks/main.js')).toBe(true)
    expect(gets('/icon-512.png')).toBe(true)
  })
  it('refuse API, RSC, navigation, cross-origin, non-GET', () => {
    expect(gets('/api/member/offline/download')).toBe(false)
    expect(gets('/member/dashboard', { search: '_rsc=1' })).toBe(false)
    expect(gets('/member/dashboard/hors-ligne')).toBe(false)
    expect(gets('/_next/static/chunks/main.js', { sameOrigin: false })).toBe(false)
    expect(shouldCacheRequest({ method: 'POST', sameOrigin: true, pathname: '/_next/static/x.js' })).toBe(false)
  })
})

describe('shouldCacheResponse', () => {
  const ok = (extra: Partial<Parameters<typeof shouldCacheResponse>[0]> = {}) =>
    shouldCacheResponse({ method: 'GET', ok: true, status: 200, ...extra })

  it('accepte une réponse statique publique', () => {
    expect(ok({ cacheControl: 'public, max-age=31536000, immutable', contentType: 'application/javascript' })).toBe(true)
  })
  it('refuse no-store / private', () => {
    expect(ok({ cacheControl: 'no-store, private' })).toBe(false)
    expect(ok({ cacheControl: 'private' })).toBe(false)
  })
  it('refuse tout média', () => {
    expect(ok({ contentType: 'application/pdf' })).toBe(false)
    expect(ok({ contentType: 'audio/mpeg' })).toBe(false)
    expect(ok({ contentType: 'video/mp4' })).toBe(false)
    expect(ok({ contentType: 'application/octet-stream' })).toBe(false)
  })
  it('refuse non-GET, non-ok, opaque', () => {
    expect(shouldCacheResponse({ method: 'POST', ok: true, status: 200 })).toBe(false)
    expect(shouldCacheResponse({ method: 'GET', ok: false, status: 404 })).toBe(false)
    expect(shouldCacheResponse({ method: 'GET', ok: true, status: 0 })).toBe(false)
  })
})

describe('staleCitadelleCaches', () => {
  it('supprime les anciens caches Citadelle mais préserve le courant et les autres', () => {
    const names = ['citadelle-shell-v1', 'citadelle-shell-v0', 'other-app-cache', 'workbox-precache']
    const stale = staleCitadelleCaches(names, SHELL_CACHE)
    expect(stale).toContain('citadelle-shell-v0')
    expect(stale).not.toContain('citadelle-shell-v1')
    expect(stale).not.toContain('other-app-cache')
    expect(stale).not.toContain('workbox-precache')
  })
  it('le préfixe est bien celui attendu', () => {
    expect(SHELL_CACHE.startsWith(CACHE_PREFIX)).toBe(true)
  })
})
