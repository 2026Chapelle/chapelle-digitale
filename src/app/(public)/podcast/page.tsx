'use client'
/**
 * PODCAST-1 — « LA VOIX DU ROYAUME ». Expérience audio éditoriale (hero administrable,
 * À la une / Nouveautés / Émissions dynamiques / catalogue), bâtie sur les acquis 0-A/0-B :
 * modèle éditorial (serie/access_level/destinations/is_featured), fetch résilient, verrou
 * visiteur (JoinToListenModal), et le player global persistant (AudioPlayerBar, micro-cover).
 *
 * Sections préparées mais MASQUÉES faute de données réelles (lots ultérieurs) :
 *   • « Continuer l'écoute »  → nécessite une persistance audio_progress (inexistante).
 *   • « Playlists de La Citadelle » / « Mes playlists » → nécessitent un modèle playlists
 *     (audio_playlists / items) inexistant. Aucune fausse donnée n'est fabriquée.
 */
import { useEffect, useRef, useState } from 'react'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { JoinToListenModal } from '@/components/podcast/JoinToListenModal'
import { PodcastHero } from '@/components/podcast/PodcastHero'
import { EpisodeRail, type RailEpisode } from '@/components/podcast/EpisodeRail'
import { EmissionsRail } from '@/components/podcast/EmissionsRail'
import { AllEpisodesSection, type CatalogEpisode } from '@/components/podcast/AllEpisodesSection'
import { fetchPublishedPodcasts } from '@/lib/podcast/fetch-episodes'
import { normalizePodcastEditorial } from '@/lib/podcast/editorial'
import {
  parsePodcastHero, selectFeatured, selectNewReleases, buildEmissions, listSeriesFrom,
  type VoixEpisode, type PodcastHeroConfig,
} from '@/lib/podcast/sections'
import { ContinueListening, type ContinueCard } from '@/components/podcast/ContinueListening'
import { PlaylistsSections } from '@/components/podcast/PlaylistsSections'
import {
  fetchMyProgress, buildContinueListening, resumePositionSeconds, type AudioProgressRow,
} from '@/lib/podcast/progress'
import { resolvePlayback, isResolved } from '@/lib/podcast/playback-client'
import type { PlaybackReason } from '@/lib/podcast/playback-access'
import { PODCAST_PREMIUM_ENTITLEMENT_KEY } from '@/lib/podcast/entitlement'
import { normalizePremiumOffer, premiumDeniedNotice, type PremiumOffer, type PremiumNotice } from '@/lib/podcast/premium-offer'

// PODCAST-4 : contexte d'origine d'une lecture (analytics), transporté sur la piste.
interface PlayContext { sourceContext?: string; playlistId?: string }

// PODCAST-SEC : la piste reçoit l'URL RÉSOLUE côté serveur (jamais issue du client).
function toTrack(ep: VoixEpisode, playbackUrl: string, startAt?: number, ctx?: PlayContext): AudioTrack {
  return {
    id: ep.id,
    titre: ep.title,
    serie: ep.serie || 'La Voix du Royaume',
    duree: ep.duration || '',
    emoji: '🎙️',
    couleur: '#D4AF37',
    audioUrl: playbackUrl,
    coverUrl: ep.cover || undefined,
    startAt: startAt && startAt > 0 ? startAt : undefined,   // PODCAST-2 : reprise
    sourceContext: ctx?.sourceContext,                        // PODCAST-4 : analytics
    playlistId: ctx?.playlistId,
  }
}

/** Message d'invite selon la raison de refus serveur (jamais d'URL média exposée).
 *  Pour un refus premium, un CTA d'achat n'est ajouté QUE si une offre réelle existe. */
function noticeFor(reason: PlaybackReason, premiumOffer: PremiumOffer | null): PremiumNotice {
  switch (reason) {
    case 'member_only':
      return { title: 'Réservé aux membres', message: "Cet épisode est réservé aux membres de la Citadelle. Rejoins la communauté pour l'écouter." }
    case 'premium_denied':
      return premiumDeniedNotice(premiumOffer)
    case 'no_media':
      return { title: 'Bientôt disponible', message: "L'audio de cet épisode arrive bientôt." }
    default:
      return { title: 'Indisponible', message: "Cet épisode n'est pas disponible pour le moment." }
  }
}

export default function PodcastPage() {
  const { play, pause, resume, isPlaying, track } = useAudioPlayer()
  const { user, isDemo } = useAuth()
  const canPlay = Boolean(user) || isDemo

  const [episodes, setEpisodes] = useState<VoixEpisode[]>([])
  const [hero, setHero] = useState<PodcastHeroConfig | null>(null)
  const [joinFor, setJoinFor] = useState<VoixEpisode | null>(null)
  const [notice, setNotice] = useState<PremiumNotice | null>(null)
  const [premiumOffer, setPremiumOffer] = useState<PremiumOffer | null>(null)
  const [selectedSerie, setSelectedSerie] = useState('all')
  const [progressRows, setProgressRows] = useState<AudioProgressRow[]>([])   // PODCAST-2 : progression membre
  const catalogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const [{ rows }, heroRes] = await Promise.all([
          fetchPublishedPodcasts((cols) =>
            supabase.from('cms_podcasts').select(cols)
              .eq('status', 'published').order('published_at', { ascending: false }).limit(200)),
          supabase.from('cms_homepage_blocks').select('*').eq('block_key', 'podcast_hero').maybeSingle(),
        ])
        if (cancelled) return
        const mapped: VoixEpisode[] = rows.map((p) => {
          const ed = normalizePodcastEditorial(p)
          return {
            id: String(p.id),
            title: (p.title as string) || 'Épisode',
            description: ((p.description as string) || '').slice(0, 160),
            cover: (p.cover_url as string) || null,
            duration: (p.duration as string) || '',
            // PODCAST-SEC : signal sûr (l'URL réelle n'est plus lue côté client).
            // Legacy/repli sans colonne → optimiste true ; le serveur reste l'autorité.
            hasAudio: p.has_audio !== false,
            publishedAt: (p.published_at as string) || null,
            serie: ed.serie,
            accessLevel: ed.accessLevel,
            destinations: ed.destinations,
            isFeatured: ed.isFeatured,
          }
        }).filter((e) => e.title)
        setEpisodes(mapped)
        setHero(parsePodcastHero((heroRes as { data?: Record<string, unknown> | null })?.data ?? null))
      } catch { /* liste vide */ }
    })()
    return () => { cancelled = true }
  }, [])

  // PODCAST-2 : progression du membre (RLS → uniquement ses lignes). Visiteur = aucune.
  useEffect(() => {
    if (IS_DEMO_MODE || !user) { setProgressRows([]); return }
    let cancelled = false
    ;(async () => {
      const rows = await fetchMyProgress(supabase)
      if (!cancelled) setProgressRows(rows)
    })()
    return () => { cancelled = true }
  }, [user])

  // PODCAST-5C : offre Premium réelle (produit marketplace mappé, actif, avec lien d'achat).
  // Lu via RLS publique (actif=true). Absente ⇒ aucun CTA (message neutre, jamais de faux bouton).
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('marketplace_products')
          .select('lien_achat, titre')
          .eq('entitlement_key', PODCAST_PREMIUM_ENTITLEMENT_KEY)
          .eq('actif', true)
          .limit(1)
          .maybeSingle()
        if (!cancelled) setPremiumOffer(normalizePremiumOffer(data as { lien_achat?: string | null; titre?: string | null } | null))
      } catch { /* pas d'offre → CTA neutre */ }
    })()
    return () => { cancelled = true }
  }, [])

  const progressById = new Map(progressRows.map((r) => [r.podcast_id, r]))

  // Interception lecture (PODCAST-SEC) : visiteur non connecté → invitation (acquis 0-A) ;
  // sinon on demande au SERVEUR l'URL autorisée (le client ne connaît plus l'URL média).
  const requestPlay = async (ep: VoixEpisode, ctx: PlayContext = {}) => {
    if (!canPlay) { setJoinFor(ep); return }
    // Même épisode déjà actif → simple pause/reprise (pas de nouvelle résolution).
    if (track?.id === ep.id) { isPlaying(ep.id) ? pause() : resume(); return }
    const res = await resolvePlayback(ep.id)
    if (isResolved(res)) {
      const startAt = user ? resumePositionSeconds(progressById.get(ep.id)) : undefined
      play(toTrack(ep, res.url, startAt, { sourceContext: ctx.sourceContext ?? 'catalog', playlistId: ctx.playlistId }))
      return
    }
    if (res.error === 'auth_required') setJoinFor(ep)
    else setNotice(noticeFor(res.error, premiumOffer))
  }
  const onPlayRail = (ep: RailEpisode, ctx: PlayContext = {}) => requestPlay(episodes.find((e) => e.id === ep.id) || (ep as VoixEpisode), ctx)
  const onPlayCatalog = (ep: CatalogEpisode) => requestPlay(episodes.find((e) => e.id === ep.id) || (ep as VoixEpisode), { sourceContext: 'catalog' })

  // Sections dérivées (pures, 0-B).
  const featured = selectFeatured(episodes)
  const nouveautes = selectNewReleases(episodes, { excludeIds: featured.map((e) => e.id), limit: 12 })
  const emissions = buildEmissions(episodes)
  const series = listSeriesFrom(episodes)

  // PODCAST-2 : « Continuer l'écoute » (membre uniquement ; strictement dérivé des données réelles).
  const continueItems: ContinueCard[] = user
    ? buildContinueListening(episodes, progressRows).map((it) => ({
        id: it.episode.id, title: it.episode.title, cover: it.episode.cover, serie: it.episode.serie,
        duration: it.episode.duration, accessLevel: it.episode.accessLevel, audioUrl: it.episode.audioUrl,
        positionSeconds: it.positionSeconds, percent: it.percent, remainingSeconds: it.remainingSeconds,
      }))
    : []

  const toRail = (list: VoixEpisode[]): RailEpisode[] =>
    list.map((e) => ({ id: e.id, title: e.title, cover: e.cover, serie: e.serie, duration: e.duration, accessLevel: e.accessLevel, audioUrl: e.audioUrl }))
  const toCatalog = (list: VoixEpisode[]): CatalogEpisode[] =>
    list.map((e) => ({ id: e.id, title: e.title, cover: e.cover, serie: e.serie, duration: e.duration, accessLevel: e.accessLevel, audioUrl: e.audioUrl, date: (e.publishedAt || '').slice(0, 10) }))

  const selectEmission = (serie: string) => {
    setSelectedSerie(serie)
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen pb-40 pt-24 md:pt-28">
      <div className="max-w-6xl mx-auto">
        {/* Titre identité */}
        <header className="px-4 md:px-0 mb-8 md:mb-10">
          <h1 className="font-cinzel font-bold text-cinematic-gold text-3xl md:text-5xl leading-tight">
            La Voix du Royaume
          </h1>
          <p className="font-inter text-sm md:text-base mt-2" style={{ color: 'rgba(245,230,216,0.55)' }}>
            Podcasts &amp; enseignements audio
          </p>
        </header>

        {/* À LA UNE / EVENT ADMINISTRABLE */}
        <PodcastHero hero={hero} />

        {/* Continuer l'écoute (PODCAST-2) — membre + données réelles audio_progress uniquement.
            Masqué pour les visiteurs et si aucune écoute en cours. Aucune progression simulée. */}
        {canPlay && continueItems.length > 0 && (
          <ContinueListening
            items={continueItems}
            isPlaying={isPlaying}
            onResume={(ep) => requestPlay(episodes.find((e) => e.id === ep.id) || (ep as unknown as VoixEpisode), { sourceContext: 'continue_listening' })}
          />
        )}

        {/* À la une (is_featured) */}
        <EpisodeRail title="À la une" eyebrow="Sélection éditoriale" episodes={toRail(featured)} onPlay={(ep) => onPlayRail(ep, { sourceContext: 'featured' })} isPlaying={isPlaying} />

        {/* Nouveautés (published_at DESC, hors featured) */}
        <EpisodeRail title="Nouveautés" eyebrow="Derniers épisodes" episodes={toRail(nouveautes)} onPlay={(ep) => onPlayRail(ep, { sourceContext: 'new_release' })} isPlaying={isPlaying} />

        {/* Émissions (serie dynamique) */}
        <EmissionsRail emissions={emissions} onSelect={selectEmission} />

        {/* Playlists de La Citadelle (officielles) + Mes playlists (membre) — PODCAST-3.
            Officielles visibles selon RLS (visiteur inclus si publiques) ; lecture verrouillée
            pour le visiteur (JoinToListenModal). Une playlist ne déverrouille aucun access_level. */}
        <PlaylistsSections episodes={episodes} userId={user?.id ?? null} canPlay={canPlay} onPlayEpisode={requestPlay} />

        {/* Tous les épisodes */}
        <div ref={catalogRef} className="scroll-mt-24">
          <AllEpisodesSection
            episodes={toCatalog(episodes)}
            series={series}
            selectedSerie={selectedSerie}
            onSelectedSerieChange={setSelectedSerie}
            onPlay={onPlayCatalog}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* Verrou lecture visiteur — catalogue visible, écoute réservée aux membres (acquis 0-A). */}
      <JoinToListenModal open={!!joinFor} onClose={() => setJoinFor(null)} episodeTitle={joinFor?.title} />

      {/* PODCAST-SEC — refus serveur (membre / premium / indisponible) : invite discrète, jamais d'URL. */}
      {notice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={notice.title}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          onClick={() => setNotice(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
          <div
            className="relative z-[1] w-full max-w-sm rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[#0c0c14] p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-cinzel font-bold text-cinematic-gold text-xl mb-2">{notice.title}</h3>
            <p className="font-inter text-sm mb-5" style={{ color: 'rgba(245,230,216,0.7)' }}>{notice.message}</p>
            {notice.ctaUrl ? (
              <div className="flex flex-col gap-2">
                <a
                  href={notice.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setNotice(null)}
                  className="btn-gold-cinematic inline-flex items-center justify-center"
                  style={{ padding: '10px 22px', fontSize: '0.9rem' }}
                >
                  {notice.ctaLabel || 'Découvrir le Premium'}
                </a>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="text-xs font-inter"
                  style={{ color: 'rgba(245,230,216,0.5)' }}
                >
                  Plus tard
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="btn-gold-cinematic inline-flex"
                style={{ padding: '10px 22px', fontSize: '0.9rem' }}
              >
                J&apos;ai compris
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
