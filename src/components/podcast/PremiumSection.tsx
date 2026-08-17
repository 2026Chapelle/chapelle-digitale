'use client'
/**
 * PODCAST — Section « CITADELLE PREMIUM ». Écrin éditorial DISTINCT (bleu nuit/violet,
 * fine bordure or, halo discret, couronne) qui met en avant les contenus exclusifs.
 *
 * SÉCURITÉ : la lecture passe par le gate serveur réel de la page (`onPlay` → requestPlay,
 * PODCAST-SEC + entitlement Premium fail-closed). Un visiteur non éligible qui clique
 * reçoit le dialogue de refus existant — cette section ne déverrouille RIEN, elle
 * présente. Si aucun épisode réellement premium n'existe, elle ne rend rien (pas de faux).
 */
import Image from 'next/image'
import { Crown, Lock, Play, Pause, Clock } from 'lucide-react'
import { PremiumBadge } from './PremiumBadge'
import type { VoixEpisode } from '@/lib/podcast/sections'

const GRADIENTS = [
  'linear-gradient(135deg, #2a1a4a 0%, #0a0a12 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #0a0a12 100%)',
  'linear-gradient(135deg, #3b1f47 0%, #0a0a12 100%)',
  'linear-gradient(135deg, #14213d 0%, #0a0a12 100%)',
]
function pickGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

function PremiumCard({
  ep,
  onPlay,
  playing,
  hasPremium,
}: {
  ep: VoixEpisode
  onPlay: (ep: VoixEpisode) => void
  playing: boolean
  hasPremium: boolean
}) {
  // Verrou visible tant que le membre n'a pas le droit Premium (le gate serveur reste l'autorité).
  const locked = !hasPremium
  const initiale = (ep.serie || ep.title || '🎙️').trim().charAt(0).toUpperCase() || '🎙️'
  const cta = hasPremium ? 'Écouter' : 'Débloquer Premium'
  const ariaLabel = hasPremium
    ? `Écouter ${ep.title}`
    : `${ep.title} — contenu Premium verrouillé, débloquer pour écouter`
  return (
    <button
      type="button"
      onClick={() => onPlay(ep)}
      aria-label={ariaLabel}
      className="group relative flex flex-col text-left rounded-2xl overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] transition-transform"
      style={{
        background: 'linear-gradient(160deg, rgba(30,24,64,0.55), rgba(10,10,18,0.65))',
        border: '1px solid rgba(212,175,55,0.28)',
      }}
    >
      {/* Cover */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#0a0a12]">
        {ep.cover ? (
          <Image
            src={ep.cover}
            alt={ep.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: pickGradient(ep.serie || ep.title || 'x') }}>
            <span className="font-cinzel text-5xl text-gold/50 select-none" aria-hidden>{initiale}</span>
          </div>
        )}
        {/* Voile bas lisibilité */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent, rgba(6,6,10,0.72))' }} aria-hidden />
        <PremiumBadge className="absolute top-2 left-2 z-[3]" />
        {/* Cadenas si verrouillé — libellé accessible, compréhensible sans couleur */}
        {locked && (
          <span
            className="absolute top-2 right-2 z-[3] w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(10,10,18,0.7)', border: '1px solid rgba(212,175,55,0.35)' }}
            role="img"
            aria-label="Contenu verrouillé"
            title="Contenu verrouillé"
          >
            <Lock className="w-3.5 h-3.5 text-gold/80" aria-hidden />
          </span>
        )}
        {/* Bouton lecture flottant */}
        <span
          className="absolute bottom-2 right-2 z-[3] w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 transition-all"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #b8952e)', color: '#1a1206' }}
          aria-hidden
        >
          {locked ? <Lock className="w-4 h-4" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
        </span>
      </div>
      {/* Texte */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-cinzel text-base font-bold text-pearl leading-snug line-clamp-2">{ep.title}</h3>
        {ep.description && (
          <p className="mt-1.5 font-inter text-[13px] leading-snug line-clamp-2" style={{ color: 'rgba(245,230,216,0.55)' }}>{ep.description}</p>
        )}
        <div className="mt-2.5 flex items-center gap-2 text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
          {ep.serie && <span className="truncate text-gold/70 font-medium">{ep.serie}</span>}
          {ep.duration && (
            <span className="inline-flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" aria-hidden />{ep.duration}</span>
          )}
        </div>
        <span
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-inter font-semibold text-gold group-hover:gap-2.5 transition-all"
          aria-hidden
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
          {cta}
        </span>
      </div>
    </button>
  )
}

export function PremiumSection({
  episodes,
  onPlay,
  isPlaying,
  hasPremium,
}: {
  /** Épisodes DÉJÀ filtrés « réellement premium » (via selectPremium). Vide → rien. */
  episodes: VoixEpisode[]
  /** Gate serveur réel de la page (requestPlay). Un non-éligible reçoit le dialogue de refus. */
  onPlay: (ep: VoixEpisode) => void
  isPlaying: (id: string) => boolean
  /** Le visiteur possède-t-il le droit Premium actif (myPremium.active) ? Ajuste le CTA. */
  hasPremium: boolean
}) {
  if (!episodes.length) return null
  return (
    <section
      className="mb-12 md:mb-16 relative overflow-hidden rounded-3xl mx-4 md:mx-0"
      aria-label="Citadelle Premium — contenus exclusifs"
      style={{
        background: 'radial-gradient(720px 300px at 20% 0%, rgba(60,32,110,0.4), transparent 60%), linear-gradient(150deg, #120e26 0%, #0a0a14 55%, #0c0a16 100%)',
        border: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 0 0 1px rgba(212,175,55,0.05), 0 30px 80px -40px rgba(90,60,160,0.55)',
      }}
    >
      {/* Halo doré discret */}
      <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.14), transparent 70%)' }} aria-hidden />
      <div className="relative p-6 md:p-10">
        <div className="flex items-start gap-3 mb-6 md:mb-8">
          <span
            className="mt-0.5 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.4)' }}
            aria-hidden
          >
            <Crown className="w-5 h-5 text-gold" />
          </span>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="section-label-dark">Citadelle Premium</p>
              <PremiumBadge tone={hasPremium ? 'active' : 'content'} />
            </div>
            <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-pearl mt-1">Contenus exclusifs</h2>
            <p className="mt-2 font-inter text-sm md:text-base max-w-md" style={{ color: 'rgba(245,230,216,0.6)' }}>
              Des contenus exclusifs pour aller plus loin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {episodes.map((ep) => (
            <PremiumCard key={ep.id} ep={ep} onPlay={onPlay} playing={isPlaying(ep.id)} hasPremium={hasPremium} />
          ))}
        </div>
      </div>
    </section>
  )
}
