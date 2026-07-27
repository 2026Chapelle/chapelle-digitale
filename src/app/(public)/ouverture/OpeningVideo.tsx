'use client'

import { useState } from 'react'
import { Play, Film } from 'lucide-react'
import { youtubeThumbnail, type OpeningVideo as OpeningVideoSource } from '@/lib/ouverture'

/* ============================================================
   VIDÉO DE CAMPAGNE — lecteur premium, zéro dépendance
   ------------------------------------------------------------
   Façade cliquable : l'iframe YouTube n'est montée qu'au clic, donc aucun
   script tiers ne pénalise le chargement initial (LCP / Lighthouse).
   L'hôte `youtube-nocookie.com` est déjà autorisé par la CSP (next.config.js),
   et `i.ytimg.com` par images.remotePatterns.
   Si aucune URL n'est configurée, la section affiche un emplacement
   explicitement marqué « en attente » — jamais de fausse vidéo.

   NB : le ratio 16/9 est posé en style inline et NON via la classe
   `aspect-video`. Le projet charge le plugin @tailwindcss/aspect-ratio, qui
   désactive le plugin `aspectRatio` natif de Tailwind : `aspect-video` n'est
   pas généré dans la feuille de styles et resterait sans effet (cadre écrasé).
   ============================================================ */

const FRAME_STYLE = {
  aspectRatio: '16 / 9',
  background: 'linear-gradient(160deg, #111936 0%, #0B1023 100%)',
  border: '1px solid rgba(212,175,110,0.22)',
  boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset',
} as const

/** Cadre 16/9 commun à tous les états — garantit une hauteur stable (aucun CLS). */
function VideoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl"
      style={FRAME_STYLE}
    >
      {children}
    </div>
  )
}

export function OpeningVideo({ source }: { source: OpeningVideoSource | null }) {
  const [playing, setPlaying] = useState(false)

  if (!source) {
    return (
      <VideoFrame>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <Film className="mb-4 h-8 w-8" style={{ color: 'rgba(212,175,110,0.7)' }} aria-hidden />
          <p
            className="font-inter font-semibold uppercase"
            style={{ fontSize: 'clamp(0.68rem, 1.8vw, 0.78rem)', letterSpacing: '0.24em', color: '#D4AF6E' }}
          >
            Vidéo à configurer
          </p>
          <p
            className="mt-3 max-w-md font-inter"
            style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: '#C7CEDB', lineHeight: 1.7 }}
          >
            Renseigne la variable{' '}
            <code className="font-mono text-[0.85em]" style={{ color: '#FFFFFF' }}>
              NEXT_PUBLIC_OUVERTURE_VIDEO_URL
            </code>{' '}
            (lien YouTube ou fichier vidéo) pour afficher la vidéo de campagne à cet emplacement.
          </p>
        </div>
      </VideoFrame>
    )
  }

  if (source.kind === 'file') {
    return (
      <VideoFrame>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- piste de sous-titres à ajouter avec la vidéo finale */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={source.src}
          controls
          playsInline
          preload="metadata"
        />
      </VideoFrame>
    )
  }

  if (playing) {
    return (
      <VideoFrame>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={source.embedUrl}
          title="La Citadelle — Une porte ouverte pour grandir"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </VideoFrame>
    )
  }

  return (
    <VideoFrame>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label="Lire la vidéo — Une porte ouverte pour grandir"
        className="group absolute inset-0 h-full w-full cursor-pointer"
      >
        {/* Miniature : <img> natif — images.unoptimized est actif (hébergement N0C). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={youtubeThumbnail(source.id)}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-85"
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(5,8,22,0.25) 0%, rgba(5,8,22,0.75) 100%)' }}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 md:h-20 md:w-20"
            style={{
              background: 'linear-gradient(135deg, #F0DCAE 0%, #D4AF6E 55%, #B8860B 100%)',
              boxShadow: '0 12px 40px rgba(212,175,110,0.4)',
            }}
          >
            <Play className="ml-1 h-6 w-6 md:h-7 md:w-7" style={{ color: '#050816' }} fill="#050816" aria-hidden />
          </span>
        </span>
      </button>
    </VideoFrame>
  )
}
