'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  Play, Clock, Calendar, ArrowRight, Radio,
  Church, BookOpen, Sunrise, Flame,
  type LucideIcon,
} from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { events } from '@/lib/analytics'

/* ============================================================
   BLOC 2 — PROCHAIN RENDEZ-VOUS (Live & Cultes)
   Compte à rebours réel vers le prochain culte (programme hebdo),
   bascule « EN DIRECT » si un direct est réellement actif.
   Palette tenue : or × charbon, rouge réservé au direct.
   ============================================================ */

type ScheduleItem = { jour: string; heure: string; type: string; icon: LucideIcon; dayIndex: number; hour: number; min: number }
const SCHEDULE: ScheduleItem[] = [
  { jour: 'Lundi',    heure: '05h30', type: 'Matinale de Prière',          icon: Sunrise, dayIndex: 1, hour: 5,  min: 30 },
  { jour: 'Mercredi', heure: '05h30', type: 'Matinale de Prière',          icon: Sunrise, dayIndex: 3, hour: 5,  min: 30 },
  { jour: 'Mercredi', heure: '19h30', type: 'École du Royaume',            icon: BookOpen, dayIndex: 3, hour: 19, min: 30 },
  { jour: 'Vendredi', heure: '05h30', type: 'Matinale de Prière',          icon: Sunrise, dayIndex: 5, hour: 5,  min: 30 },
  { jour: 'Vendredi', heure: '19h30', type: 'Vendredi de Puissance',       icon: Flame,   dayIndex: 5, hour: 19, min: 30 },
  { jour: 'Dimanche', heure: '10h30', type: 'Culte de Célébration Royale', icon: Church,  dayIndex: 0, hour: 10, min: 30 },
]

type NextService = { label: string; jour: string; heure: string; at: Date }

/** Prochaine occurrence (à venir) du programme hebdomadaire. */
function computeNextService(now: Date): NextService | null {
  let best: NextService | null = null
  for (const s of SCHEDULE) {
    const d = new Date(now)
    let delta = (s.dayIndex - now.getDay() + 7) % 7
    d.setHours(s.hour, s.min, 0, 0)
    if (delta === 0 && d.getTime() <= now.getTime()) delta = 7
    d.setDate(d.getDate() + delta)
    if (!best || d.getTime() < best.at.getTime()) {
      best = { label: s.type, jour: s.jour, heure: s.heure, at: d }
    }
  }
  return best
}

type Countdown = { d: number; h: number; m: number; s: number }
function diff(target: Date, now: Date): Countdown {
  let ms = Math.max(0, target.getTime() - now.getTime())
  const d = Math.floor(ms / 86400000); ms -= d * 86400000
  const h = Math.floor(ms / 3600000); ms -= h * 3600000
  const m = Math.floor(ms / 60000); ms -= m * 60000
  const s = Math.floor(ms / 1000)
  return { d, h, m, s }
}

export function LiveSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // Direct réel (cms_lives) — même source que /live. Aucun faux contenu.
  const [liveNow, setLiveNow] = useState<{ titre: string } | null>(null)
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_lives').select('*').in('status', ['live', 'scheduled', 'published'])
        if (cancelled || !data) return
        const row: any = data.find((d: any) => (d.status === 'live' || d.is_live) && (d.youtube_url || d.video_url))
        if (row) setLiveNow({ titre: row.title })
      } catch { /* aucun direct */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Compte à rebours (client only → pas de mismatch SSR).
  const [next, setNext] = useState<NextService | null>(null)
  const [cd, setCd] = useState<Countdown | null>(null)
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const ns = computeNextService(now)
      setNext(ns)
      setCd(ns ? diff(ns.at, now) : null)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <section className="section-cinematic" ref={ref}>
      {/* Halos */}
      <div className="halo-gold w-[700px] h-[400px] -top-20 -left-40" />
      <div className="halo-light w-[600px] h-[500px] bottom-0 -right-40" />

      <div className="container-cinematic">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="section-label-dark">
              <Radio className="w-3 h-3" />
              Live &amp; Cultes
            </div>
            <h2 className="heading-cinematic-lg mb-6">
              L&apos;Église
              <span className="block text-cinematic-gold">Ne S&apos;arrête Jamais</span>
            </h2>
            <p className="font-inter text-base md:text-lg leading-relaxed mb-8 max-w-md"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Rejoignez-nous en direct depuis n&apos;importe où dans le monde. Cultes, enseignements, veillées —
              une expérience immersive pour grandir partout, à chaque heure.
            </p>

            {/* Compte à rebours / Direct */}
            <div className="card-cinematic-gold p-5 md:p-6 mb-6">
              {liveNow ? (
                <div className="flex items-center gap-4">
                  <span className="chip-live">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
                    </span>
                    EN DIRECT
                  </span>
                  <div className="min-w-0">
                    <p className="font-cinzel font-bold text-white truncate">{liveNow.titre}</p>
                    <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.5)' }}>Le culte est en cours maintenant</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <span className="font-cinzel text-[11px] font-bold tracking-[0.2em] uppercase flex items-center gap-2"
                      style={{ color: '#D4AF37' }}>
                      <Calendar className="w-3.5 h-3.5" />
                      Prochain rendez-vous
                    </span>
                    {next && (
                      <span className="font-inter text-xs capitalize" style={{ color: 'rgba(245,230,216,0.6)' }}>
                        {next.label} · {next.jour} {next.heure}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {([
                      ['Jours', cd?.d], ['Heures', cd?.h], ['Min', cd?.m], ['Sec', cd?.s],
                    ] as const).map(([label, val]) => (
                      <div key={label} className="text-center rounded-xl py-3"
                        style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)' }}>
                        <div className="font-cinzel font-black text-2xl md:text-3xl text-white tabular-nums">
                          {val == null ? '··' : (label === 'Jours' ? val : pad(val))}
                        </div>
                        <div className="text-[9px] font-inter uppercase tracking-wider mt-0.5"
                          style={{ color: 'rgba(245,230,216,0.45)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Programme hebdomadaire compact */}
            <div className="card-cinematic p-5 md:p-6 mb-8">
              <h4 className="font-cinzel text-[11px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2"
                style={{ color: '#D4AF37' }}>
                <Calendar className="w-3.5 h-3.5" />
                Programme hebdomadaire
              </h4>
              <div className="space-y-2.5">
                {SCHEDULE.map((item) => (
                  <div key={item.jour}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.22)' }}>
                        <item.icon className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
                      </div>
                      <div>
                        <span className="font-inter text-sm font-semibold text-white">{item.jour}</span>
                        <span className="font-inter text-xs ml-2" style={{ color: 'rgba(245,230,216,0.4)' }}>{item.heure}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium font-inter px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(212,175,55,0.10)', color: 'rgba(245,230,216,0.75)', border: '1px solid rgba(212,175,55,0.20)' }}>
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/live" onClick={() => events.ctaClick('live_section')} className="btn-gold-cinematic">
                <Radio className="w-4 h-4" />
                {liveNow ? 'Rejoindre le direct' : 'Accéder aux cultes'}
              </Link>
              <Link href="/live?tab=replays" className="btn-glass-cinematic">
                Voir les Replays
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* RIGHT — preview cliquable (plus de faux affordance) */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/live"
              onClick={() => events.ctaClick('live_preview')}
              aria-label={liveNow ? `Rejoindre le direct : ${liveNow.titre}` : 'Accéder à la page des cultes en direct'}
              className="relative block rounded-3xl overflow-hidden group"
              style={{
                aspectRatio: '16/10',
                border: '1px solid rgba(212,175,55,0.2)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.08)',
              }}>
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                <PremiumImage image={HERO_IMAGES.worship} preferRemote fill overlay="cinematic" sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2">
                {liveNow ? (
                  <div className="chip-live">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
                    </span>
                    EN DIRECT
                  </div>
                ) : (
                  <div className="chip-gold"><Calendar className="w-2.5 h-2.5" /> PROGRAMMÉ</div>
                )}
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{
                    background: 'rgba(212,175,55,0.18)',
                    border: '2px solid rgba(212,175,55,0.5)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 0 40px rgba(212,175,55,0.4)',
                  }}>
                  <Play className="w-7 h-7 ml-1" style={{ color: '#FFFFFF' }} fill="#FFFFFF" />
                </motion.div>
                <p className="font-cinzel text-sm tracking-wider uppercase font-semibold" style={{ color: 'rgba(245,230,216,0.7)' }}>
                  {liveNow ? liveNow.titre : 'Cultes & veillées en direct'}
                </p>
                <p className="font-inter text-xs mt-1" style={{ color: 'rgba(245,230,216,0.4)' }}>
                  {liveNow ? 'En direct maintenant' : 'Cliquez pour accéder à la diffusion'}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4"
                style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-cinzel text-sm font-bold text-white truncate">{liveNow ? liveNow.titre : 'La Chapelle Royale — Diffusion'}</h3>
                    <p className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(245,230,216,0.55)' }}>
                      Streaming HD · Replay disponible · Accessible partout
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: '#D4AF37' }} />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
