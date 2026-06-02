'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Tracker analytics interne Citadelle (présence temps réel + parcours).
 *
 * - Clé de session par visite (sessionStorage) → 1 ligne analytics_sessions.
 * - pageview à chaque changement de route ; heartbeat toutes les 30s (uniquement
 *   onglet visible) pour la présence « qui est en ligne » + durée active.
 * - Capture déléguée des clics importants (don, live, formation, PDF, événement,
 *   inscription, ressource) sans toucher chaque composant.
 * - Associe l'utilisateur connecté (Supabase) pour relier l'activité au membre.
 * - N'émet jamais sur /admin ni /preview (le back-office ne se compte pas).
 * - Best-effort : sendBeacon/keepalive, jamais bloquant.
 */
const SID_KEY = 'cier_track_sid'
const HEARTBEAT_MS = 30_000

function sessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SID_KEY)
    if (!id) {
      id = (crypto?.randomUUID?.() as string | undefined) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(SID_KEY, id)
    }
    return id
  } catch { return 'anon' }
}

let CURRENT_USER_ID: string | null = null

/** Envoi bas niveau (sendBeacon prioritaire). */
function send(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({ session: sessionId(), userId: CURRENT_USER_ID || undefined, ...payload })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/analytics/track', { method: 'POST', body, keepalive: true })
    }
  } catch { /* non bloquant */ }
}

/** API publique : journaliser un événement métier (don_completed, video, etc.). */
export function trackEvent(type: 'click' | 'download' | 'video' | 'conversion', category: string, opts?: { label?: string; value?: number; path?: string; meta?: Record<string, unknown> }) {
  send({ type, category, label: opts?.label, value: opts?.value, path: opts?.path || (typeof location !== 'undefined' ? location.pathname : undefined), meta: opts?.meta })
}

/** Classe un clic sur un lien/bouton en catégorie d'action. */
function classify(el: HTMLElement): { type: 'click' | 'download'; category: string; label: string } | null {
  const a = el.closest('a,button,[data-track]') as HTMLElement | null
  if (!a) return null
  const explicit = a.getAttribute('data-track')
  const label = (a.getAttribute('data-track-label') || a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 120)
  const href = (a.getAttribute('href') || '').toLowerCase()
  if (explicit) {
    return { type: explicit === 'pdf' || /\.pdf/.test(href) ? 'download' : 'click', category: explicit, label }
  }
  if (!href) return null
  if (/\.pdf($|\?)/.test(href)) return { type: 'download', category: 'pdf', label }
  if (/\/dons?(\b|\/|$)|offrande|partenariat|partenaire/.test(href)) return { type: 'click', category: 'don', label }
  if (/\/live(\b|\/|s|$)/.test(href)) return { type: 'click', category: 'live', label }
  if (/\/formations?(\b|\/|$)|masterclass/.test(href)) return { type: 'click', category: 'formation', label }
  if (/\/evenements?(\b|\/|$)|billet/.test(href)) return { type: 'click', category: 'evenement', label }
  if (/\/rejoindre|\/register|inscription/.test(href)) return { type: 'click', category: 'inscription', label }
  if (/\/ressources?(\b|\/|$)|ebook|\.epub/.test(href)) return { type: 'click', category: 'ressource', label }
  if (/\/podcast|\.mp3/.test(href)) return { type: 'click', category: 'podcast', label }
  return null
}

export function AnalyticsTracker() {
  const pathname = usePathname()
  const search = useSearchParams()
  const lastBeat = useRef<number>(0)

  // Identité membre (best-effort, non bloquant).
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let active = true
    supabase.auth.getUser().then(({ data }) => { if (active) CURRENT_USER_ID = data.user?.id || null }).catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessionObj) => { CURRENT_USER_ID = sessionObj?.user?.id || null })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  // Pageview à chaque route (hors back-office).
  useEffect(() => {
    if (IS_DEMO_MODE || !pathname) return
    if (pathname.startsWith('/admin') || pathname.startsWith('/preview')) return
    const utm: Record<string, string> = {}
    ;['source', 'medium', 'campaign', 'content', 'term'].forEach((k) => { const v = search?.get(`utm_${k}`); if (v) utm[k] = v })
    send({ type: 'pageview', path: pathname, referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined, utm: Object.keys(utm).length ? utm : undefined })
  }, [pathname, search])

  // Heartbeat présence + durée active (onglet visible uniquement).
  useEffect(() => {
    if (IS_DEMO_MODE) return
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/preview')) return
    lastBeat.current = Date.now()
    const beat = () => {
      if (document.visibilityState !== 'visible') { lastBeat.current = Date.now(); return }
      const delta = Math.round((Date.now() - lastBeat.current) / 1000)
      lastBeat.current = Date.now()
      send({ type: 'heartbeat', duration: Math.min(delta, 120), path: pathname })
    }
    const iv = setInterval(beat, HEARTBEAT_MS)
    const onHide = () => { if (document.visibilityState === 'hidden') beat() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', beat)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', beat) }
  }, [pathname])

  // Capture déléguée des clics importants.
  useEffect(() => {
    if (IS_DEMO_MODE) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const hit = classify(target)
      if (hit) send({ type: hit.type, category: hit.category, label: hit.label, path: pathname })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [pathname])

  return null
}
