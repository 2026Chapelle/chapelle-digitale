'use client'
/**
 * SCÈNE 5 — LA VIE
 * Fusion éditoriale : enseignements, live, événements, prière, groupes.
 * Présentés comme expériences — pas comme dashboard de cartes.
 */
import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen,
  Radio,
  CalendarDays,
  Heart,
  Users,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { events } from '@/lib/analytics'
import {
  HOME_VIEWPORT,
  HOME_DELAY,
  revealInitial,
  revealVisible,
  revealTransition,
} from '@/lib/home-motion'

type Experience = {
  title: string
  phrase: string
  href: string
  icon: LucideIcon
  cta: string
}

const EXPERIENCES: Experience[] = [
  {
    title: 'Enseignements',
    phrase: 'La Parole qui nourrit et forme le disciple.',
    href: '/enseignements',
    icon: BookOpen,
    cta: 'Écouter et lire',
  },
  {
    title: 'Live',
    phrase: 'Se rassembler en direct, où que tu sois.',
    href: '/live',
    icon: Radio,
    cta: 'Rejoindre le live',
  },
  {
    title: 'Événements',
    phrase: 'Vivre des moments forts de la maison.',
    href: '/evenements',
    icon: CalendarDays,
    cta: 'Voir les rendez-vous',
  },
  {
    title: 'Prière',
    phrase: 'Porter les uns les autres devant Dieu.',
    href: '/priere',
    icon: Heart,
    cta: 'Déposer une demande',
  },
  {
    title: 'Groupes',
    phrase: 'Grandir en cellule, dans la proximité.',
    href: '/groupes',
    icon: Users,
    cta: 'Trouver un groupe',
  },
]

export function LifeExperiencesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  return (
    <section ref={ref} className="section-cinematic" aria-labelledby="life-title">
      <div className="container-cinematic max-w-3xl">
        <motion.h2
          id="life-title"
          initial={revealInitial(reduce)}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.title)}
          className="heading-cinematic-lg text-center mb-12 md:mb-16"
        >
          Ce que tu vas
          <span className="block text-cinematic-gold">vivre.</span>
        </motion.h2>

        <ul className="list-none m-0 p-0 divide-y" style={{ borderColor: 'rgba(244,241,233,0.06)' }}>
          {EXPERIENCES.map((exp, i) => {
            const Icon = exp.icon
            return (
              <motion.li
                key={exp.title}
                initial={revealInitial(reduce, { y: 36, blur: i < 3 })}
                whileInView={revealVisible()}
                viewport={HOME_VIEWPORT}
                transition={revealTransition(reduce, HOME_DELAY.body + i * HOME_DELAY.cardStep)}
                style={{ borderColor: 'rgba(244,241,233,0.06)' }}
              >
                <Link
                  href={exp.href}
                  onClick={() => events.ctaClick(`vie_${exp.title.toLowerCase()}`)}
                  className="group flex items-start sm:items-center gap-5 py-7 md:py-8 transition-colors"
                >
                  <span
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
                    style={{ border: '1px solid rgba(212,175,55,0.22)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#D4AF37' }} strokeWidth={1.5} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-cinzel font-bold text-pearl text-lg mb-1 group-hover:text-gold transition-colors">
                      {exp.title}
                    </span>
                    <span
                      className="block font-inter text-sm leading-relaxed"
                      style={{ color: 'rgba(245,230,216,0.42)' }}
                    >
                      {exp.phrase}
                    </span>
                  </span>
                  <span
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs font-inter flex-shrink-0 mt-1 group-hover:gap-2.5 transition-all"
                    style={{ color: 'rgba(212,175,55,0.65)' }}
                  >
                    {exp.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
