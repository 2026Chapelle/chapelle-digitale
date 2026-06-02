'use client'
import { useEffect, useState } from 'react'
import { Loader2, Globe, Users, Crown, Heart, GraduationCap, TrendingUp, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/PageHeader'
import { flagOf } from '@/lib/flags'

// recharts (~100 kB) chargé à la demande, hors bundle principal.
const GrowthChart = dynamic(() => import('@/components/ui/GrowthChart'), {
  ssr: false,
  loading: () => <div style={{ height: 240 }} className="flex items-center justify-center text-pearl/30 text-xs font-inter">Chargement du graphe…</div>,
})

interface Pays { pays: string; inscrits: number; membres: number; responsables: number; nouveaux_30j: number; prieres: number; formations: number }
interface Data {
  nations: Pays[]
  croissance: { mois: string; n: number }[]
  visiteurs: { pays: string; n: number }[]
  totaux: { pays: number; inscrits: number; membres: number; responsables: number; prieres: number; formations: number }
}

export default function AdminInternationalPage() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/international', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.demo) setDemo(true)
        else if (j.ok) setD(j)
        else setError(j.message || 'Erreur')
      } catch { setError('Erreur réseau') }
      setLoading(false)
    })()
  }, [])

  const maxInscrits = d ? Math.max(...d.nations.map((n) => n.inscrits), 1) : 1

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Gouvernement international"
          title={<>Expansion du <span className="text-cinematic-gold">Royaume</span></>}
          description="Présence par nation, classement des territoires et croissance mensuelle — données réelles Supabase."
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !d || d.nations.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune donnée géographique disponible pour le moment.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi icon={Globe} color="#22C55E" value={d.totaux.pays} label="Nations représentées" />
              <Kpi icon={Users} color="#60A5FA" value={d.totaux.inscrits} label="Inscrits (monde)" />
              <Kpi icon={Crown} color="#D4AF37" value={d.totaux.responsables} label="Responsables" />
              <Kpi icon={Heart} color="#EC4899" value={d.totaux.prieres} label="Prières (monde)" />
            </div>

            {/* Carte des nations */}
            <div className="card-cinematic p-5 mb-6">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> Carte des nations</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {d.nations.slice(0, 24).map((n) => (
                  <div key={n.pays} className="rounded-xl bg-white/[0.03] border border-white/8 p-3 flex items-center gap-3">
                    <span className="text-2xl">{flagOf(n.pays)}</span>
                    <div className="min-w-0">
                      <p className="font-inter text-xs font-semibold text-pearl/80 truncate">{n.pays}</p>
                      <p className="font-inter text-[10px] text-pearl/40">{n.inscrits} inscrit{n.inscrits > 1 ? 's' : ''}{n.membres ? ` · ${n.membres} membre${n.membres > 1 ? 's' : ''}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Classement des nations */}
              <div className="card-cinematic p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Classement des nations</h2>
                <div className="space-y-2.5">
                  {d.nations.slice(0, 10).map((n, i) => (
                    <div key={n.pays}>
                      <div className="flex items-center justify-between text-xs font-inter mb-1">
                        <span className="text-pearl/70 flex items-center gap-1.5"><span className="text-pearl/30 w-4">{i + 1}.</span> {flagOf(n.pays)} {n.pays}</span>
                        <span className="text-pearl/50 font-semibold">{n.inscrits}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(n.inscrits / maxInscrits) * 100}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Croissance mensuelle */}
              <div className="card-cinematic p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Croissance mensuelle (inscrits)</h2>
                {d.croissance.length === 0 ? (
                  <p className="text-pearl/40 text-sm font-inter py-8 text-center">Aucune donnée disponible.</p>
                ) : (
                  <GrowthChart data={d.croissance} />
                )}
              </div>
            </div>

            {/* Tableau détaillé */}
            <div className="card-cinematic p-5 overflow-x-auto">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-gold" /> Détail par nation</h2>
              <table className="w-full text-sm font-inter">
                <thead>
                  <tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                    <th className="py-2 pr-3">Pays</th>
                    <th className="py-2 px-2 text-right">Inscrits</th>
                    <th className="py-2 px-2 text-right">Membres</th>
                    <th className="py-2 px-2 text-right">Resp.</th>
                    <th className="py-2 px-2 text-right">Nouv. 30j</th>
                    <th className="py-2 px-2 text-right">Prières</th>
                    <th className="py-2 px-2 text-right">Formations</th>
                  </tr>
                </thead>
                <tbody>
                  {d.nations.map((n) => (
                    <tr key={n.pays} className="border-b border-white/[0.03]">
                      <td className="py-2 pr-3 text-pearl/75">{flagOf(n.pays)} {n.pays}</td>
                      <td className="py-2 px-2 text-right text-pearl/60">{n.inscrits}</td>
                      <td className="py-2 px-2 text-right text-pearl/60">{n.membres}</td>
                      <td className="py-2 px-2 text-right text-pearl/60">{n.responsables}</td>
                      <td className="py-2 px-2 text-right text-emerald-400/70">{n.nouveaux_30j}</td>
                      <td className="py-2 px-2 text-right text-pearl/60">{n.prieres}</td>
                      <td className="py-2 px-2 text-right text-pearl/60">{n.formations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
