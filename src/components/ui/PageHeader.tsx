'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Eyebrow above the title — e.g. "Espace Membre", "Administration". */
  eyebrow?: string
  /** Main title. Pass a string or rich JSX (e.g. with a `<span className="text-cinematic-gold">…</span>` accent). */
  title: ReactNode
  /** Optional one-line description shown beneath the title. */
  description?: ReactNode
  /** Right-side actions (buttons, selects, badges). Wraps gracefully on mobile. */
  actions?: ReactNode
  /** Center the header (e.g. for pricing/CTA pages). */
  center?: boolean
  className?: string
}

/**
 * Unified page header for member + admin dashboard pages.
 * Cinematic typography (Cinzel, fluid clamp), consistent eyebrow + description,
 * mobile-first responsive layout. Honors prefers-reduced-motion.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  center = false,
  className,
}: PageHeaderProps) {
  const reduce = useReducedMotion()
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col gap-4 mb-8',
        actions && !center && 'sm:flex-row sm:items-end sm:justify-between',
        center && 'items-center text-center',
        className,
      )}
    >
      <div className={cn('min-w-0', center && 'mx-auto max-w-2xl')}>
        {eyebrow && (
          <div className={cn('section-label mb-2', center && 'justify-center')}>
            {eyebrow}
          </div>
        )}
        <h1
          className="font-cinzel font-black text-pearl text-balance"
          style={{
            fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {description && (
          <p className="font-inter text-sm md:text-[15px] mt-2 leading-relaxed text-pearl/55 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0',
            center && 'justify-center',
          )}
        >
          {actions}
        </div>
      )}
    </motion.header>
  )
}
