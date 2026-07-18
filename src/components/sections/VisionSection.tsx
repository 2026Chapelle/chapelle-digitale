'use client'
/**
 * SCÈNE 3 — VISION · motion unifiée (titre puis contenu)
 */
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Sprout, Users, HandHeart, Sun } from 'lucide-react'
import { HOME_DUR, HOME_EASE, HOME_Y, HOME_VIEWPORT } from '@/lib/home-motion'

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
  const inView = useInView(ref, HOME_VIEWPORT)
  const reduce = useReducedMotion()

  return (
    <section ref={ref} className="section-cinematic" aria-labelledby="vision-title">
      <div className="container-cinematic max-w-6xl">
        <motion.h2
          id="vision-title"
          initial={reduce ? false : { opacity: 0, y: HOME_Y }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, ease: HOME_EASE }}
          className="heading-cinematic-lg text-center mb-16 md:mb-20"
        >
          Pourquoi Citadelle&nbsp;?
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-14 gap-x-10 lg:gap-x-12">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.title}
                initial={reduce ? false : { opacity: 0, y: HOME_Y }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: HOME_DUR,
                  delay: reduce ? 0 : 0.14 + i * 0.08,
                  ease: HOME_EASE,
                }}
                className="citadelle-vision-pillar group text-center px-3"
              >
                <div
                  className="citadelle-vision-icon mx-auto mb-6 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Icon className="w-6 h-6" strokeWidth={1.4} />
                </div>
                <h3 className="font-cinzel font-bold text-pearl text-xl mb-3 transition-[color,transform] duration-500 group-hover:-translate-y-0.5">
                  {p.title}
                </h3>
                <p
                  className="font-inter text-sm leading-relaxed max-w-[13rem] mx-auto transition-[color,transform] duration-500 group-hover:-translate-y-0.5"
                  style={{ color: 'rgba(245,230,216,0.45)' }}
                >
                  {p.phrase}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
