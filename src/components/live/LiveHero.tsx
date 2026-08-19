'use client'
/**
 * LiveHero — bandeau mis en avant : live en cours / replay jouable (lecteur
 * intégré) ou prochain live (vignette + compte à rebours optionnel).
 * Purement présentationnel : reçoit un `NormalizedLive` déjà résolu, aucun
 * appel réseau ici.
 */
import { useEffect, useState } from 'react'
import { CalendarClock, Radio } from 'lucide-react'
import type { NormalizedLive } from '@/lib/live'
import { VideoPlayerShell, VideoThumbnail } from '@/components/video'
import { LiveStatusBadge } from './LiveStatusBadge'

export interface LiveHeroProps {
  live: NormalizedLive
  className?: string
}

type Countdown = { d: number; h: number; m: number; s: number }

/** Écart (jours/heures/min/sec) entre `target` et `now`, jamais négatif. */
function diff(target: Date, now: Date): Countdown {
  let ms = Math.max(0, target.getTime() - now.getTime())
  const d = Math.floor(ms / 86400000); ms -= d * 86400000
  const h = Math.floor(ms / 3600000); ms -= h * 3600000
  const m = Math.floor(ms / 60000); ms -= m * 60000
  const s = Math.floor(ms / 1000)
  return { d, h, m, s }
}

/**
 * Sous-composant client isolé : ticker de compte à rebours vers une échéance.
 * Aucune donnée externe — reçoit uniquement la date cible en prop.
 */
function LiveHeroCountdown({ target }: { target: Date }) {
  // Départ `null` : le calcul dépend de l'horloge locale — le faire au rendu SSR
  // provoquerait un écart d'hydratation (secondes serveur ≠ client). On ne calcule
  // qu'après le montage client ; le SSR et le 1er rendu client affichent le même
  // placeholder, puis l'effet remplit les valeurs réelles.
  const [cd, setCd] = useState<Countdown | null>(null)

  useEffect(() => {
    const tick = () => setCd(diff(target, new Date()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [target])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="grid grid-cols-4 gap-2 max-w-xs" aria-label="Compte à rebours avant le direct">
      {([['J', cd?.d], ['H', cd?.h], ['M', cd?.m], ['S', cd?.s]] as const).map(([label, val]) => (
        <div
          key={label}
          className="text-center rounded-xl py-2.5"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)' }}
        >
          <div className="font-cinzel font-black text-xl text-white tabular-nums">
            {cd == null ? '—' : label === 'J' ? (val ?? 0) : pad(val ?? 0)}
          </div>
          <div className="text-[9px] font-inter uppercase tracking-wider mt-0.5" style={{ color: 'rgba(245,230,216,0.45)' }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Date FR longue (ex. « Dimanche 24 août, 10:30 »), ou `null` si absente. */
function formatScheduledAt(date: Date | null): string | null {
  if (!date) return null
  try {
    const formatted = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(date)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  } catch {
    return null
  }
}

export function LiveHero({ live, className = '' }: LiveHeroProps) {
  const dateLabel = formatScheduledAt(live.scheduledAt)
  const playable = live.hasPlayableVideo && (live.state === 'live' || live.state === 'replay')

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-[rgba(212,175,55,0.2)] ${className}`}
      style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.08)' }}
    >
      {playable ? (
        <VideoPlayerShell source={live.source} title={live.title} poster={live.thumbnailUrl} />
      ) : (
        <VideoThumbnail thumbnailUrl={live.thumbnailUrl} title={live.title} aspect="16/9" />
      )}

      {/* Bandeau d'info sous le lecteur/vignette */}
      <div className="p-4 md:p-6" style={{ background: 'linear-gradient(140deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)' }}>
        <div className="mb-2">
          <LiveStatusBadge state={live.state} />
        </div>
        <h2 className="font-cinzel text-lg md:text-2xl font-black text-pearl leading-tight">{live.title}</h2>
        {live.description && (
          <p className="mt-2 font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.55)' }}>
            {live.description}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 flex-wrap font-inter text-xs" style={{ color: 'rgba(245,230,216,0.45)' }}>
          {dateLabel && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-gold/70" aria-hidden />
              {dateLabel}
            </span>
          )}
          {live.platform && (
            <span className="inline-flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-gold/70" aria-hidden />
              {live.platform}
            </span>
          )}
        </div>

        {live.state === 'upcoming' && live.scheduledAt && (
          <div className="mt-4">
            <LiveHeroCountdown target={live.scheduledAt} />
          </div>
        )}
      </div>
    </div>
  )
}
