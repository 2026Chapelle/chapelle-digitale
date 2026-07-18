'use client'
/**
 * SCÈNE 4 — PARCOURS · composition desktop organique (voyage, pas timeline tech)
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
import { HOME_DUR, HOME_EASE } from '@/lib/home-motion'

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
      <div className="container-cinematic max-w-4xl">
        <motion.h2
          id="parcours-title"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, ease: HOME_EASE }}
          className="heading-cinematic-lg text-center mb-12 md:mb-16"
        >
          Le parcours
        </motion.h2>

        <div className="citadelle-journey relative">
          {/* Fil progressif — révélation, pas timeline technique */}
          <motion.div
            className="citadelle-journey-thread"
            aria-hidden
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={inView ? { scaleY: 1, opacity: 1 } : {}}
            transition={{ duration: 1.4, ease: HOME_EASE, delay: reduce ? 0 : 0.15 }}
            style={{ transformOrigin: 'top center' }}
          />

          <ol className="relative list-none m-0 p-0 space-y-8 md:space-y-12">
            {PATH_STEPS.map((step, i) => {
              const Icon = step.icon
              const side = i % 2 === 0 ? 'journey-left' : 'journey-right'
              return (
                <motion.li
                  key={step.n}
                  initial={reduce ? false : { opacity: 0, y: 22 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: HOME_DUR,
                    delay: reduce ? 0 : 0.2 + i * 0.1,
                    ease: HOME_EASE,
                  }}
                  className={`citadelle-journey-step ${side}`}
                >
                  <motion.span
                    className="citadelle-journey-dot"
                    aria-hidden
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: reduce ? 0 : 0.28 + i * 0.1,
                      ease: HOME_EASE,
                    }}
                  />

                  <article className="citadelle-journey-card group">
                    <div className="citadelle-journey-media relative overflow-hidden">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 280px"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                      <div className="citadelle-journey-media-veil" aria-hidden />
                    </div>

                    <div className="citadelle-journey-body">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span
                          className="font-cinzel text-[11px] font-bold tracking-[0.28em]"
                          style={{ color: 'rgba(212,175,55,0.55)' }}
                        >
                          {step.n}
                        </span>
                        <Icon
                          className="w-[1.1rem] h-[1.1rem] transition-transform duration-500 group-hover:scale-110"
                          style={{ color: 'rgba(212,175,55,0.75)' }}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      </div>
                      <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2">
                        {step.title}
                      </h3>
                      <p
                        className="font-inter text-sm md:text-[0.95rem] leading-relaxed"
                        style={{ color: 'rgba(245,230,216,0.48)' }}
                      >
                        {step.phrase}
                      </p>
                    </div>
                  </article>
                </motion.li>
              )
            })}
          </ol>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: HOME_DUR,
            delay: reduce ? 0 : 0.2 + PATH_STEPS.length * 0.1,
            ease: HOME_EASE,
          }}
          className="text-center mt-14 md:mt-16"
        >
          <Link
            href="/parcours"
            onClick={() => events.ctaClick('voir_parcours_complet')}
            className="btn-gold-cinematic group inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
            style={{ padding: '15px 32px', fontSize: '0.92rem' }}
          >
            Voir le parcours complet
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
