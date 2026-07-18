'use client'
/**
 * SCÈNE 4 — PARCOURS · chemin organique (voyage, pas timeline)
 */
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Eye,
  Anchor,
  Sprout,
  HandHeart,
  Compass,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import { events } from '@/lib/analytics'

const EASE = [0.16, 1, 0.3, 1] as const
const DUR = 0.85

type PathStep = {
  n: string
  title: string
  phrase: string
  icon: LucideIcon
  image: string
  alt: string
}

const PATH_STEPS: PathStep[] = [
  {
    n: '01',
    title: 'Découvrir',
    phrase: 'Entrer dans la maison et voir le chemin s’ouvrir.',
    icon: Eye,
    image: '/images/formations/parcours-1/module-1-vision-et-histoire.png.png',
    alt: 'Vision et histoire de la maison',
  },
  {
    n: '02',
    title: "S'enraciner",
    phrase: 'Poser des fondations solides dans la foi.',
    icon: Anchor,
    image: '/images/formations/parcours-1/module-2-valeurs-du-royaume.png.png',
    alt: 'Valeurs du Royaume',
  },
  {
    n: '03',
    title: 'Grandir',
    phrase: 'Avancer pas à pas, nourri et accompagné.',
    icon: Sprout,
    image: '/images/formations/parcours-1/module-5-mes-premiers-pas.png.png',
    alt: 'Premiers pas de croissance',
  },
  {
    n: '04',
    title: 'Servir',
    phrase: 'Mettre ses dons au service des autres.',
    icon: HandHeart,
    image: '/images/formations/parcours-1/module-3-rejoindre-une-cellule.png.png',
    alt: 'Rejoindre une cellule et servir',
  },
  {
    n: '05',
    title: 'Conduire',
    phrase: 'Guider avec sagesse et responsabilité.',
    icon: Compass,
    image: '/images/formations/parcours-1/module-4-nos-plateformes.png.png',
    alt: 'Nos plateformes et le leadership',
  },
  {
    n: '06',
    title: 'Multiplier',
    phrase: 'Former d’autres et étendre le Royaume.',
    icon: Share2,
    image: '/images/formations/parcours-1/module-6-mon-engagement.png.png',
    alt: 'Engagement et multiplication',
  },
]

export function StartHereSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()

  return (
    <section
      id="decouvrir-citadelle"
      ref={ref}
      className="section-cinematic scroll-mt-24"
      aria-labelledby="parcours-title"
    >
      <div className="container-cinematic max-w-2xl overflow-hidden">
        <motion.h2
          id="parcours-title"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: DUR, ease: EASE }}
          className="heading-cinematic-lg text-center mb-12 md:mb-16"
        >
          Le parcours
        </motion.h2>

        <ol className="citadelle-v3-path relative list-none m-0 p-0">
          <div className="citadelle-v3-path-spine" aria-hidden="true" />

          {PATH_STEPS.map((step, i) => {
            const Icon = step.icon
            const isLast = i === PATH_STEPS.length - 1
            const offset = i % 2 === 0 ? 'is-path-a' : 'is-path-b'
            return (
              <motion.li
                key={step.n}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: DUR,
                  delay: reduce ? 0 : i * 0.05,
                  ease: EASE,
                }}
                className={`citadelle-v3-path-step relative ${offset}`}
              >
                <div className="citadelle-v3-path-node" aria-hidden="true" />

                <div className="citadelle-path-card group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pl-10 sm:pl-12">
                  <div className="relative w-full sm:w-36 h-24 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 citadelle-path-img">
                    <Image
                      src={step.image}
                      alt={step.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 144px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="citadelle-path-img-veil absolute inset-0 pointer-events-none" aria-hidden />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span
                        className="font-cinzel text-[10px] font-bold tracking-[0.28em]"
                        style={{ color: 'rgba(212,175,55,0.55)' }}
                      >
                        {step.n}
                      </span>
                      <Icon
                        className="w-4 h-4 transition-transform duration-500 group-hover:scale-110"
                        style={{ color: 'rgba(212,175,55,0.7)' }}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="font-cinzel font-bold text-pearl text-xl mb-1.5">{step.title}</h3>
                    <p
                      className="font-inter text-sm leading-relaxed max-w-sm"
                      style={{ color: 'rgba(245,230,216,0.45)' }}
                    >
                      {step.phrase}
                    </p>
                  </div>
                </div>

                {!isLast && (
                  <div
                    className="pl-10 sm:pl-12 py-2.5"
                    aria-hidden="true"
                    style={{ color: 'rgba(212,175,55,0.3)' }}
                  >
                    <span className="font-inter text-base leading-none">↓</span>
                  </div>
                )}
              </motion.li>
            )
          })}
        </ol>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: DUR, delay: reduce ? 0 : 0.28, ease: EASE }}
          className="text-center mt-12 md:mt-14"
        >
          <Link
            href="/parcours"
            onClick={() => events.ctaClick('voir_parcours_complet')}
            className="btn-gold-cinematic group inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
            style={{ padding: '15px 32px', fontSize: '0.92rem' }}
          >
            Voir le parcours complet
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
