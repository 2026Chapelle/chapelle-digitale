'use client'
/**
 * SCÈNE Podcast homepage — données réelles cms_podcasts uniquement.
 * Deux colonnes + bandeau parallax. Routes réelles : /podcast
 */
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Headphones, Play } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { events } from '@/lib/analytics'
import { HOME_DUR, HOME_EASE, HOME_Y } from '@/lib/home-motion'

type PodEp = {
  id: string
  title: string
  description: string
  cover: string | null
  duration: string
  isPremium: boolean
}

/** Visuel humain réel existant (pas de photo casque dédiée dans les assets). */
const PARALLAX_IMG = {
  src: '/images/prayers/prayer-family.jpg',
  alt: 'Communauté en prière — présence et chaleur',
}

const FALLBACK_COVER = '/images/hero/podcast.svg'

export function PodcastHomeSection() {
  const ref = useRef<HTMLElement>(null)
  const parallaxRef = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px', amount: 0.12 })
  const reduce = useReducedMotion()
  const [featured, setFeatured] = useState<PodEp | null>(null)
  const [loaded, setLoaded] = useState(false)

  const { scrollYProgress } = useScroll({
    target: parallaxRef,
    offset: ['start end', 'end start'],
  })
  const yImg = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? [0, 0] : [-32, 32]
  )

  useEffect(() => {
    if (IS_DEMO_MODE) {
      setLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        // Colonnes sûres (page /podcast) — pas d’invention de statut premium
        const { data } = await supabase
          .from('cms_podcasts')
          .select('id, title, description, audio_url, cover_url, duration, published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(12)
        if (cancelled) return
        const rows = (data || []).filter((p: Record<string, unknown>) => p.audio_url || p.title)
        const mapped: PodEp[] = rows.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          title: (p.title as string) || 'Épisode',
          description: ((p.description as string) || '').slice(0, 140),
          cover: (p.cover_url as string) || null,
          duration: (p.duration as string) || '',
          isPremium: false,
        }))
        setFeatured(mapped[0] || null)
      } catch {
        setFeatured(null)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section ref={ref} className="section-cinematic" aria-labelledby="podcast-home-title">
      <div className="container-cinematic max-w-6xl">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: HOME_Y - 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, ease: HOME_EASE }}
          className="section-label-dark justify-center mb-4"
        >
          Podcast
        </motion.p>
        <motion.h2
          id="podcast-home-title"
          initial={reduce ? false : { opacity: 0, y: HOME_Y }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, delay: reduce ? 0 : 0.06, ease: HOME_EASE }}
          className="heading-cinematic-lg text-center mb-4"
        >
          Écoute. Grandis.
          <span className="block text-cinematic-gold">Avance.</span>
        </motion.h2>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: HOME_Y - 4 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, delay: reduce ? 0 : 0.12, ease: HOME_EASE }}
          className="font-inter text-center text-base md:text-lg max-w-md mx-auto mb-12 md:mb-14"
          style={{ color: 'rgba(245,230,216,0.48)' }}
        >
          Des paroles pour nourrir ta foi, où que tu sois.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-14 md:mb-20">
          {/* Colonne 1 — L’Instant Citadelle (éditorial quotidien) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: HOME_Y }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: HOME_DUR, delay: reduce ? 0 : 0.18, ease: HOME_EASE }}
          >
            <Link
              href="/podcast"
              onClick={() => events.ctaClick('podcast_instant_citadelle')}
              className="citadelle-pod-card citadelle-pod-daily group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
              aria-label="Écouter L’Instant Citadelle — ouvrir les podcasts"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-t-[1.75rem]">
                <Image
                  src={featured?.cover || FALLBACK_COVER}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 30%, rgba(6,6,10,0.75) 100%)',
                  }}
                  aria-hidden
                />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 text-xs font-inter tracking-wide text-pearl/80">
                  <Headphones className="w-3.5 h-3.5 text-gold" aria-hidden />
                  Quotidien
                </span>
              </div>
              <div className="p-6 md:p-7">
                <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2">
                  L&apos;Instant Citadelle
                </h3>
                <p className="font-inter text-sm leading-relaxed mb-5" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  Un moment court pour nourrir ta foi, chaque jour, où que tu sois.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gold group-hover:gap-3 transition-all">
                  <Play className="w-4 h-4" aria-hidden />
                  Écouter L&apos;Instant Citadelle
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Colonne 2 — épisode en vedette (réel) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: HOME_Y }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: HOME_DUR, delay: reduce ? 0 : 0.26, ease: HOME_EASE }}
          >
            <Link
              href="/podcast"
              onClick={() => events.ctaClick('podcast_featured')}
              className="citadelle-pod-card citadelle-pod-featured group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
              aria-label={
                featured
                  ? `${featured.title} — Écouter maintenant`
                  : 'Découvrir les podcasts Citadelle'
              }
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-t-[1.75rem]">
                <Image
                  src={featured?.cover || FALLBACK_COVER}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(30,58,138,0.35) 0%, transparent 50%), linear-gradient(180deg, transparent 25%, rgba(6,6,10,0.8) 100%)',
                  }}
                  aria-hidden
                />
                {featured?.isPremium && (
                  <span className="absolute top-4 right-4 text-[10px] font-inter font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(212,175,55,0.2)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.35)' }}
                  >
                    Premium
                  </span>
                )}
              </div>
              <div className="p-6 md:p-7">
                <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2">
                  {loaded && featured ? featured.title : 'Podcasts Citadelle'}
                </h3>
                <p className="font-inter text-sm leading-relaxed mb-3" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  {loaded && featured?.description
                    ? featured.description
                    : 'Enseignements audio pour avancer pas à pas dans la foi.'}
                </p>
                {featured?.duration ? (
                  <p className="font-inter text-xs mb-4" style={{ color: 'rgba(212,175,55,0.55)' }}>
                    {featured.duration}
                  </p>
                ) : (
                  <div className="mb-4" />
                )}
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gold group-hover:gap-3 transition-all">
                  <Play className="w-4 h-4" aria-hidden />
                  {featured ? 'Écouter maintenant' : 'Découvrir les podcasts'}
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </span>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scène parallax */}
      <div ref={parallaxRef} className="citadelle-pod-parallax relative w-full overflow-hidden">
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={reduce ? undefined : { y: yImg }}
          aria-hidden
        >
          <Image
            src={PARALLAX_IMG.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center scale-110"
            quality={85}
          />
        </motion.div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,6,10,0.55) 0%, rgba(6,6,10,0.72) 50%, rgba(6,6,10,0.88) 100%)',
          }}
          aria-hidden
        />
        <motion.div
          className="relative z-10 container-cinematic max-w-2xl mx-auto text-center py-16 md:py-24 px-6"
          initial={reduce ? false : { opacity: 0, y: HOME_Y }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: HOME_DUR, delay: reduce ? 0 : 0.2, ease: HOME_EASE }}
        >
          <h3 className="font-cinzel font-bold text-pearl text-3xl md:text-4xl mb-4">
            Va plus loin.
          </h3>
          <p
            className="font-inter text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto"
            style={{ color: 'rgba(245,230,216,0.55)' }}
          >
            Retrouve tous tes podcasts, enseignements et séries audio dans Citadelle.
          </p>
          <Link
            href="/podcast"
            onClick={() => events.ctaClick('podcast_tous')}
            className="btn-gold-cinematic group inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
            style={{ padding: '14px 28px', fontSize: '0.92rem' }}
          >
            Retrouver tous les podcasts
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
