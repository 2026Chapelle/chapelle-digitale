'use client'
/**
 * SCÈNE 4 — PARCOURS
 * Progression verticale narrative (pas de grille).
 * Images réelles du Parcours 1 (modules locaux).
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

type PathStep = {
  n: string
  title: string
  phrase: string
  icon: LucideIcon
  /** Image réelle locale (parcours-1). */
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
      <div className="container-cinematic max-w-3xl">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14 md:mb-20"
        >
          <p className="section-label-dark justify-center">Le parcours</p>
          <h2 id="parcours-title" className="heading-cinematic-lg mb-5">
            Une direction
            <span className="block text-cinematic-gold">claire</span>
          </h2>
          <p
            className="font-inter text-base md:text-lg max-w-md mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.45)' }}
          >
            Du premier pas à la multiplication — étape par étape.
          </p>
        </motion.div>

        <ol className="citadelle-v3-path relative list-none m-0 p-0">
          <div className="citadelle-v3-path-spine" aria-hidden />

          {PATH_STEPS.map((step, i) => {
            const Icon = step.icon
            const isLast = i === PATH_STEPS.length - 1
            return (
              <motion.li
                key={step.n}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.55,
                  delay: reduce ? 0 : i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="citadelle-v3-path-step relative"
              >
                <div className="citadelle-v3-path-node" aria-hidden />

                <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 pl-10 sm:pl-14">
                  <div className="relative w-full sm:w-40 h-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0">
                    <Image
                      src={step.image}
                      alt={step.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 160px"
                      className="object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(6,6,10,0.15), rgba(6,6,10,0.45))',
                      }}
                      aria-hidden
                    />
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="font-cinzel text-[10px] font-bold tracking-[0.28em]"
                        style={{ color: 'rgba(212,175,55,0.55)' }}
                      >
                        {step.n}
                      </span>
                      <Icon className="w-4 h-4" style={{ color: 'rgba(212,175,55,0.7)' }} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-cinzel font-bold text-pearl text-xl mb-1.5">{step.title}</h3>
                    <p
                      className="font-inter text-sm leading-relaxed max-w-md"
                      style={{ color: 'rgba(245,230,216,0.45)' }}
                    >
                      {step.phrase}
                    </p>
                  </div>
                </div>

                {!isLast && (
                  <div
                    className="pl-10 sm:pl-14 py-3 text-center sm:text-left"
                    aria-hidden
                    style={{ color: 'rgba(212,175,55,0.35)' }}
                  >
                    <span className="font-inter text-lg leading-none">↓</span>
                  </div>
                )}
              </motion.li>
            )
          })}
        </ol>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mt-14 md:mt-16"
        >
          <Link
            href="/parcours"
            onClick={() => events.ctaClick('voir_parcours_complet')}
            className="btn-gold-cinematic group inline-flex"
            style={{ padding: '15px 32px', fontSize: '0.92rem' }}
          >
            Voir le parcours complet
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
