'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users, TrendingUp, Wifi, HandCoins, Heart, GraduationCap,
  CalendarDays, ShoppingBag, Loader2, RefreshCw, Globe, ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * CENTRE DE COMMANDEMENT APOSTOLIQUE — cockpit unifié transverse.
 * Pilote Membres / Antennes / Discipulat / Finances / Marketplace / Formations /
 * Prières / Événements depuis UNE interface. Les KPIs proviennent de la RPC
 * SET-BASED command_center_kpis via /api/admin/command-center (portée serveur).
 */

interface Tile {
  key: string
  label: string
  value: number | string
  detail?: string
  tone: 'positif' | 'neutre' | 'attention'
  href: string
}
interface CmdData {
  scope: { kind: string; label: string }
  context: string
  tiles: Tile[]
}

const ICONS: Record<string, typeof Users> = {
  membres: Users, croissance: TrendingUp, presence: Wifi, finances: HandCoins,
  prieres: Heart, formations: GraduationCap, evenements: CalendarDays, marketplace: ShoppingBag,
}
const TONE_COLOR: Record<string, string> = { positif: '#22C55E', neutre: '#D4AF37', attention: '#EF4444' }

export default function CommandCenterPage() {
  const [d, setD] = useState<CmdData | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [context, setContext] = useState('global')
  const [nation, setNation] = useState('')
  const [last, setLast] = useState('')
  const [auto, setAuto] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const ctx = nation.trim() ? `nation:${nation.trim().toUpperCase()}` : context
      const r = await fetch(`/api/admin/command-center?context=${encodeURIComponent(ctx)}`, {
        credentials: 'same-origin',
      })
      const j = await r.json()
      if (j?.demo) { setDemo(true); setD(null) }
      else if (j?.ok) { setD(j.data); setDemo(false); setLast(new Date().toLocaleTimeString('fr-FR')) }
    } catch { /* réseau */ } finally { setLoading(false) }
  }, [context, nation])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (auto) timer.current = setInterval(load, 30_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [auto, load])

  const attention = (d?.tiles || []).filter((t) => t.tone === 'attention').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        eyebrow="Centre de Commandement Apostolique"
        title={<>Console <span className="text-cinematic-gold">unifiée</span></>}
        description="Membres, antennes, discipulat, finances, marketplace, formations, prières et événements — pilotés depuis une seule interface."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
              <Globe className="w-3.5 h-3.5 text-gold/70" />
              <select
                value={nation ? 'nation' : context}
                onChange={(e) => { if (e.target.value === 'global') { setContext('global'); setNation('') } else { setContext('global') } }}
                className="bg-transparent text-sm text-pearl/80 outline-none"
              >
                <option value="global" className="bg-ink">Vue globale</option>
                <option value="nation" className="bg-ink">Par nation…</option>
              </select>
              <input
                value={nation}
                onChange={(e) => setNation(e.target.value.slice(0, 2))}
                placeholder="CI"
                className="w-12 bg-transparent text-sm text-pearl/80 outline-none border-l border-white/10 pl-2 placeholder:text-pearl/30 uppercase"
              />
            </div>
            <button
              onClick={() => setAuto((a) => !a)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${auto ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/[0.04] border-white/10 text-pearl/50'}`}
            >
              Auto {auto ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={load}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-pearl/70 hover:text-pearl transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {demo && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20 text-sm text-gold/80">
          Mode démonstration — connectez Supabase pour activer les indicateurs réels du Centre de Commandement.
        </div>
      )}

      {attention > 0 && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20 text-sm text-danger">
          <ShieldAlert className="w-4 h-4" />
          {attention} indicateur(s) requièrent une attention pastorale.
        </div>
      )}

      {loading && !d ? (
        <div className="flex items-center justify-center py-24 text-pearl/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(d?.tiles || []).map((t, i) => {
              const Icon = ICONS[t.key] || TrendingUp
              const color = TONE_COLOR[t.tone] || '#D4AF37'
              return (
                <motion.div
                  key={t.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                >
                  <Link
                    href={t.href}
                    className="group block h-full p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] transition relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1a` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-pearl/20 group-hover:text-pearl/60 transition" />
                    </div>
                    <div className="font-cinzel font-bold text-2xl text-pearl tabular-nums leading-tight break-words">
                      {t.value}
                    </div>
                    <div className="text-xs font-medium text-pearl/50 mt-1">{t.label}</div>
                    {t.detail && <div className="text-[11px] text-pearl/35 mt-1">{t.detail}</div>}
                  </Link>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-between text-[11px] text-pearl/30">
            <span>Contexte : {d?.context || 'global'} · portée {d?.scope?.label || '—'}</span>
            {last && <span>Mis à jour à {last}</span>}
          </div>
        </>
      )}
    </div>
  )
}
