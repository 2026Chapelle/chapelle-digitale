'use client'
/**
 * SCÈNE Podcast — covers + parallax dédiés, carte Premium, plateformes réelles.
 * Assets normalisés (PNG, extensions uniques) · motion safe (jamais bloqué invisible).
 */
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Headphones, Play, Pause } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { events } from '@/lib/analytics'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'
import {
  HOME_VIEWPORT,
  HOME_DELAY,
  revealInitial,
  revealVisible,
  revealTransition,
} from '@/lib/home-motion'

type PodEp = {
  id: string
  title: string
  description: string
  cover: string | null
  duration: string
  audioUrl: string | null
}

/** Chemins exacts post-normalisation — formats vérifiés PNG sur disque */
const INSTANT_COVER = '/images/podcast/covers/instant-citadelle-cover.png'
const PREMIUM_COVER = '/images/podcast/covers/transformer-pour-rayonner.png'
const PARALLAX_IMG = '/images/podcast/parallax/podcast-parallax.png'

/** Plateformes — uniquement si URL publique configurée (pas de #). */
const PLATFORMS = [
  { name: 'Spotify', emoji: '🟢', url: process.env.NEXT_PUBLIC_SPOTIFY_URL || '' },
  { name: 'Apple', emoji: '🎵', url: process.env.NEXT_PUBLIC_APPLE_PODCAST_URL || '' },
  { name: 'YouTube', emoji: '▶️', url: process.env.NEXT_PUBLIC_YOUTUBE_URL || '' },
].filter((p) => Boolean(p.url && p.url !== '#'))

function toTrack(ep: PodEp, serie?: string): AudioTrack {
  return {
    id: ep.id,
    titre: ep.title,
    serie: serie || 'Podcast Citadelle',
    duree: ep.duration || '',
    emoji: '🎙️',
    couleur: '#D4AF37',
    audioUrl: ep.audioUrl || undefined,
    coverUrl: ep.cover || INSTANT_COVER,
  }
}

export function PodcastHomeSection() {
  const parallaxRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { toggle, isPlaying } = useAudioPlayer()
  const [episodes, setEpisodes] = useState<PodEp[]>([])
  const [loaded, setLoaded] = useState(false)
  const [parallaxSrc, setParallaxSrc] = useState(PARALLAX_IMG)

  const featured = episodes[0] || null
  const instantEp = episodes.find((e) => e.audioUrl) || featured
  const featuredPlaying = featured ? isPlaying(featured.id) : false
  const instantIsPlaying = instantEp ? isPlaying(instantEp.id) : false
  const featuredCover = featured?.cover || PREMIUM_COVER

  const { scrollYProgress } = useScroll({
    target: parallaxRef,
    offset: ['start end', 'end start'],
  })
  // Parallax léger desktop uniquement (CSS désactive le transform mobile)
  const yImg = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-40, 40])

  useEffect(() => {
    if (IS_DEMO_MODE) {
      setLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('cms_podcasts')
          .select('id, title, description, audio_url, cover_url, duration, published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(12)
        if (cancelled) return
        const mapped: PodEp[] = (data || [])
          .map((p: Record<string, unknown>) => ({
            id: String(p.id),
            title: (p.title as string) || 'Épisode',
            description: ((p.description as string) || '').slice(0, 140),
            cover: (p.cover_url as string) || null,
            duration: (p.duration as string) || '',
            audioUrl: (p.audio_url as string) || null,
          }))
          .filter((p) => p.title)
        setEpisodes(mapped)
      } catch {
        setEpisodes([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function handleListen(ep: PodEp | null, label: string) {
    events.ctaClick(label)
    if (ep?.audioUrl) {
      toggle(toTrack(ep, label.includes('instant') ? "L'Instant Citadelle" : 'Podcast Premium'))
      return
    }
    window.location.href = '/podcast'
  }

  return (
    <section className="section-cinematic !px-0" aria-labelledby="podcast-home-title">
      <div className="container-cinematic max-w-6xl px-4 md:px-8 lg:px-16">
        <motion.p
          initial={revealInitial(reduce, { y: 36 })}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.label)}
          className="section-label-dark justify-center mb-4"
        >
          Podcast
        </motion.p>
        <motion.h2
          id="podcast-home-title"
          initial={revealInitial(reduce)}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.title)}
          className="heading-cinematic-lg text-center mb-4"
        >
          Écoute. Grandis.
          <span className="block text-cinematic-gold">Avance.</span>
        </motion.h2>
        <motion.p
          initial={revealInitial(reduce, { y: 38 })}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.subtitle)}
          className="font-inter text-center text-base md:text-lg max-w-md mx-auto mb-12 md:mb-14"
          style={{ color: 'rgba(245,230,216,0.48)' }}
        >
          Des paroles pour nourrir ta foi, où que tu sois.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-16 md:mb-20">
          {/* L’Instant Citadelle */}
          <motion.div
            initial={revealInitial(reduce, { y: 40, scale: true })}
            whileInView={revealVisible({ scale: true })}
            viewport={HOME_VIEWPORT}
            transition={revealTransition(reduce, HOME_DELAY.card)}
          >
            <button
              type="button"
              onClick={() => handleListen(instantEp, 'podcast_instant_citadelle')}
              className="citadelle-pod-card citadelle-pod-daily group block h-full w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
              aria-label={
                instantEp?.audioUrl
                  ? `Écouter L'Instant Citadelle — ${instantEp.title}`
                  : "Ouvrir les podcasts — L'Instant Citadelle"
              }
            >
              <div className="citadelle-pod-media relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-[#0a0a12]">
                <Image
                  src={INSTANT_COVER}
                  alt="L'Instant Citadelle — couverture"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain object-center"
                  priority={false}
                />
                <span className="absolute bottom-4 left-4 z-[3] inline-flex items-center gap-2 text-xs font-inter tracking-wide text-pearl/85 drop-shadow">
                  <Headphones className="w-3.5 h-3.5 text-gold" aria-hidden />
                  Quotidien
                </span>
              </div>
              <div className="relative z-[3] p-6 md:p-7">
                <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2">
                  L&apos;Instant Citadelle
                </h3>
                <p className="font-inter text-sm leading-relaxed mb-5" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  Un moment court pour nourrir ta foi, chaque jour, où que tu sois.
                </p>
                {instantEp?.duration && (
                  <p className="font-inter text-xs mb-3" style={{ color: 'rgba(212,175,55,0.55)' }}>
                    {instantEp.duration}
                  </p>
                )}
                <span className="citadelle-pod-cta-line inline-flex items-center gap-2 text-sm font-medium text-gold group-hover:gap-3">
                  {instantIsPlaying ? <Pause className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
                  {instantEp?.audioUrl
                    ? instantIsPlaying
                      ? 'Pause'
                      : "Écouter L'Instant Citadelle"
                    : 'Retrouver les podcasts'}
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </span>
              </div>
            </button>
          </motion.div>

          {/* Podcast Premium */}
          <motion.div
            initial={revealInitial(reduce, { y: 40, scale: true })}
            whileInView={revealVisible({ scale: true })}
            viewport={HOME_VIEWPORT}
            transition={revealTransition(reduce, HOME_DELAY.card + HOME_DELAY.cardStep)}
          >
            <div className="citadelle-pod-card citadelle-pod-featured h-full flex flex-col">
              <div className="citadelle-pod-media relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-[#0a0a12]">
                <Image
                  src={featuredCover}
                  alt={featured?.title ? `Podcast Premium — ${featured.title}` : 'Podcast Premium — Transformer pour rayonner'}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain object-center"
                />
                <div
                  className="absolute inset-0 z-[1]"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(30,58,138,0.3) 0%, transparent 50%), linear-gradient(180deg, transparent 35%, rgba(6,6,10,0.75) 100%)',
                  }}
                  aria-hidden
                />
                <span className="citadelle-premium-tag absolute top-4 left-4 z-[3]">PREMIUM</span>
              </div>
              <div className="relative z-[3] p-6 md:p-7 flex flex-col flex-1">
                <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2">
                  Podcast Premium
                </h3>
                <p className="font-inter text-sm leading-relaxed mb-5" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  {loaded && featured?.description
                    ? featured.description
                    : 'Enseignements audio pour avancer pas à pas dans la foi.'}
                </p>

                {PLATFORMS.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5" role="list" aria-label="Écouter sur">
                    {PLATFORMS.map((p) => (
                      <a
                        key={p.name}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => events.ctaClick(`podcast_platform_${p.name.toLowerCase()}`)}
                        className="citadelle-platform-chip inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-full text-xs font-inter font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
                        role="listitem"
                      >
                        <span aria-hidden>{p.emoji}</span>
                        {p.name}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  {featured?.audioUrl && (
                    <button
                      type="button"
                      onClick={() => handleListen(featured, 'podcast_featured')}
                      className="citadelle-pod-cta-line inline-flex items-center justify-center gap-2 text-sm font-medium text-gold min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] rounded-sm"
                      aria-label={featuredPlaying ? 'Pause' : 'Écouter maintenant'}
                    >
                      {featuredPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {featuredPlaying ? 'Pause' : 'Écouter maintenant'}
                    </button>
                  )}
                  <Link
                    href="/podcast"
                    onClick={() => events.ctaClick('podcast_decouvrir')}
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold min-h-[44px] px-5 py-2.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                      border: '1px solid rgba(212,175,55,0.35)',
                      color: '#F5E6A7',
                    }}
                  >
                    Découvrir les podcasts
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Parallax full-bleed — image z-0 · overlay z-10 · contenu z-20 */}
      <div
        ref={parallaxRef}
        className="citadelle-pod-parallax relative w-full left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 z-0 will-change-transform"
          style={reduce ? undefined : { y: yImg }}
          aria-hidden
        >
          <Image
            src={parallaxSrc}
            alt="Personne écoutant un podcast avec casque et smartphone"
            fill
            sizes="100vw"
            className="object-cover object-[center_28%] md:object-[center_32%]"
            quality={90}
            priority={false}
            onError={() => {
              if (parallaxSrc !== INSTANT_COVER) setParallaxSrc(INSTANT_COVER)
            }}
          />
        </motion.div>
        {/* Overlay lisibilité */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, rgba(6,8,16,0.82) 0%, rgba(8,12,28,0.55) 42%, rgba(6,6,10,0.45) 70%, rgba(6,6,10,0.7) 100%), ' +
              'radial-gradient(ellipse at 70% 40%, rgba(212,175,55,0.08), transparent 55%)',
          }}
          aria-hidden
        />
        <motion.div
          className="relative z-20 max-w-2xl mx-auto text-center py-20 md:py-28 px-6"
          initial={revealInitial(reduce)}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.cta)}
        >
          <h3 className="font-cinzel font-bold text-pearl text-3xl md:text-4xl mb-4">Va plus loin.</h3>
          <p
            className="font-inter text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto"
            style={{ color: 'rgba(245,230,216,0.62)' }}
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
