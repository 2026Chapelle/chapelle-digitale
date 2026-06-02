/**
 * Lightweight analytics wrapper.
 *
 * `track()` fires a named event with arbitrary properties. The event is:
 *   1. Forwarded to `window.dataLayer` (GTM / GA4-compatible) if present.
 *   2. Sent (best-effort) to NEXT_PUBLIC_ANALYTICS_ENDPOINT via `sendBeacon`.
 *   3. console.debug'd in development for visibility.
 *
 * Replace the body with a real provider call (Vercel Analytics, PostHog, Segment, etc.)
 * when the team picks one. Keeping this thin wrapper means call sites stay stable.
 *
 * Usage:
 *   import { track } from '@/lib/analytics'
 *   track('cta_click', { cta: 'rejoindre_hero', plan: 'disciple' })
 */

type EventProps = Record<string, string | number | boolean | null | undefined>

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>
}

export function track(event: string, props: EventProps = {}): void {
  if (typeof window === 'undefined') return

  const payload = {
    event,
    ts: Date.now(),
    path: window.location.pathname,
    ...props,
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, props)
  }

  const w = window as DataLayerWindow
  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push(payload)
  }

  // Ingestion interne → chapelle.analytics_events (alimente le dashboard admin).
  // Les clics CTA portent `cta` ; le serveur range le reste dans metadata.
  const internal = JSON.stringify({
    type: event,
    path: payload.path,
    cta: typeof props.cta === 'string' ? props.cta : undefined,
    metadata: props,
  })
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/analytics', new Blob([internal], { type: 'application/json' }))
    } else {
      void fetch('/api/analytics', { method: 'POST', body: internal, keepalive: true })
    }
  } catch {
    // Telemetry must never break the page.
  }

  // Endpoint externe optionnel (GA/GTM côté serveur), si configuré.
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
  if (endpoint && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      navigator.sendBeacon(endpoint, JSON.stringify(payload))
    } catch {
      // Telemetry must never break the page.
    }
  }
}

/** Common conversion-funnel events, kept here so call sites use a stable vocabulary. */
export const events = {
  ctaClick: (cta: string, props?: EventProps) => track('cta_click', { cta, ...props }),
  joinFunnelStep: (step: string, props?: EventProps) => track('join_funnel_step', { step, ...props }),
  donStarted: (props?: EventProps) => track('don_started', props),
  donCompleted: (props?: EventProps) => track('don_completed', props),
  liveJoined: (props?: EventProps) => track('live_joined', props),
  prayerSubmitted: (props?: EventProps) => track('prayer_submitted', props),
  formationViewed: (slug: string) => track('formation_viewed', { slug }),
  formationStarted: (slug: string) => track('formation_started', { slug }),
  signUpStarted: () => track('sign_up_started'),
  signUpCompleted: () => track('sign_up_completed'),
  signInStarted: (method: string) => track('sign_in_started', { method }),
  newsletterSubscribe: (source: string) => track('newsletter_subscribe', { source }),
}
