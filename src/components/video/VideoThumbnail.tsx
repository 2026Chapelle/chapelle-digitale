/**
 * VideoThumbnail — vignette vidéo réutilisable (live, replay, épisode).
 * Purement présentationnel : image réelle si fournie, sinon dégradé + icône
 * de repli déterministe. Overlay bouton lecture toujours affiché (affordance).
 * Badge d'état optionnel (coin haut-gauche), indépendant du domaine « live »
 * pour rester un composant vidéo générique (aucune dépendance à src/components/live).
 */
import { Play, Radio, Clock3, RotateCcw, CheckCircle2 } from 'lucide-react'
import type { LiveState } from '@/lib/live'

export interface VideoThumbnailProps {
  thumbnailUrl?: string | null
  title: string
  state?: LiveState
  className?: string
  aspect?: '16/9' | '1/1'
}

const STATE_BADGE: Record<LiveState, { label: string; icon: typeof Radio; bg: string; border: string; color: string }> = {
  live: { label: 'EN DIRECT', icon: Radio, bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.4)', color: '#FCA5A5' },
  upcoming: { label: 'À VENIR', icon: Clock3, bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.25)', color: '#F5E6A7' },
  replay: { label: 'REPLAY', icon: RotateCcw, bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', color: '#C4B5FD' },
  ended: { label: 'TERMINÉ', icon: CheckCircle2, bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)', color: 'rgba(245,230,216,0.6)' },
}

export function VideoThumbnail({ thumbnailUrl, title, state, className = '', aspect = '16/9' }: VideoThumbnailProps) {
  const hasImage = Boolean(thumbnailUrl)
  const badge = state ? STATE_BADGE[state] : null

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-[#0a0a12] ${className}`}
      style={{ aspectRatio: aspect === '1/1' ? '1/1' : '16/9' }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl as string}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1a1206 0%, #0a0a12 100%)' }}
        >
          <Radio className="w-10 h-10" style={{ color: 'rgba(212,175,55,0.25)' }} aria-hidden />
        </div>
      )}

      {/* Voile bas pour lisibilité si texte superposé */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(6,6,10,0.55))' }}
        aria-hidden
      />

      {badge && (
        <span
          className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-inter uppercase tracking-wider"
          style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}
        >
          {state === 'live' ? (
            <span className="relative flex w-1.5 h-1.5" aria-hidden>
              <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
            </span>
          ) : (
            <badge.icon className="w-3 h-3" aria-hidden />
          )}
          {badge.label}
        </span>
      )}

      {/* Overlay bouton lecture (affordance visuelle uniquement, aucune interaction ici) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform"
          style={{
            background: 'rgba(212,175,55,0.18)',
            border: '2px solid rgba(212,175,55,0.5)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 30px rgba(212,175,55,0.3)',
          }}
        >
          <Play className="w-5 h-5 ml-0.5 text-white" fill="#FFFFFF" aria-hidden />
        </span>
      </div>
    </div>
  )
}
