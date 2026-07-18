'use client'
/**
 * SCÈNE 4 — PARCOURS éditorial
 * Alternance large desktop · image non rognée (object-contain) · CTA clairs
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
import { HOME_DUR, HOME_EASE, HOME_Y, HOME_VIEWPORT } from '@/lib/home-motion'

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

const CTA = 'Découvrir cette étape'
const HREF = '/parcours'

export function StartHereSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, HOME_VIEWPORT)
  const reduce = useReducedMotion()

  return (
    <section
      id="decouvrir-citadelle"
      ref={ref}
      className="section-cinematic scroll-mt-24"
      aria-labelledby="parcours-title"
    >
      <div className="container-cinematic max-w-6xl">
        <motion.h2
          id="parcours-title"
          initial={reduce ? false : { opacity: 0, y: HOME_Y }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, ease: HOME_EASE }}
          className="heading-cinematic-lg text-center mb-14 md:mb-20"
        >
          Le parcours
        </motion.h2>

        <div className="citadelle-journey-editorial relative">
          <motion.div
            className="citadelle-journey-thread-ed"
            aria-hidden
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={inView ? { scaleY: 1, opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: HOME_EASE, delay: reduce ? 0 : 0.08 }}
            style={{ transformOrigin: 'top center' }}
          />

          <ol className="relative list-none m-0 p-0 space-y-12 md:space-y-16 lg:space-y-20">
            {PATH_STEPS.map((step, i) => {
              const Icon = step.icon
              const reverse = i % 2 === 1
              const stepDelay = 0.12 + i * 0.1
              return (
                <motion.li
                  key={step.n}
                  initial={reduce ? false : { opacity: 0, y: 24, scale: 0.985 }}
                  animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{
                    duration: 0.9,
                    delay: reduce ? 0 : stepDelay,
                    ease: HOME_EASE,
                  }}
                  className="citadelle-journey-row relative"
                >
                  <motion.span
                    className="citadelle-journey-dot-ed"
                    aria-hidden
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: reduce ? 0 : stepDelay - 0.06,
                      ease: HOME_EASE,
                    }}
                  />

                  <Link
                    href={HREF}
                    onClick={() => events.ctaClick(`parcours_etape_${step.n}`)}
                    aria-label={`${step.title} — ${CTA}`}
                    className={`citadelle-journey-editorial-card group grid md:grid-cols-2 gap-0 md:gap-10 lg:gap-14 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] ${
                      reverse ? 'md:[direction:rtl]' : ''
                    }`}
                  >
                    {/* Visuel large — object-contain pour texte de couverture lisible */}
                    <div
                      className={`citadelle-journey-visual relative ${reverse ? 'md:[direction:ltr]' : ''}`}
                    >
                      <div className="citadelle-journey-visual-frame">
                        <Image
                          src={step.image}
                          alt={step.alt}
                          width={560}
                          height={420}
                          sizes="(max-width: 768px) 100vw, 520px"
                          className="citadelle-journey-visual-img"
                        />
                      </div>
                    </div>

                    {/* Texte */}
                    <div className={`citadelle-journey-copy px-1 md:px-2 py-6 md:py-4 ${reverse ? 'md:[direction:ltr]' : ''}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="font-cinzel text-xs font-bold tracking-[0.3em]"
                          style={{ color: 'rgba(212,175,55,0.55)' }}
                        >
                          {step.n}
                        </span>
                        <Icon
                          className="w-5 h-5"
                          style={{ color: 'rgba(212,175,55,0.75)' }}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      </div>
                      <h3 className="font-cinzel font-bold text-pearl text-2xl md:text-3xl mb-3 group-hover:text-gold transition-colors">
                        {step.title}
                      </h3>
                      <p
                        className="font-inter text-base md:text-lg leading-relaxed mb-6 max-w-md"
                        style={{ color: 'rgba(245,230,216,0.52)' }}
                      >
                        {step.phrase}
                      </p>
                      <span className="citadelle-journey-cta inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 min-h-[48px] rounded-full font-inter text-sm font-semibold transition-all group-hover:gap-3">
                        {CTA}
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
            delay: reduce ? 0 : 0.2 + PATH_STEPS.length * 0.06,
            ease: HOME_EASE,
          }}
          className="text-center mt-16 md:mt-20"
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
