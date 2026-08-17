'use client'
/**
 * SCÈNE Podcast — covers + parallax dédiés, carte Premium, plateformes réelles.
 * Assets normalisés (PNG, extensions uniques) · motion safe (jamais bloqué invisible).
 */
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Headphones, Play, Pause, Lock } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { events } from '@/lib/analytics'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'
import { PremiumBadge } from '@/components/podcast/PremiumBadge'
import type { PodcastAccessLevel } from '@/lib/podcast/editorial'
import {
  HOME_VIEWPORT,
  HOME_DELAY,
  revealInitial,
  revealVisible,
  revealTransition,
} from '@/lib/home-motion'
import {
  resolvePodcastHomeSlots,
  parsePodcastSlotConfig,
  type PodcastHomeSlotConfig,
} from '@/lib/podcast/home-slots'
import { fetchPublishedPodcasts } from '@/lib/podcast/fetch-episodes'
import { normalizePodcastEditorial } from '@/lib/podcast/editorial'
import { resolvePlayback, isResolved } from '@/lib/podcast/playback-client'

type PodEp = {
  id: string
  title: string
  description: string
  cover: string | null
  duration: string
  /** PODCAST-SEC : signal sûr (l'URL réelle est résolue au clic côté serveur). */
  hasAudio: boolean
  serie: string | null
  destinations: string[]
  /** PODCAST-MEDIA-REDESIGN : niveau d'accès éditorial → disjonction Instant/Premium par NIVEAU. */
  accessLevel: PodcastAccessLevel
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

// PODCAST-SEC : la piste reçoit l'URL RÉSOLUE côté serveur (jamais issue du client).
function toTrack(ep: PodEp, playbackUrl: string, serie?: string): AudioTrack {
  return {
    id: ep.id,
    titre: ep.title,
    // Émission réelle (PODCAST-0B) si renseignée, sinon libellé d'emplacement.
    serie: ep.serie || serie || 'Podcast Citadelle',
    duree: ep.duration || '',
    emoji: '🎙️',
    couleur: '#D4AF37',
    audioUrl: playbackUrl,
    coverUrl: ep.cover || INSTANT_COVER,
  }
}

export function PodcastHomeSection() {
  const parallaxRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { play, pause, resume, isPlaying, track } = useAudioPlayer()
  const [episodes, setEpisodes] = useState<PodEp[]>([])
  const [slotConfig, setSlotConfig] = useState<PodcastHomeSlotConfig | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [parallaxSrc, setParallaxSrc] = useState(PARALLAX_IMG)

  // PODCAST-0A — deux emplacements EXPLICITES et DISJOINTS (fin de la duplication).
  // Pilotés par le bloc d'accueil `podcast` (data.instant_ids / data.premium_ids) ;
  // repli déterministe garantissant deux épisodes distincts même sans config admin.
  const { instant: instantEp, premium: featured } = resolvePodcastHomeSlots(episodes, slotConfig)
  const instantIsPlaying = instantEp ? isPlaying(instantEp.id) : false
  const featuredCover = featured?.cover || PREMIUM_COVER

  // « Séries & épisodes à la une » — bande compacte (3-4) sous les deux cartes.
  // Dérivée des épisodes déjà chargés, en excluant les deux cartes (zéro doublon).
  // Ne fabrique aucune donnée : masquée si rien à montrer.
  const highlightStripe = episodes
    .filter((e) => e.id !== instantEp?.id && e.id !== featured?.id)
    .slice(0, 4)

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
        // Épisodes + config des emplacements lus EN PARALLÈLE (pas de waterfall).
        // Lecture résiliente : colonnes éditoriales si présentes, repli base sinon.
        const [{ rows: podcastRows }, { data: podcastBlock }] = await Promise.all([
          fetchPublishedPodcasts((cols) =>
            supabase
              .from('cms_podcasts')
              .select(cols)
              .eq('status', 'published')
              .order('published_at', { ascending: false })
              .limit(12),
          ),
          supabase
            .from('cms_homepage_blocks')
            .select('data')
            .eq('block_key', 'podcast')
            .maybeSingle(),
        ])
        if (cancelled) return
        const mapped: PodEp[] = podcastRows
          .map((p) => {
            const ed = normalizePodcastEditorial(p)
            return {
              id: String(p.id),
              title: (p.title as string) || 'Épisode',
              description: ((p.description as string) || '').slice(0, 140),
              cover: (p.cover_url as string) || null,
              duration: (p.duration as string) || '',
              // PODCAST-SEC : signal sûr ; legacy/repli sans colonne → optimiste true.
              hasAudio: p.has_audio !== false,
              serie: ed.serie,
              destinations: ed.destinations,
              // PODCAST-MEDIA-REDESIGN : porté jusqu'au résolveur (disjonction par niveau).
              accessLevel: ed.accessLevel,
            }
          })
          .filter((p) => p.title)
        setEpisodes(mapped)
        setSlotConfig(parsePodcastSlotConfig((podcastBlock as { data?: unknown } | null)?.data))
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

  // PODCAST-SEC : lecture résolue côté serveur. Public → jouable (visiteur inclus) ;
  // réservé (membre/premium) → renvoi au catalogue /podcast (connexion). Jamais d'URL client.
  async function handleListen(ep: PodEp | null, label: string) {
    events.ctaClick(label)
    if (!ep) { window.location.href = '/podcast'; return }
    if (track?.id === ep.id) { isPlaying(ep.id) ? pause() : resume(); return }
    const res = await resolvePlayback(ep.id)
    if (isResolved(res)) {
      play(toTrack(ep, res.url, label.includes('instant') ? "L'Instant Citadelle" : 'Podcast Premium'))
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
                instantEp?.hasAudio
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
                {/* Badge « Gratuit » masqué si (cas dégénéré catalogue 100% premium) l'épisode
                    résolu pour l'Instant est en réalité premium → jamais de faux « Gratuit ». */}
                {instantEp?.accessLevel !== 'premium' && (
                  <span
                    className="absolute bottom-4 left-4 z-[3] inline-flex items-center gap-1.5 text-[10px] font-inter font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{ background: 'rgba(46,160,110,0.18)', color: '#8FE3B8', border: '1px solid rgba(46,160,110,0.4)' }}
                  >
                    <Headphones className="w-3 h-3" aria-hidden />
                    Gratuit
                  </span>
                )}
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
                  {instantEp?.hasAudio
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
                <PremiumBadge className="absolute top-4 left-4 z-[3] !text-[10px] !px-2 !py-1" />
                {/* Verrou visible — compréhensible sans couleur (icône + libellé). */}
                <span className="absolute top-4 right-4 z-[3] inline-flex items-center gap-1 text-[10px] font-inter font-semibold text-pearl/80 bg-black/40 backdrop-blur px-2 py-1 rounded-full">
                  <Lock className="w-3 h-3" aria-hidden />
                  Réservé
                </span>
              </div>
              <div className="relative z-[3] p-6 md:p-7 flex flex-col flex-1">
                <h3 className="font-cinzel font-bold text-pearl text-xl md:text-2xl mb-2">
                  Podcast Premium
                </h3>
                <p className="font-inter text-sm leading-relaxed mb-3" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  {loaded && featured?.description
                    ? featured.description
                    : 'Des enseignements audio exclusifs pour aller plus loin dans la foi.'}
                </p>
                {/* PODCAST-MEDIA-REDESIGN : contrôle d'accès RÉEL — jamais de lecture inline
                    du Premium sur l'accueil (l'accueil ne connaît pas le droit du membre).
                    La lecture autorisée se fait sur /podcast, où le gate serveur (fail-closed)
                    et l'état Premium réel du membre sont chargés. Ici : verrou + invitation. */}
                <p className="font-inter text-xs mb-5 inline-flex items-center gap-1.5" style={{ color: 'rgba(212,175,55,0.75)' }}>
                  <Lock className="w-3.5 h-3.5" aria-hidden />
                  Contenu réservé aux membres Premium
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

                <div className="mt-auto">
                  <Link
                    href="/podcast"
                    onClick={() => events.ctaClick('podcast_decouvrir_premium')}
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold min-h-[44px] px-5 py-2.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                      border: '1px solid rgba(212,175,55,0.35)',
                      color: '#F5E6A7',
                    }}
                  >
                    Découvrir les podcasts Premium
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* SÉRIES & ÉPISODES À LA UNE — bande compacte (max 4), conduit vers /podcast.
            Masquée si rien à montrer (aucune donnée fabriquée). Scroll horizontal mobile. */}
        {highlightStripe.length > 0 && (
          <motion.div
            initial={revealInitial(reduce, { y: 32 })}
            whileInView={revealVisible()}
            viewport={HOME_VIEWPORT}
            transition={revealTransition(reduce, HOME_DELAY.card)}
            className="-mt-6 md:-mt-8 mb-16 md:mb-20"
          >
            <p className="section-label-dark justify-center mb-6">Séries &amp; épisodes à la une</p>
            <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none md:grid md:grid-cols-4 md:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              {highlightStripe.map((ep) => (
                <li key={ep.id} className="snap-start shrink-0 w-40 sm:w-48 md:w-auto">
                  <Link
                    href="/podcast"
                    onClick={() => events.ctaClick('podcast_highlight')}
                    className="group block rounded-xl overflow-hidden border border-white/8 bg-white/[0.02] hover:border-gold/25 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#0a0a12]">
                      {/* Cohérence : un épisode premium reste identifiable dans la bande. */}
                      {ep.accessLevel === 'premium' && (
                        <PremiumBadge className="absolute top-2 left-2 z-[2] !text-[9px]" />
                      )}
                      {ep.cover ? (
                        <Image
                          src={ep.cover}
                          alt={ep.serie ? `${ep.serie} — ${ep.title}` : ep.title}
                          fill
                          sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 220px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(300px 200px at 50% 40%, rgba(212,175,55,0.18), transparent 60%), linear-gradient(120deg, #0d0918, #050308)' }}>
                          <Headphones className="w-7 h-7 text-gold/40" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {ep.serie && (
                        <p className="font-inter text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>
                          {ep.serie}
                        </p>
                      )}
                      <h4 className="font-cinzel font-bold text-pearl text-sm leading-snug line-clamp-2">{ep.title}</h4>
                      {ep.duration && (
                        <p className="font-inter text-[11px] mt-1" style={{ color: 'rgba(245,230,216,0.4)' }}>{ep.duration}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
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
