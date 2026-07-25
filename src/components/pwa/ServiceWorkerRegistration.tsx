'use client'
/**
 * Enregistrement du mini service worker app-shell (Lot Offline 1.1).
 *
 * - Côté client uniquement, après chargement (n'entrave pas le rendu).
 * - Silencieux mais honnête (échecs journalisés en warn).
 * - Pas de rechargement automatique sur `controllerchange` (évite les boucles).
 * - Préchauffe la route /offline pour que ses chunks statiques soient mis en
 *   cache tant qu'on est en ligne (rechargement à froid hors ligne fiable).
 *
 * Le SW n'est PAS enregistré en développement (HMR/Next dev instables avec un SW).
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ServiceWorkerRegistration() {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    let cancelled = false
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => {
          if (cancelled) return
          // Préchauffe la page de secours pour cacher ses assets pendant qu'on
          // est en ligne (best-effort, non bloquant).
          try {
            router.prefetch('/offline')
          } catch {
            /* ignore */
          }
        })
        .catch((err) => {
          console.warn('[offline] service worker registration failed', err)
        })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })

    return () => {
      cancelled = true
      window.removeEventListener('load', register)
    }
  }, [router])

  return null
}
