'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import {
  OPENING_DATE_LABEL,
  OPENING_TZ_LABEL,
  OUVERTURE_ROUTES,
  finalCtaLabel,
  heroCtaLabel,
  isOpen as computeIsOpen,
  primaryCtaHref,
  type Countdown,
  type OpeningVideo as OpeningVideoSource,
} from '@/lib/ouverture'
import { events } from '@/lib/analytics'
import { OpeningCountdown } from './OpeningCountdown'
import { OpeningVideo } from './OpeningVideo'

/* ============================================================
   OUVERTURE PUBLIQUE DE LA CITADELLE — landing événementielle
   ------------------------------------------------------------
   Direction artistique : nuit royale (#050816 → #111936), or (#D4AF6E),
   braise (#FF8C00), texte clair (#C7CEDB). Les composants d'interface
   (boutons, halos, conteneurs, typographies Cinzel/Cormorant/Inter) sont ceux
   du design system existant — aucun second système n'est introduit.
   Mobile-first, animations discrètes, `prefers-reduced-motion` respecté.
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const

/** Apparition douce, neutralisée si l'utilisateur réduit les animations. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.75, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

const PROMESSES = [
  {
    titre: 'Apprendre',
    texte:
      'Accède à des enseignements et à des parcours structurés pour approfondir ta connaissance du Royaume.',
  },
  {
    titre: 'Grandir',
    texte: 'Avance étape après étape dans un chemin personnel de transformation spirituelle.',
  },
  {
    titre: 'Être accompagné',
    texte:
      'Ne marche plus seul. Rejoins une communauté et bénéficie d’un accompagnement adapté à ton parcours.',
  },
  {
    titre: 'Servir et accomplir',
    texte: 'Découvre tes dons, développe ton appel et prépare-toi à servir avec maturité.',
  },
]

const ETAPES = [
  { titre: 'Crée ton compte', texte: 'Rejoins La Citadelle en quelques instants.' },
  { titre: 'Découvre ton espace', texte: 'Accède à ton tableau de bord, à tes ressources et à ton parcours.' },
  { titre: 'Commence à grandir', texte: 'Suis tes premiers enseignements et avance à ton rythme.' },
]

export default function OuvertureContent({
  initialOpen,
  initialCountdown,
  video,
}: {
  initialOpen: boolean
  initialCountdown: Countdown
  video: OpeningVideoSource | null
}) {
  const reduce = useReducedMotion()

  /* L'état d'ouverture est calculé sur le serveur puis re-vérifié sur l'horloge
     du visiteur. Le premier rendu client reprend la valeur serveur : aucun
     écart d'hydratation, et la bascule des CTA se fait dès le premier effet. */
  const [open, setOpen] = useState(initialOpen)
  useEffect(() => {
    const tick = () => setOpen(computeIsOpen(Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const ctaHref = primaryCtaHref()

  return (
    <div
      className="relative overflow-x-hidden"
      style={{
        background:
          'linear-gradient(180deg, #050816 0%, #0B1023 32%, #111936 58%, #0B1023 82%, #050816 100%)',
        color: '#C7CEDB',
      }}
    >
      {/* ══════════════════ 1 · HERO D’OUVERTURE ══════════════════ */}
      <section
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6 md:pt-32"
        aria-labelledby="ouverture-titre"
      >
        <HeroBackdrop reduce={!!reduce} />

        <div className="relative z-10 mx-auto w-full max-w-4xl">
          {/* Sur-titre */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mb-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2 font-inter font-bold uppercase"
            style={{
              fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)',
              letterSpacing: '0.28em',
              color: '#F0DCAE',
              background: 'rgba(212,175,110,0.08)',
              border: '1px solid rgba(212,175,110,0.28)',
            }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: '#FF8C00', boxShadow: '0 0 12px rgba(255,140,0,0.8)' }}
            />
            Ouverture publique
          </motion.p>

          {/* Titre */}
          <motion.h1
            id="ouverture-titre"
            initial={reduce ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.08, ease: EASE }}
            className="font-cinzel font-black uppercase"
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 5.8rem)',
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
            }}
          >
            <span className="block" style={{ color: '#FFFFFF' }}>
              La Citadelle
            </span>
            <span
              className="mt-1 block"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0DCAE 42%, #D4AF6E 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ouvre ses portes
            </span>
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: EASE }}
            className="mx-auto mt-7 max-w-2xl font-inter"
            style={{ fontSize: 'clamp(1rem, 2.4vw, 1.2rem)', lineHeight: 1.75, color: '#C7CEDB' }}
          >
            Une maison digitale pour apprendre, grandir, être accompagné et avancer dans sa destinée
            avec Dieu.
          </motion.p>

          {/* Date */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: EASE }}
            className="mt-9 flex flex-col items-center"
          >
            <span
              aria-hidden
              className="mb-5 block h-px w-24"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,110,0.75), transparent)' }}
            />
            <p
              className="font-cinzel font-bold uppercase"
              style={{
                fontSize: 'clamp(0.82rem, 2.6vw, 1.12rem)',
                letterSpacing: '0.16em',
                color: '#F0DCAE',
              }}
            >
              {OPENING_DATE_LABEL}
            </p>
            <p
              className="mt-2 font-inter"
              style={{ fontSize: 'clamp(0.68rem, 1.8vw, 0.78rem)', letterSpacing: '0.14em', color: 'rgba(199,206,219,0.6)' }}
            >
              {OPENING_TZ_LABEL}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.44, ease: EASE }}
            className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              href={ctaHref}
              onClick={() => events.ctaClick('ouverture_hero_primary')}
              className="btn-gold-cinematic group w-full sm:w-auto"
              style={{ padding: '16px 36px', fontSize: '0.95rem' }}
            >
              {heroCtaLabel(open)}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

            <a
              href="#la-vision"
              onClick={() => events.ctaClick('ouverture_hero_vision')}
              className="btn-glass-cinematic w-full sm:w-auto"
            >
              Découvrir la vision
            </a>
          </motion.div>
        </div>

        {/* Indicateur de défilement */}
        <motion.a
          href="#compte-a-rebours"
          aria-label="Aller au compte à rebours"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5"
          style={{ color: 'rgba(199,206,219,0.5)' }}
        >
          <span className="font-inter uppercase" style={{ fontSize: '0.55rem', letterSpacing: '0.32em' }}>
            Découvrir
          </span>
          <motion.span
            animate={reduce ? {} : { y: [0, 7, 0] }}
            transition={reduce ? {} : { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-4 w-4" style={{ color: '#D4AF6E' }} aria-hidden />
          </motion.span>
        </motion.a>
      </section>

      {/* ══════════════════ 2 · COMPTE À REBOURS ══════════════════ */}
      <section
        id="compte-a-rebours"
        className="relative scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
        aria-label="Compte à rebours avant l’ouverture"
      >
        <div className="mx-auto max-w-4xl">
          {!open && (
            <Reveal className="mb-9 text-center">
              <p className="section-label-dark justify-center" style={{ color: '#D4AF6E' }}>
                Avant l’ouverture
              </p>
            </Reveal>
          )}
          <Reveal delay={0.06}>
            <OpeningCountdown initial={initialCountdown} />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ 3 · VIDÉO DE CAMPAGNE ══════════════════ */}
      <section className="relative px-4 py-16 sm:px-6 md:py-24" aria-labelledby="video-titre">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center md:mb-12">
            <h2
              id="video-titre"
              className="font-cinzel font-black uppercase"
              style={{
                fontSize: 'clamp(1.5rem, 4.6vw, 2.9rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
              }}
            >
              Une porte ouverte pour grandir
            </h2>
            <p
              className="mx-auto mt-5 max-w-2xl font-inter"
              style={{ fontSize: 'clamp(0.95rem, 2.2vw, 1.08rem)', lineHeight: 1.75, color: '#C7CEDB' }}
            >
              Découvrez pourquoi La Citadelle a été créée et comment cette maison digitale peut
              accompagner votre croissance spirituelle.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <OpeningVideo source={video} />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ 4 · POURQUOI LA CITADELLE ══════════════════ */}
      <section id="la-vision" className="relative scroll-mt-24 px-4 py-16 sm:px-6 md:py-28" aria-labelledby="vision-titre">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-16">
          <Reveal>
            <p className="section-label-dark" style={{ color: '#D4AF6E' }}>
              La vision
            </p>
            <h2
              id="vision-titre"
              className="mt-2 font-cinzel font-black uppercase"
              style={{
                fontSize: 'clamp(1.5rem, 4.6vw, 2.7rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
              }}
            >
              Plus qu’une plateforme
            </h2>
          </Reveal>

          <Reveal delay={0.08} className="space-y-6">
            <p
              className="font-cormorant"
              style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', lineHeight: 1.6, color: '#FFFFFF' }}
            >
              La Citadelle est une maison digitale consacrée à la croissance spirituelle, à la
              formation, à l’accompagnement et à la transformation des vies.
            </p>
            <p
              className="font-inter"
              style={{ fontSize: 'clamp(0.95rem, 2.2vw, 1.05rem)', lineHeight: 1.8, color: '#C7CEDB' }}
            >
              Elle a été pensée pour toutes celles et tous ceux qui désirent mieux connaître Dieu,
              comprendre leur identité en Christ et avancer avec assurance dans leur destinée.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ 5 · LES QUATRE PROMESSES ══════════════════ */}
      <section className="relative px-4 py-16 sm:px-6 md:py-24" aria-labelledby="promesses-titre">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-10 md:mb-14">
            <h2
              id="promesses-titre"
              className="font-cinzel font-black uppercase"
              style={{
                fontSize: 'clamp(1.4rem, 4.2vw, 2.4rem)',
                lineHeight: 1.1,
                color: '#FFFFFF',
              }}
            >
              Ce que tu y trouveras
            </h2>
          </Reveal>

          <ol className="list-none">
            {PROMESSES.map((p, i) => (
              <Reveal key={p.titre} delay={i * 0.06}>
                <li
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 py-7 sm:gap-x-8 sm:py-8"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(199,206,219,0.12)' }}
                >
                  <span
                    aria-hidden
                    className="font-cinzel font-black tabular-nums"
                    style={{
                      fontSize: 'clamp(0.85rem, 2.4vw, 1.05rem)',
                      color: 'rgba(212,175,110,0.75)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3
                      className="font-cinzel font-bold uppercase"
                      style={{
                        fontSize: 'clamp(1.05rem, 3vw, 1.5rem)',
                        letterSpacing: '0.04em',
                        color: '#FFFFFF',
                      }}
                    >
                      {p.titre}
                    </h3>
                    <p
                      className="mt-2.5 max-w-2xl font-inter"
                      style={{ fontSize: 'clamp(0.92rem, 2.1vw, 1.02rem)', lineHeight: 1.75, color: '#C7CEDB' }}
                    >
                      {p.texte}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════════════ 6 · COMMENT COMMENCER ══════════════════ */}
      <section
        className="relative px-4 py-16 sm:px-6 md:py-24"
        style={{ background: 'rgba(17,25,54,0.55)', borderTop: '1px solid rgba(199,206,219,0.08)', borderBottom: '1px solid rgba(199,206,219,0.08)' }}
        aria-labelledby="etapes-titre"
      >
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center md:mb-14">
            <p className="section-label-dark justify-center" style={{ color: '#D4AF6E' }}>
              En trois temps
            </p>
            <h2
              id="etapes-titre"
              className="mt-2 font-cinzel font-black uppercase"
              style={{ fontSize: 'clamp(1.4rem, 4.2vw, 2.4rem)', lineHeight: 1.1, color: '#FFFFFF' }}
            >
              Comment commencer ?
            </h2>
          </Reveal>

          <ol className="grid list-none gap-8 sm:grid-cols-3 sm:gap-6 md:gap-10">
            {ETAPES.map((e, i) => (
              <Reveal key={e.titre} delay={i * 0.08}>
                <li className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-cinzel font-bold tabular-nums"
                      style={{
                        fontSize: '0.8rem',
                        color: '#050816',
                        background: 'linear-gradient(135deg, #F0DCAE 0%, #D4AF6E 100%)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      aria-hidden
                      className="h-px flex-1"
                      style={{ background: 'linear-gradient(90deg, rgba(212,175,110,0.45), transparent)' }}
                    />
                  </div>
                  <h3
                    className="font-cinzel font-bold uppercase"
                    style={{ fontSize: 'clamp(0.95rem, 2.6vw, 1.15rem)', letterSpacing: '0.05em', color: '#FFFFFF' }}
                  >
                    {e.titre}
                  </h3>
                  <p
                    className="mt-2.5 font-inter"
                    style={{ fontSize: 'clamp(0.9rem, 2vw, 0.98rem)', lineHeight: 1.7, color: '#C7CEDB' }}
                  >
                    {e.texte}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════════════ 7 · PÉRIODE DES PREMIERS MEMBRES ══════════════════ */}
      <section className="relative px-4 py-16 sm:px-6 md:py-24" aria-labelledby="premiers-titre">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2
              id="premiers-titre"
              className="font-cinzel font-black uppercase"
              style={{ fontSize: 'clamp(1.4rem, 4.4vw, 2.5rem)', lineHeight: 1.1, color: '#FFFFFF' }}
            >
              Fais partie des premiers à entrer
            </h2>
            <p
              className="mx-auto mt-6 max-w-2xl font-inter"
              style={{ fontSize: 'clamp(0.95rem, 2.2vw, 1.06rem)', lineHeight: 1.8, color: '#C7CEDB' }}
            >
              Du 02 août jusqu’au lancement officiel d’octobre, les premiers membres découvriront La
              Citadelle, commenceront leur parcours et contribueront par leurs retours à améliorer
              cette nouvelle maison digitale.
            </p>
            <Link
              href={ctaHref}
              onClick={() => events.ctaClick('ouverture_premiers_membres')}
              className="btn-gold-cinematic group mt-9"
              style={{ padding: '15px 34px' }}
            >
              Je veux faire partie des premiers
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ 8 · VERSET CENTRAL ══════════════════ */}
      <section
        className="relative overflow-hidden px-4 py-24 sm:px-6 md:py-36"
        aria-label="Apocalypse 3:8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] max-w-[140vw] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(212,175,110,0.14) 0%, transparent 68%)',
            filter: 'blur(30px)',
          }}
        />
        <figure className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <blockquote
              className="font-cormorant italic"
              style={{
                fontSize: 'clamp(1.45rem, 5vw, 2.9rem)',
                lineHeight: 1.45,
                color: '#FFFFFF',
                textWrap: 'balance',
              }}
            >
              « Voici, j’ai mis devant toi une porte ouverte, que personne ne peut fermer. »
            </blockquote>
            <span
              aria-hidden
              className="mx-auto mt-8 block h-px w-16"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,110,0.7), transparent)' }}
            />
            <figcaption
              className="mt-5 font-inter font-semibold uppercase"
              style={{ fontSize: 'clamp(0.65rem, 1.9vw, 0.75rem)', letterSpacing: '0.3em', color: '#D4AF6E' }}
            >
              Apocalypse 3:8
            </figcaption>
          </Reveal>
        </figure>
      </section>

      {/* ══════════════════ 9 · APPEL FINAL ══════════════════ */}
      <section className="relative px-4 pb-24 pt-8 sm:px-6 md:pb-32" aria-labelledby="final-titre">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2
              id="final-titre"
              className="font-cinzel font-black uppercase"
              style={{
                fontSize: 'clamp(1.7rem, 5.6vw, 3.2rem)',
                lineHeight: 1.05,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0DCAE 50%, #D4AF6E 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Une porte est ouverte
            </h2>

            <p
              className="mx-auto mt-7 max-w-xl font-inter"
              style={{ fontSize: 'clamp(0.98rem, 2.3vw, 1.1rem)', lineHeight: 1.8, color: '#C7CEDB' }}
            >
              Une nouvelle saison commence.
              <br />
              Entre dans La Citadelle, découvre ton espace et commence ton parcours.
            </p>

            <div className="mt-10 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={ctaHref}
                onClick={() => events.ctaClick('ouverture_final_primary')}
                className="btn-gold-cinematic group w-full sm:w-auto"
                style={{ padding: '16px 36px', fontSize: '0.95rem' }}
              >
                {finalCtaLabel(open)}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>

              <Link
                href={`${OUVERTURE_ROUTES.connexion}?redirect=${encodeURIComponent(OUVERTURE_ROUTES.espaceMembre)}`}
                onClick={() => events.ctaClick('ouverture_final_login')}
                className="btn-glass-cinematic w-full sm:w-auto"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

/* ── Décor du hero ──────────────────────────────────────────────
   Volontairement minimal : un faisceau de lumière descendant, une braise
   dorée et un fondu. Uniquement des dégradés CSS — aucun tracé vectoriel
   à arêtes dures, aucun `mix-blend-mode`, aucun filtre coûteux. Le rendu
   reste net sur mobile et le coût de composition est négligeable.
   ─────────────────────────────────────────────────────────────── */
function HeroBackdrop({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Nappe de lumière descendant du sommet */}
      <div
        className="absolute -top-[18%] left-1/2 h-[720px] w-[170vw] -translate-x-1/2 md:w-[1250px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(240,220,174,0.13) 0%, rgba(212,175,110,0.05) 36%, transparent 70%)',
        }}
      />

      {/* Faisceau central — la porte entrouverte. Respiration très lente. */}
      <motion.div
        className="absolute left-1/2 top-0 h-[68vh] w-[62vw] -translate-x-1/2 md:w-[520px]"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(240,220,174,0.05) 34%, transparent 72%)',
          clipPath: 'polygon(46% 0%, 54% 0%, 100% 100%, 0% 100%)',
          filter: 'blur(26px)',
        }}
        initial={false}
        animate={reduce ? { opacity: 0.85 } : { opacity: [0.7, 1, 0.7] }}
        transition={reduce ? { duration: 0 } : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Braise chaude, à peine perceptible */}
      <div
        className="absolute left-1/2 top-[4%] h-[460px] w-[92vw] -translate-x-1/2 md:w-[720px]"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 0%, rgba(255,140,0,0.09) 0%, transparent 62%)',
        }}
      />

      {/* Vignette douce — recentre le regard sur le titre */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 60% at 50% 42%, transparent 0%, rgba(5,8,22,0.35) 78%, rgba(5,8,22,0.7) 100%)',
        }}
      />

      {/* Fondu vers la section suivante */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{ background: 'linear-gradient(180deg, transparent 0%, #0B1023 100%)' }}
      />
    </div>
  )
}
