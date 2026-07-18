'use client'
/**
 * SCÈNE 4 — PARCOURS
 * Cartes actionnables, miniatures lisibles, CTA clairs.
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
import { HOME_DUR, HOME_EASE, HOME_Y } from '@/lib/home-motion'

type PathStep = {
  n: string
  title: string
  phrase: string
  icon: LucideIcon
  image: string
  alt: string
  href: string
  cta: string
  objectPosition?: string
}

/** Routes réelles uniquement — /parcours (pas d’ancre publique dédiée). */
const PATH_STEPS: PathStep[] = [
  {
    n: '01',
    title: 'Découvrir',
    phrase: 'Entrer dans la maison et voir le chemin s’ouvrir.',
    icon: Eye,
    image: '/images/formations/parcours-1/module-1-vision-et-histoire.png.png',
    alt: 'Vision et histoire de la maison',
    href: '/parcours',
    cta: 'Découvrir cette étape',
    objectPosition: 'center 30%',
  },
  {
    n: '02',
    title: "S'enraciner",
    phrase: 'Poser des fondations solides dans la foi.',
    icon: Anchor,
    image: '/images/formations/parcours-1/module-2-valeurs-du-royaume.png.png',
    alt: 'Valeurs du Royaume',
    href: '/parcours',
    cta: 'Commencer cette étape',
    objectPosition: 'center center',
  },
  {
    n: '03',
    title: 'Grandir',
    phrase: 'Avancer pas à pas, nourri et accompagné.',
    icon: Sprout,
    image: '/images/formations/parcours-1/module-5-mes-premiers-pas.png.png',
    alt: 'Premiers pas de croissance',
    href: '/parcours',
    cta: 'Commencer cette étape',
    objectPosition: 'center 40%',
  },
  {
    n: '04',
    title: 'Servir',
    phrase: 'Mettre ses dons au service des autres.',
    icon: HandHeart,
    image: '/images/formations/parcours-1/module-3-rejoindre-une-cellule.png.png',
    alt: 'Rejoindre une cellule et servir',
    href: '/parcours',
    cta: 'Découvrir cette étape',
    objectPosition: 'center center',
  },
  {
    n: '05',
    title: 'Conduire',
    phrase: 'Guider avec sagesse et responsabilité.',
    icon: Compass,
    image: '/images/formations/parcours-1/module-4-nos-plateformes.png.png',
    alt: 'Nos plateformes et le leadership',
    href: '/parcours',
    cta: 'Voir le parcours',
    objectPosition: 'center 35%',
  },
  {
    n: '06',
    title: 'Multiplier',
    phrase: 'Former d’autres et étendre le Royaume.',
    icon: Share2,
    image: '/images/formations/parcours-1/module-6-mon-engagement.png.png',
    alt: 'Engagement et multiplication',
    href: '/parcours',
    cta: 'Voir le parcours',
    objectPosition: 'center center',
  },
]

export function StartHereSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px', amount: 0.15 })
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
          initial={reduce ? false : { opacity: 0, y: HOME_Y }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, ease: HOME_EASE }}
          className="heading-cinematic-lg text-center mb-12 md:mb-16"
        >
          Le parcours
        </motion.h2>

        <div className="citadelle-journey relative">
          <motion.div
            className="citadelle-journey-thread"
            aria-hidden
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={inView ? { scaleY: 1, opacity: 1 } : {}}
            transition={{ duration: 1.1, ease: HOME_EASE, delay: reduce ? 0 : 0.12 }}
            style={{ transformOrigin: 'top center' }}
          />

          <ol className="relative list-none m-0 p-0 space-y-7 md:space-y-11">
            {PATH_STEPS.map((step, i) => {
              const Icon = step.icon
              const side = i % 2 === 0 ? 'journey-left' : 'journey-right'
              return (
                <motion.li
                  key={step.n}
                  initial={reduce ? false : { opacity: 0, y: HOME_Y }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: HOME_DUR,
                    delay: reduce ? 0 : 0.16 + i * 0.09,
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
                      duration: 0.55,
                      delay: reduce ? 0 : 0.22 + i * 0.09,
                      ease: HOME_EASE,
                    }}
                  />

                  <Link
                    href={step.href}
                    onClick={() => events.ctaClick(`parcours_etape_${step.n}`)}
                    aria-label={`${step.title} — ${step.cta}`}
                    className="citadelle-journey-card group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
                  >
                    <div className="citadelle-journey-media relative overflow-hidden">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 320px"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        style={{ objectPosition: step.objectPosition || 'center center' }}
                      />
                      <div className="citadelle-journey-media-veil" aria-hidden />
                    </div>

                    <div className="citadelle-journey-body">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span
                          className="font-cinzel text-[11px] font-bold tracking-[0.28em]"
                          style={{ color: 'rgba(212,175,55,0.6)' }}
                        >
                          {step.n}
                        </span>
                        <Icon
                          className="w-[1.1rem] h-[1.1rem] transition-transform duration-500 group-hover:scale-110"
                          style={{ color: 'rgba(212,175,55,0.8)' }}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      </div>
                      <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2 group-hover:text-gold transition-colors">
                        {step.title}
                      </h3>
                      <p
                        className="font-inter text-sm md:text-[0.95rem] leading-relaxed mb-4"
                        style={{ color: 'rgba(245,230,216,0.52)' }}
                      >
                        {step.phrase}
                      </p>
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-inter font-medium transition-all group-hover:gap-2.5"
                        style={{ color: '#D4AF37' }}
                      >
                        {step.cta}
                        <ArrowRight className="w-4 h-4" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ol>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: HOME_Y - 4 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: HOME_DUR,
            delay: reduce ? 0 : 0.18 + PATH_STEPS.length * 0.09,
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
