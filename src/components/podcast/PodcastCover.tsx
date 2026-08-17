'use client'
/**
 * PODCAST-1 — Cover audio réutilisable. Image réelle si disponible, sinon fallback
 * déterministe (dégradé Citadelle + initiale de l'émission / 🎙️). Jamais d'image cassée.
 */
import Image from 'next/image'
import { useState } from 'react'
import { AudioLines } from 'lucide-react'

const GRADIENTS = [
  'linear-gradient(135deg, #2a1a4a 0%, #0a0a12 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #0a0a12 100%)',
  'linear-gradient(135deg, #3b1f47 0%, #0a0a12 100%)',
  'linear-gradient(135deg, #14213d 0%, #0a0a12 100%)',
]

function pick(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

export function PodcastCover({
  src,
  alt,
  label,
  sizes = '180px',
  rounded = 'rounded-xl',
  className = '',
}: {
  src?: string | null
  alt: string
  /** Texte de repli (émission / titre) → initiale affichée si pas d'image. */
  label?: string | null
  sizes?: string
  rounded?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed
  const initiale = (label || alt || '🎙️').trim().charAt(0).toUpperCase() || '🎙️'
  return (
    <div
      className={`relative w-full aspect-[1/1] ${rounded} overflow-hidden bg-[#0a0a12] ${className}`}
      style={showImage ? undefined : { background: pick(label || alt || 'x') }}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {/* Motif sonore Citadelle discret (or très léger) derrière l'initiale */}
          <AudioLines
            className="absolute w-[130%] h-[130%] text-gold/[0.07] select-none"
            strokeWidth={1}
            aria-hidden
          />
          {/* Halo doré central très diffus */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 45%, rgba(212,175,55,0.10), transparent 62%)' }}
            aria-hidden
          />
          <span className="relative font-cinzel text-4xl md:text-5xl text-gold/60 select-none" aria-hidden>
            {initiale}
          </span>
        </div>
      )}
      {/* Voile bas pour lisibilité si sur-titre superposé */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(6,6,10,0.55))' }} aria-hidden />
    </div>
  )
}
