'use client'
import { useReportWebVitals } from 'next/web-vitals'

/**
 * Captures Core Web Vitals (CLS, LCP, INP, FCP, TTFB) and forwards them
 * to whatever observability backend is wired in.
 *
 * Default behavior:
 *  - In dev: logs to console for debugging.
 *  - In prod: forwards to `window.dataLayer` (GTM-compatible) and `navigator.sendBeacon`
 *    if NEXT_PUBLIC_VITALS_ENDPOINT is set. Replace with your backend (Vercel Analytics,
 *    Datadog, Logtail, Sentry…) when wiring real telemetry.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[web-vitals]', metric.name, Math.round(metric.value), metric)
      return
    }

    // GTM dataLayer push (no-op if not present)
    type DLWindow = Window & { dataLayer?: Array<Record<string, unknown>> }
    const w = window as DLWindow
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({
        event: 'web-vitals',
        metric_name: metric.name,
        metric_value: Math.round(metric.value),
        metric_id: metric.id,
        metric_rating: metric.rating,
      })
    }

    // Optional: ship to a custom endpoint via sendBeacon (low priority, non-blocking)
    const endpoint = process.env.NEXT_PUBLIC_VITALS_ENDPOINT
    if (endpoint && navigator.sendBeacon) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        rating: metric.rating,
        path: window.location.pathname,
        ts: Date.now(),
      })
      try {
        navigator.sendBeacon(endpoint, body)
      } catch {
        // swallow — telemetry must never break the page
      }
    }
  })

  return null
}
