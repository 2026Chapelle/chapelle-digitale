'use client'
import { MotionConfig } from 'framer-motion'

/**
 * Globally honors the user's OS-level "Reduce motion" preference.
 * With `reducedMotion="user"`, every `motion.*` element across the app
 * collapses entrance/exit transitions to 0 when the user has the
 * `prefers-reduced-motion: reduce` media query set — no per-component
 * `useReducedMotion()` plumbing required.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
