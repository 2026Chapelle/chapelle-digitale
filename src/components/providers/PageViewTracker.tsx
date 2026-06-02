'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Émet un `page_view` vers /api/analytics à chaque changement de route.
 *
 * - Identifiant de session stable (sessionStorage) pour compter des VISITEURS
 *   uniques côté dashboard sans cookie ni PII.
 * - N'émet jamais sur les routes /admin (le back-office ne doit pas se compter
 *   lui-même dans les stats visiteurs).
 * - Best-effort : sendBeacon si dispo, sinon fetch keepalive. Jamais bloquant.
 */
const SESSION_KEY = 'cier_sid'

function sessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id =
        (crypto?.randomUUID?.() as string | undefined) ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

export function PageViewTracker() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return

    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    const utm: Record<string, string> = {}
    for (const k of utmKeys) {
      const v = search?.get(k)
      if (v) utm[k.replace('utm_', '')] = v
    }

    const body = JSON.stringify({
      type: 'page_view',
      path: pathname,
      session: sessionId(),
      referrer: document.referrer || undefined,
      utm: Object.keys(utm).length ? utm : undefined,
    })

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/analytics', { method: 'POST', body, keepalive: true })
      }
    } catch {
      /* la télémétrie ne doit jamais casser la navigation */
    }
  }, [pathname, search])

  return null
}
