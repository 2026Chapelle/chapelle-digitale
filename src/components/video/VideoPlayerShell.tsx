'use client'
/**
 * VideoPlayerShell — lecteur vidéo générique (YouTube ou fichier direct).
 * Purement présentationnel : reçoit une source déjà résolue (`resolveVideoSource`),
 * aucun appel réseau/Supabase ici. YouTube : façade « clic pour lire » (poster +
 * bouton) puis iframe, pour éviter de charger l'iframe avant intention de lecture.
 * Fichier (storage/externe) : <video> natif. Aucune source : état vide discret.
 */
import { useState } from 'react'
import { Play, VideoOff } from 'lucide-react'
import type { ResolvedVideoSource } from '@/lib/video'

export interface VideoPlayerShellProps {
  source: ResolvedVideoSource
  title: string
  poster?: string | null
  autoPlay?: boolean
  className?: string
}

/** Ajoute autoplay=1 à une URL d'embed YouTube (utilisé une fois la lecture déclenchée). */
function withAutoplay(embedUrl: string): string {
  try {
    const u = new URL(embedUrl)
    u.searchParams.set('autoplay', '1')
    return u.toString()
  } catch {
    return embedUrl
  }
}

export function VideoPlayerShell({ source, title, poster, autoPlay = false, className = '' }: VideoPlayerShellProps) {
  const [started, setStarted] = useState(autoPlay)
  const posterUrl = poster ?? source.thumbnailUrl ?? null
  const wrapperClass = `relative w-full overflow-hidden rounded-2xl bg-[#05050a] ${className}`

  // --- YouTube : façade puis iframe ---
  if (source.kind === 'youtube' && source.embedUrl) {
    if (!started) {
      return (
        <div className={wrapperClass} style={{ aspectRatio: '16/9' }}>
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1206 0%, #050505 100%)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} aria-hidden />
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label={`Lire la vidéo : ${title}`}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <span
              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                background: 'rgba(212,175,55,0.18)',
                border: '2px solid rgba(212,175,55,0.5)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px rgba(212,175,55,0.35)',
              }}
            >
              <Play className="w-6 h-6 md:w-7 md:h-7 ml-1 text-white" fill="#FFFFFF" aria-hidden />
            </span>
          </button>
        </div>
      )
    }

    return (
      <div className={wrapperClass} style={{ aspectRatio: '16/9' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={withAutoplay(source.embedUrl)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  // --- Fichier direct (storage ou externe) ---
  if (source.fileUrl) {
    return (
      <div className={wrapperClass} style={{ aspectRatio: '16/9' }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          autoPlay={autoPlay}
          poster={posterUrl ?? undefined}
          className="absolute inset-0 w-full h-full bg-black"
          src={source.fileUrl}
          aria-label={title}
        />
      </div>
    )
  }

  // --- kind === 'none' : aucune vidéo jouable, état vide discret ---
  return (
    <div className={wrapperClass} style={{ aspectRatio: '16/9' }}>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        style={{ background: 'linear-gradient(135deg, #14100a 0%, #050505 100%)' }}
      >
        <VideoOff className="w-7 h-7 mb-3" style={{ color: 'rgba(212,175,55,0.5)' }} aria-hidden />
        <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>
          Vidéo indisponible pour le moment.
        </p>
      </div>
    </div>
  )
}
