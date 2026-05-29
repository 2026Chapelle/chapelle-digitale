'use client'
import { IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Developer-facing reminder shown when Supabase env vars are missing.
 * Hidden in production to avoid leaking dev-only copy to end users.
 * To override (e.g. show on a staging deploy without backend), set
 * NEXT_PUBLIC_SHOW_DEMO_BANNER=1.
 */
export function DemoBanner() {
  if (!IS_DEMO_MODE) return null
  const force = process.env.NEXT_PUBLIC_SHOW_DEMO_BANNER === '1'
  if (process.env.NODE_ENV === 'production' && !force) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-inter font-medium shadow-premium"
      style={{
        background: 'rgba(10, 0, 21, 0.95)',
        border: '1px solid rgba(212,175,55,0.3)',
        backdropFilter: 'blur(20px)',
        color: '#F5E6A7',
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-gold text-base" aria-hidden>✦</span>
      Mode Démo — Configurez <code className="bg-white/10 px-1.5 py-0.5 rounded text-[11px]">.env.local</code> pour activer Supabase
    </div>
  )
}
