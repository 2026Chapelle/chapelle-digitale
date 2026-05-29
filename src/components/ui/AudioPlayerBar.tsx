'use client'
import { useAudioPlayer } from '@/components/providers/AudioPlayerProvider'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward, ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function AudioPlayerBar() {
  const { track, playing, progress, volume, muted, elapsed, pause, resume, stop, seek, setVolume, toggleMute } = useAudioPlayer()
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()

  if (!track) return null

  // Mobile bottom nav is rendered on (member) routes only; on those routes,
  // shift the audio bar up so it doesn't cover navigation.
  const onMemberRoute = pathname?.startsWith('/member') ?? false

  const dur = track.dureeSecondes ?? 2880

  return (
    <AnimatePresence>
      <motion.div
        key="audio-bar"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={`fixed left-0 right-0 z-50 ${onMemberRoute ? 'bottom-[64px] lg:bottom-0' : 'bottom-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Expanded panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
              style={{ background: 'rgba(8, 0, 20, 0.97)', borderTop: '1px solid rgba(212,175,55,0.12)' }}
            >
              <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col items-center gap-6">
                {/* Big emoji */}
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                  style={{ background: `${track.couleur}18`, border: `1px solid ${track.couleur}30` }}>
                  {track.emoji}
                </div>
                <div className="text-center">
                  <div className="font-cinzel text-xl font-bold text-white mb-1">{track.titre}</div>
                  {track.serie && <div className="text-xs font-inter" style={{ color: 'rgba(212,175,55,0.7)' }}>{track.serie}</div>}
                  {track.auteur && <div className="text-xs font-inter mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{track.auteur}</div>}
                </div>
                {/* Full progress bar */}
                <div className="w-full flex flex-col gap-2">
                  <div
                    className="w-full h-1.5 rounded-full cursor-pointer relative group"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      seek((e.clientX - rect.left) / rect.width)
                    }}
                  >
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${track.couleur}, #D4AF37)` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `${progress * 100}%`, transform: 'translate(-50%,-50%)', background: track.couleur }} />
                  </div>
                  <div className="flex justify-between text-[11px] font-inter" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <span>{fmtTime(elapsed)}</span>
                    <span>{track.duree}</span>
                  </div>
                </div>
                {/* Volume */}
                <div className="flex items-center gap-3 w-full max-w-xs">
                  <button
                    onClick={toggleMute}
                    aria-label={muted ? 'Activer le son' : 'Couper le son'}
                    aria-pressed={muted}
                    className="text-pearl/40 hover:text-pearl/80 transition-colors rounded"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                    onChange={e => setVolume(Number(e.target.value))}
                    aria-label="Volume"
                    className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: track.couleur }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main bar */}
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ background: 'rgba(6, 0, 18, 0.96)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>

          {/* Emoji + track info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setExpanded(v => !v)}
              aria-label={expanded ? 'Réduire le lecteur' : 'Agrandir le lecteur'}
              aria-expanded={expanded}
              className="flex-shrink-0 rounded-xl"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: `${track.couleur}20` }}>
                {track.emoji}
              </div>
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-inter font-semibold text-white truncate">{track.titre}</div>
              {track.serie && <div className="text-[11px] font-inter truncate" style={{ color: track.couleur }}>{track.serie}</div>}
            </div>
          </div>

          {/* Progress + controls */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            {/* Mini progress */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-inter" style={{ color: 'rgba(255,255,255,0.3)' }}>{fmtTime(elapsed)}</span>
              <div className="w-32 h-0.5 rounded-full cursor-pointer relative"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  seek((e.clientX - rect.left) / rect.width)
                }}>
                <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: track.couleur }} />
              </div>
              <span className="text-[10px] font-inter" style={{ color: 'rgba(255,255,255,0.3)' }}>{track.duree}</span>
            </div>
            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => seek(Math.max(0, progress - 15 / dur))}
                aria-label="Reculer de 15 secondes"
                className="text-pearl/30 hover:text-pearl/70 transition-colors p-1 rounded"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={playing ? pause : resume}
                aria-label={playing ? 'Mettre en pause' : 'Lire'}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${track.couleur}, #C49A20)` }}
              >
                {playing ? <Pause className="w-4 h-4 text-[#1A0F00]" /> : <Play className="w-4 h-4 text-[#1A0F00]" />}
              </button>
              <button
                onClick={() => seek(Math.min(1, progress + 30 / dur))}
                aria-label="Avancer de 30 secondes"
                className="text-pearl/30 hover:text-pearl/70 transition-colors p-1 rounded"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            <button
              onClick={() => setExpanded(v => !v)}
              aria-label={expanded ? 'Réduire le lecteur' : 'Agrandir le lecteur'}
              aria-expanded={expanded}
              className="p-2 text-pearl/30 hover:text-pearl/70 transition-colors rounded"
            >
              <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronUp className="w-4 h-4" />
              </motion.div>
            </button>
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              aria-pressed={muted}
              className="hidden sm:block p-2 text-pearl/30 hover:text-pearl/70 transition-colors rounded"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={stop}
              aria-label="Arrêter la lecture"
              className="p-2 text-pearl/20 hover:text-red-400 transition-colors rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
