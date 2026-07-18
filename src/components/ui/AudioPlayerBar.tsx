'use client'
/**
 * Barre lecteur persistante — bas d’écran, liquid glass, ne masque pas le footer
 * (padding body via .has-audio-player).
 */
import { useAudioPlayer } from '@/components/providers/AudioPlayerProvider'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function AudioPlayerBar() {
  const {
    track,
    playing,
    progress,
    volume,
    muted,
    elapsed,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    toggleMute,
  } = useAudioPlayer()
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const onMemberRoute = pathname?.startsWith('/member') ?? false

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          key="audio-bar"
          role="region"
          aria-label="Lecteur audio"
          initial={reduce ? { opacity: 1 } : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed left-0 right-0 z-[55] ${onMemberRoute ? 'bottom-[64px] lg:bottom-0' : 'bottom-0'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div
            className="citadelle-audio-bar flex items-center gap-3 px-3 sm:px-5 py-2.5 sm:py-3"
            style={{
              background: 'rgba(10, 10, 18, 0.88)',
              backdropFilter: 'blur(22px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Miniature */}
            <div
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" sizes="48px" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-lg" aria-hidden>
                  {track.emoji || '🎙️'}
                </span>
              )}
            </div>

            {/* Titre */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-inter font-semibold text-white line-clamp-1 sm:line-clamp-2">
                {track.titre}
              </div>
              {track.serie && (
                <div className="text-[11px] font-inter truncate hidden sm:block" style={{ color: 'rgba(212,175,55,0.7)' }}>
                  {track.serie}
                </div>
              )}
              {/* Progression mobile */}
              <div className="sm:hidden mt-1.5 flex items-center gap-2">
                <div
                  className="flex-1 h-1 rounded-full cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    seek((e.clientX - rect.left) / rect.width)
                  }}
                  role="slider"
                  aria-label="Progression"
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') seek(Math.min(1, progress + 0.05))
                    if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 0.05))
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #D4AF37, #F5E6A7)' }}
                  />
                </div>
              </div>
            </div>

            {/* Progression desktop */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0 w-48 md:w-64">
              <span className="text-[10px] font-inter tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {fmtTime(elapsed)}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  seek((e.clientX - rect.left) / rect.width)
                }}
                role="slider"
                aria-label="Progression audio"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') seek(Math.min(1, progress + 0.05))
                  if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 0.05))
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #D4AF37, #F5E6A7)' }}
                />
              </div>
              <span className="text-[10px] font-inter tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {track.duree || fmtTime(track.dureeSecondes || 0)}
              </span>
            </div>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={playing ? pause : resume}
              aria-label={playing ? 'Mettre en pause' : 'Lire'}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)' }}
            >
              {playing ? (
                <Pause className="w-4 h-4 text-[#1A0F00]" aria-hidden />
              ) : (
                <Play className="w-4 h-4 text-[#1A0F00] ml-0.5" aria-hidden />
              )}
            </button>

            {/* Volume desktop */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              aria-pressed={muted}
              className="hidden md:flex p-2 text-pearl/40 hover:text-pearl/80 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden md:block w-20 h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: '#D4AF37' }}
            />

            {/* Fermer */}
            <button
              type="button"
              onClick={stop}
              aria-label="Fermer le lecteur"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-pearl/35 hover:text-red-400 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
