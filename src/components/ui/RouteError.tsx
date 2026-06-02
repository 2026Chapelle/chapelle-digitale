'use client'
import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { RefreshCw, Home, AlertTriangle, Mail, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  /** What part of the app crashed — shows in the header. */
  scope?: string
  /** Where "back to safety" link should send the user. */
  homeHref?: string
  /** Label for the home link. */
  homeLabel?: string
  /** Optional override icon. */
  icon?: LucideIcon
}

/**
 * Reusable cinematic error boundary for app-level route group `error.tsx` files.
 * Cinematic dark royal layout with red accent, action row (retry + home + support),
 * and digest code for support correspondence.
 */
export function RouteError({
  error,
  reset,
  scope = 'cette page',
  homeHref = '/',
  homeLabel = 'Accueil',
  icon: Icon = AlertTriangle,
}: RouteErrorProps) {
  const reduce = useReducedMotion()

  useEffect(() => {
    // Production telemetry hook — replace with real reporter (Sentry, Logtail…) when wired.
    console.error(`[RouteError] ${scope}:`, error)
  }, [error, scope])

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      role="alert"
      aria-live="assertive"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full opacity-[0.1] blur-[140px]"
          style={{ background: 'radial-gradient(ellipse, #EF4444 0%, #4B0082 60%, transparent 100%)' }}
        />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center max-w-md"
      >
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 8px 24px rgba(239,68,68,0.15)',
          }}
          aria-hidden
        >
          <Icon className="w-6 h-6" style={{ color: '#FCA5A5' }} />
        </div>

        <h2 className="font-cinzel text-xl md:text-2xl font-bold text-white mb-3 text-balance">
          Une erreur s&apos;est produite
        </h2>
        <p className="font-inter text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Nous n&apos;avons pas pu afficher {scope}. Nos équipes ont été notifiées.
          Essayez de recharger ou de revenir plus tard.
        </p>

        {error.digest && (
          <div
            className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-mono mb-7"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Code: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #C49A20)',
              color: '#1A0F00',
              boxShadow: '0 6px 20px rgba(212,175,55,0.3)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <Link
            href={homeHref}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-inter font-medium text-sm transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            <Home className="w-4 h-4" />
            {homeLabel}
          </Link>
          <a
            href="mailto:support@chapelleduroyaume.org"
            className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-inter font-medium text-sm transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
          >
            <Mail className="w-4 h-4" />
            Support
          </a>
        </div>
      </motion.div>
    </div>
  )
}
