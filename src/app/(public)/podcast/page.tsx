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
import {
  fetchMyProgress, buildContinueListening, resumePositionSeconds, type AudioProgressRow,
} from '@/lib/podcast/progress'

function toTrack(ep: VoixEpisode, startAt?: number): AudioTrack {
  return {
    id: ep.id,
    titre: ep.title,
    serie: ep.serie || 'La Voix du Royaume',
    duree: ep.duration || '',
    emoji: '🎙️',
    couleur: '#D4AF37',
    audioUrl: ep.audioUrl || undefined,
    coverUrl: ep.cover || undefined,
    startAt: startAt && startAt > 0 ? startAt : undefined,   // PODCAST-2 : reprise
  }
}

export default function PodcastPage() {
  const { toggle, isPlaying } = useAudioPlayer()
  const { user, isDemo } = useAuth()
  const canPlay = Boolean(user) || isDemo

  const [episodes, setEpisodes] = useState<VoixEpisode[]>([])
  const [hero, setHero] = useState<PodcastHeroConfig | null>(null)
  const [joinFor, setJoinFor] = useState<VoixEpisode | null>(null)
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
            audioUrl: (p.audio_url as string) || null,
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

  const progressById = new Map(progressRows.map((r) => [r.podcast_id, r]))

  // Interception lecture : membre → lecture réelle (avec REPRISE) ; visiteur → invitation (acquis 0-A).
  const requestPlay = (ep: VoixEpisode) => {
    if (canPlay) {
      const startAt = user ? resumePositionSeconds(progressById.get(ep.id)) : undefined
      toggle(toTrack(ep, startAt))
    } else setJoinFor(ep)
  }
  const onPlayRail = (ep: RailEpisode) => requestPlay(episodes.find((e) => e.id === ep.id) || (ep as VoixEpisode))
  const onPlayCatalog = (ep: CatalogEpisode) => requestPlay(episodes.find((e) => e.id === ep.id) || (ep as VoixEpisode))

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
            onResume={(ep) => requestPlay(episodes.find((e) => e.id === ep.id) || (ep as unknown as VoixEpisode))}
          />
        )}

        {/* À la une (is_featured) */}
        <EpisodeRail title="À la une" eyebrow="Sélection éditoriale" episodes={toRail(featured)} onPlay={onPlayRail} isPlaying={isPlaying} />

        {/* Nouveautés (published_at DESC, hors featured) */}
        <EpisodeRail title="Nouveautés" eyebrow="Derniers épisodes" episodes={toRail(nouveautes)} onPlay={onPlayRail} isPlaying={isPlaying} />

        {/* Émissions (serie dynamique) */}
        <EmissionsRail emissions={emissions} onSelect={selectEmission} />

        {/* Playlists de La Citadelle / Mes playlists — RÉSERVÉ : aucun modèle playlists en base
            (audio_playlists / items). Sections masquées ; « + Créer une playlist » non affiché
            tant que le backend n'existe pas. Lot ultérieur. */}

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
    </div>
  )
}
