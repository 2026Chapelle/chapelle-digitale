'use client'
import { useEffect, useState } from 'react'
import {
  Loader2, AlertTriangle, Users, UserPlus, Heart, GraduationCap, Award,
  HandCoins, Sparkles, TrendingUp, CalendarCheck, ShieldAlert, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

interface Gov {
  croissance: { fideles: number; nouveaux_30j: number; par_statut: { statut: string; n: number }[]; funnel: any }
  fidelite: { participations: number; inscriptions_evenements: number }
  formation: { inscrits: number; termines: number; abandons: number; certificats: number; progression_moyenne: number }
  priere: { total: number; par_statut: Record<string, number>; non_assignees: number; exaucees: number }
  dons: { total: number; montant_total: number }
  temoignages: { soumis: number; valides: number }
  alertes: { severite: 'haute' | 'moyenne' | 'info'; titre: string; detail: string; count: number; href: string }[]
}

const SEV: Record<string, { bg: string; bd: string; fg: string }> = {
  haute:   { bg: 'rgba(239,68,68,0.10)', bd: 'rgba(239,68,68,0.35)', fg: '#F87171' },
  moyenne: { bg: 'rgba(245,158,11,0.10)', bd: 'rgba(245,158,11,0.35)', fg: '#FBBF24' },
  info:    { bg: 'rgba(59,130,246,0.10)', bd: 'rgba(59,130,246,0.30)', fg: '#60A5FA' },
}

export default function GouvernancePage() {
  const [g, setG] = useState<Gov | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/gouvernance', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.demo) setDemo(true)
        else if (j.ok) setG(j)
        else setError(j.message || 'Erreur')
      } catch { setError('Erreur réseau') }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Gouvernement pastoral"
          title={<>Cockpit de <span className="text-cinematic-gold">gouvernance</span></>}
          description="Croissance, fidélité, formation, prière, dons et santé spirituelle — en temps réel depuis Supabase."
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour les indicateurs réels.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !g ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune donnée disponible pour le moment.</div>
        ) : (
          <>
            {/* Alertes santé spirituelle */}
            <div className="card-cinematic p-5 mb-6">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-gold" /> Santé spirituelle — alertes intelligentes</h2>
              {g.alertes.length === 0 ? (
                <p className="text-sm text-emerald-400/80 font-inter flex items-center gap-2"><Sparkles className="w-4 h-4" /> Aucune alerte : tout est sous contrôle. Gloire à Dieu.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {g.alertes.map((a, i) => {
                    const c = SEV[a.severite]
                    return (
                      <Link key={i} href={a.href} className="rounded-xl p-3.5 flex items-start gap-3 transition-transform hover:-translate-y-0.5"
                        style={{ background: c.bg, border: `1px solid ${c.bd}` }}>
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.fg }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel font-bold text-sm" style={{ color: c.fg }}>{a.count}</span>
                            <span className="font-inter text-sm text-pearl/80">{a.titre}</span>
                          </div>
                          <p className="font-inter text-[11px] text-pearl/40 mt-0.5">{a.detail}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-pearl/30 flex-shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi icon={Users} color="#60A5FA" value={g.croissance.fideles} label="Fidèles inscrits" />
              <Kpi icon={UserPlus} color="#22C55E" value={g.croissance.nouveaux_30j} label="Nouveaux (30 j)" />
              <Kpi icon={Heart} color="#EC4899" value={g.priere.total} label="Demandes de prière" />
              <Kpi icon={Sparkles} color="#FBBF24" value={g.priere.exaucees} label="Prières exaucées" />
              <Kpi icon={GraduationCap} color="#0EA5E9" value={g.formation.inscrits} label="Inscrits formations" />
              <Kpi icon={Award} color="#D4AF37" value={g.formation.certificats} label="Certificats délivrés" />
              <Kpi icon={CalendarCheck} color="#A855F7" value={g.fidelite.participations} label="Participations events" />
              <Kpi icon={HandCoins} color="#EAB308" value={g.dons.total} label="Dons enregistrés" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Prière par statut */}
              <div className="card-cinematic p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-gold" /> Workflow de prière</h2>
                {Object.keys(g.priere.par_statut).length === 0 ? (
                  <p className="text-pearl/40 text-sm font-inter py-6 text-center">Aucune donnée disponible pour le moment.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(g.priere.par_statut).sort((a, b) => b[1] - a[1]).map(([statut, n]) => {
                      const max = Math.max(...Object.values(g.priere.par_statut), 1)
                      return (
                        <div key={statut}>
                          <div className="flex items-center justify-between text-xs font-inter mb-1">
                            <span className="text-pearl/60 capitalize">{statut.replace(/_/g, ' ')}</span><span className="text-pearl/40 font-semibold">{n}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: 'linear-gradient(90deg,#7C3AED,#EC4899)' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Formation */}
              <div className="card-cinematic p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-gold" /> Formation & discipulat</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Mini label="Progression moyenne" value={`${g.formation.progression_moyenne}%`} />
                  <Mini label="Formations terminées" value={g.formation.termines} />
                  <Mini label="Certificats" value={g.formation.certificats} />
                  <Mini label="Abandons" value={g.formation.abandons} />
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                  <Mini label="Témoignages publiés" value={g.temoignages.valides} />
                  <Mini label="À modérer" value={g.temoignages.soumis} />
                </div>
              </div>
            </div>

            {/* Croissance par statut */}
            <div className="card-cinematic p-5">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Répartition des fidèles par statut</h2>
              {g.croissance.par_statut.length === 0 ? (
                <p className="text-pearl/40 text-sm font-inter py-6 text-center">Aucune donnée disponible pour le moment.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {g.croissance.par_statut.map((s) => (
                    <span key={s.statut} className="text-xs font-inter px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-pearl/70 capitalize">
                      {s.statut.replace(/_/g, ' ')} · <strong className="text-pearl">{s.n}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <div className="card-cinematic p-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="font-cinzel text-2xl font-black text-pearl leading-none">{value.toLocaleString('fr-FR')}</div>
      <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{label}</div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
      <div className="font-cinzel text-lg font-bold text-pearl leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{label}</div>
    </div>
  )
}
