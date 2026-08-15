'use client'
/**
 * Bouton flottant « Retour en haut » — pages publiques.
 * S’élève au-dessus du lecteur audio si actif (body.has-audio-player).
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronUp } from 'lucide-react'

const SHOW_AFTER_PX = 600

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    let ticking = false
    const update = () => {
      setVisible(window.scrollY >= SHOW_AFTER_PX)
      ticking = false
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function goTop() {
    const prefersReduce =
      reduce ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    window.scrollTo({ top: 0, behavior: prefersReduce ? 'auto' : 'smooth' })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="back-to-top"
          className="citadelle-back-top fixed z-[48] pointer-events-none"
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.94 }}
          transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            onClick={goTop}
            className="citadelle-back-top-btn pointer-events-auto inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            aria-label="Retour en haut"
            title="Retour en haut"
          >
            <ChevronUp className="w-5 h-5" strokeWidth={2} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
