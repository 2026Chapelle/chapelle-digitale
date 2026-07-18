'use client'
/**
 * SCÈNE 3 — VISION
 * Pourquoi Citadelle ? Quatre colonnes, sans cartes, beaucoup d'espace.
 */
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Sprout, Users, HandHeart, Sun } from 'lucide-react'

const PILLARS = [
  {
    title: 'Grandir',
    phrase: 'Un chemin clair pour avancer en Christ.',
    icon: Sprout,
  },
  {
    title: 'Appartenir',
    phrase: 'Une maison où l’on t’accueille vraiment.',
    icon: Users,
  },
  {
    title: 'Servir',
    phrase: 'Des dons qui trouvent leur place.',
    icon: HandHeart,
  },
  {
    title: 'Rayonner',
    phrase: 'Porter la lumière au-delà de soi.',
    icon: Sun,
  },
] as const

export function VisionSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()

  return (
    <section ref={ref} className="section-cinematic" aria-labelledby="vision-title">
      <div className="container-cinematic max-w-6xl">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 md:mb-24"
        >
          <p className="section-label-dark justify-center">Vision</p>
          <h2 id="vision-title" className="heading-cinematic-lg">
            Pourquoi Citadelle&nbsp;?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-10">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.7,
                delay: reduce ? 0 : 0.08 + i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-center px-2"
            >
              <div
                className="w-11 h-11 mx-auto mb-6 flex items-center justify-center rounded-full"
                style={{ border: '1px solid rgba(212,175,55,0.28)' }}
              >
                <p.icon className="w-5 h-5" style={{ color: '#D4AF37' }} strokeWidth={1.5} />
              </div>
              <h3 className="font-cinzel font-bold text-pearl text-xl mb-3">{p.title}</h3>
              <p
                className="font-inter text-sm leading-relaxed max-w-[14rem] mx-auto"
                style={{ color: 'rgba(245,230,216,0.45)' }}
              >
                {p.phrase}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
