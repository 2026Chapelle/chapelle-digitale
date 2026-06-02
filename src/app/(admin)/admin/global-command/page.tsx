'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Globe2, HeartPulse, ShieldAlert, Flame, Compass, HandCoins, Building2,
  Brain, Loader2, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * CENTRE DE COMMANDEMENT APOSTOLIQUE GLOBAL (V5) — console mondiale.
 * Vision mondiale, santé spirituelle, finances, gouvernement par antenne, IA
 * prédictive, alertes prophétiques, crise et mission — en une seule console.
 * Données : /api/admin/global-command (orchestrateur défensif des 9 capacités).
 */

const SEV_COLOR: Record<string, string> = { critique: '#EF4444', haute: '#F59E0B', moyenne: '#EAB308', info: '#0EA5E9' }
const SRC_LABEL: Record<string, string> = {
  prophetique: 'Prophétique', crise: 'Crise', finance: 'Finance', sante: 'Santé', croissance: 'Croissance', antenne: 'Antenne',
}
const fmt = (n: any) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0)
const fmtDevises = (m: Record<string, number> | null | undefined) => {
  const e = Object.entries(m || {})
  return e.length ? e.map(([d, v]) => `${fmt(v)} ${d}`).join(' · ') : '—'
}

interface Data {
  pouls: { sante_indice: number; sante_label: string; sante_color: string; attention: number; alertes: { counts: Record<string, number>; total: number } }
  sante: { indice: number; parTerritoire: { scope_key: string; membres: number; indice: number }[] }
  alertes: { counts: Record<string, number>; total: number; top: { source: string; severite: string; titre: string; scope: string | null; detail?: string }[] }
  vision: any
  crise: any
  mission: { pulse: any; carte: any }
  finances: { jour: string; devise: string; montant_total: number }[] | null
  prediction: any
  gouvernance: any[]
}

export default function GlobalCommandPage() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [last, setLast] = useState('')
  const [auto, setAuto] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/global-command', { credentials: 'same-origin' })
      const j = await r.json()
      if (j?.demo) { setDemo(true); setD(null) }
      else if (j?.ok) { setD(j.data); setDemo(false); setLast(new Date().toLocaleTimeString('fr-FR')) }
    } catch { /* réseau */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (auto) timer.current = setInterval(load, 60_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [auto, load])

  // Consolidation finances par devise (jamais d'addition inter-devises).
  const devises: Record<string, number> = {}
  for (const f of d?.finances || []) devises[String(f.devise || 'FCFA').toUpperCase()] = (devises[String(f.devise || 'FCFA').toUpperCase()] || 0) + (Number(f.montant_total) || 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        eyebrow="Centre de Commandement Apostolique Global"
        title={<>Vision <span className="text-cinematic-gold">mondiale</span> de l'œuvre</>}
        description="Santé spirituelle, finances, gouvernement par antenne, croissance, alertes prophétiques, crise et mission — pilotés à l'échelle du Royaume."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setAuto((a) => !a)} className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${auto ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/[0.04] border-white/10 text-pearl/50'}`}>Auto {auto ? 'ON' : 'OFF'}</button>
            <button onClick={load} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-pearl/70 hover:text-pearl transition"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        }
      />

      {demo && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20 text-sm text-gold/80">
          Mode démonstration — poussez les migrations V4 + V5 et connectez Supabase pour activer la console mondiale réelle.
        </div>
      )}

      {loading && !d ? (
        <div className="flex items-center justify-center py-24 text-pearl/40"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Pouls mondial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2"><HeartPulse className="w-4 h-4" style={{ color: d?.pouls?.sante_color }} /><span className="text-xs text-pearl/50">Santé spirituelle mondiale</span></div>
              <div className="font-cinzel font-black text-3xl text-pearl tabular-nums">{fmt(d?.pouls?.sante_indice)}<span className="text-base text-pearl/30">/100</span></div>
              <div className="text-sm font-medium mt-1" style={{ color: d?.pouls?.sante_color }}>{d?.pouls?.sante_label || '—'}</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-5 rounded-2xl bg-danger/[0.04] border border-danger/15">
              <div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-danger" /><span className="text-xs text-pearl/50">Décisions apostoliques requises</span></div>
              <div className="font-cinzel font-black text-3xl text-pearl tabular-nums">{fmt(d?.pouls?.attention)}</div>
              <div className="text-sm text-pearl/40 mt-1">{fmt(d?.pouls?.alertes?.total)} alerte(s) au total</div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2"><HandCoins className="w-4 h-4 text-gold" /><span className="text-xs text-pearl/50">Finances mondiales (par devise)</span></div>
              <div className="font-cinzel font-bold text-xl text-pearl break-words">{fmtDevises(devises)}</div>
            </motion.div>
          </div>

          {/* Répartition sévérité */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(['critique', 'haute', 'moyenne', 'info'] as const).map((s) => (
              <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: `${SEV_COLOR[s]}40`, background: `${SEV_COLOR[s]}12`, color: SEV_COLOR[s] }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_COLOR[s] }} />
                {s} : {fmt(d?.alertes?.counts?.[s])}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alertes prioritaires (toutes sources) */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-gold" /><h3 className="font-cinzel font-bold text-pearl">Alertes prioritaires</h3></div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(d?.alertes?.top || []).length === 0 && <p className="text-sm text-pearl/30">Aucune alerte active.</p>}
                {(d?.alertes?.top || []).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SEV_COLOR[a.severite] }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: `${SEV_COLOR[a.severite]}1a`, color: SEV_COLOR[a.severite] }}>{SRC_LABEL[a.source] || a.source}</span>
                        <span className="text-sm text-pearl/80 truncate">{a.titre}</span>
                      </div>
                      {a.detail && <p className="text-xs text-pearl/40 mt-0.5 line-clamp-2">{a.detail}</p>}
                      {a.scope && <p className="text-[11px] text-pearl/30 mt-0.5">{a.scope}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Santé par territoire (plus fragiles en tête) */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4"><Globe2 className="w-4 h-4 text-gold" /><h3 className="font-cinzel font-bold text-pearl">Santé par territoire</h3></div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(d?.sante?.parTerritoire || []).length === 0 && <p className="text-sm text-pearl/30">Données indisponibles.</p>}
                {(d?.sante?.parTerritoire || []).map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-pearl/70 w-28 truncate">{t.scope_key}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.indice}%`, background: t.indice >= 55 ? '#22C55E' : t.indice >= 40 ? '#EAB308' : '#EF4444' }} />
                    </div>
                    <span className="text-xs text-pearl/50 tabular-nums w-10 text-right">{t.indice}</span>
                    <span className="text-[11px] text-pearl/30 tabular-nums w-14 text-right">{fmt(t.membres)} m.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gouvernement par antenne */}
          {(d?.gouvernance || []).length > 0 && (
            <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-gold" /><h3 className="font-cinzel font-bold text-pearl">Gouvernement par antenne</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-pearl/40 text-xs border-b border-white/5">
                    <th className="text-left py-2 font-medium">Antenne</th><th className="text-right font-medium">Membres</th><th className="text-right font-medium">Actifs</th><th className="text-right font-medium">+30j</th><th className="text-right font-medium">Prières</th><th className="text-right font-medium">Dons</th>
                  </tr></thead>
                  <tbody>
                    {(d?.gouvernance || []).map((g: any, i: number) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        <td className="py-2 text-pearl/80">{g.nom} <span className="text-pearl/30">{g.pays}</span></td>
                        <td className="text-right text-pearl/70 tabular-nums">{fmt(g.membres)}</td>
                        <td className="text-right text-pearl/70 tabular-nums">{fmt(g.membres_actifs)}</td>
                        <td className="text-right text-emerald-400/80 tabular-nums">{fmt(g.nouveaux_30j)}</td>
                        <td className="text-right text-pearl/70 tabular-nums">{fmt(g.prieres)}</td>
                        <td className="text-right text-gold/80 tabular-nums">{fmtDevises(g.dons_par_devise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bandeau capacités */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Compass, label: 'Mission', v: d?.mission?.pulse?.projets_actifs ?? d?.mission?.pulse?.total ?? '—', sub: 'projets' },
              { icon: Flame, label: 'Crise', v: d?.crise?.incidents_ouverts ?? d?.crise?.ouverts ?? '—', sub: 'incidents ouverts' },
              { icon: Brain, label: 'Churn critique', v: d?.prediction?.churn_critique ?? '—', sub: 'membres à risque' },
              { icon: Globe2, label: 'Nations', v: d?.vision?.nations ?? d?.vision?.pays ?? '—', sub: 'touchées' },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2"><c.icon className="w-4 h-4 text-gold/70" /><span className="text-xs text-pearl/50">{c.label}</span></div>
                <div className="font-cinzel font-bold text-2xl text-pearl tabular-nums">{typeof c.v === 'number' ? fmt(c.v) : c.v}</div>
                <div className="text-[11px] text-pearl/30">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-[11px] text-pearl/30">{last && `Mis à jour à ${last} · rafraîchissement automatique 60s`}</div>
        </>
      )}
    </div>
  )
}
