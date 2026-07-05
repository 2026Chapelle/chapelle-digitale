'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Users, UserCheck, UserX, UserMinus, GraduationCap, Crown, TrendingUp, MapPin, Loader2, ArrowRight, CalendarDays, HeartHandshake, HandHeart } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export default function PastoralOverviewPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/pastoral/overview', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.ok && j.data) setD(j.data)
      } catch { /* noop */ }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>

  const k = d || { total: 0, nouveaux_7j: 0, nouveaux_30j: 0, actifs: 0, inactifs: 0, jamais: 0, par_statut: [], par_pays: [], par_ville: [], croissance: [], integration_moyenne: 0, academie_debloquee: 0, evenements: 0, prieres: 0, dons: { count: 0, total: 0, currency: 'EUR' } }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader eyebrow="Pilotage global de l'œuvre" title={<>Centre de Gouvernement <span className="text-cinematic-gold">Pastoral</span></>}
            description="Indicateurs globaux : croissance, intégration, académie, événements, prière, dons, pays, villes." />
          <Link href="/admin/membres" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 mt-2">Gérer les membres <ArrowRight className="w-4 h-4" /></Link>
        </div>

        {!d && <div className="card-royal p-4 mb-6 text-sm text-pearl/55 font-inter">Connectez Supabase pour afficher les données réelles.</div>}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Kpi icon={Users} label="Total membres" value={k.total} color="#D4AF37" />
          <Kpi icon={TrendingUp} label="Nouveaux (30j)" value={k.nouveaux_30j} sub={`${k.nouveaux_7j} sur 7j`} color="#0EA5E9" />
          <Kpi icon={UserCheck} label="Actifs" value={k.actifs} color="#22C55E" />
          <Kpi icon={UserX} label="Inactifs" value={k.inactifs} sub={`${k.jamais} jamais connectés`} color="#EF4444" />
          <Kpi icon={GraduationCap} label="Intégration moy." value={`${k.integration_moyenne}%`} color="#8B5CF6" />
          <Kpi icon={Crown} label="Académie débloquée" value={k.academie_debloquee} color="#EC4899" />
          <Kpi icon={CalendarDays} label="Événements suivis" value={k.evenements} color="#F59E0B" />
          <Kpi icon={HeartHandshake} label="Demandes de prière" value={k.prieres} color="#14B8A6" />
          <Kpi icon={HandHeart} label="Dons (total)" value={`${k.dons?.total ?? 0} ${k.dons?.currency ?? ''}`} sub={`${k.dons?.count ?? 0} dons`} color="#A855F7" />
          <Kpi icon={MapPin} label="Pays représentés" value={(k.par_pays || []).length} color="#0EA5E9" />
          <Kpi icon={Users} label="Villes représentées" value={(k.par_ville || []).length} color="#22C55E" />
        </div>

        {/* Courbe de croissance */}
        <div className="card-royal mb-6">
          <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Courbe de croissance (inscriptions / mois)</h2>
          {(k.croissance || []).length === 0 ? <p className="text-xs text-pearl/35 font-inter">Pas encore de données.</p> : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={k.croissance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#120023', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3, fill: '#D4AF37' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Répartitions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Repartition title="Par statut spirituel" items={k.par_statut} color="#D4AF37" />
          <Repartition title="Par pays" items={k.par_pays} color="#0EA5E9" />
          <Repartition title="Par ville" items={k.par_ville} color="#22C55E" />
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: any; sub?: string; color: string }) {
  return (
    <div className="card-royal py-5 px-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel text-2xl font-black text-pearl">{value}</div>
      <div className="text-xs text-pearl/40 font-inter mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-pearl/30 font-inter mt-0.5">{sub}</div>}
    </div>
  )
}

function Repartition({ title, items, color }: { title: string; items: { label: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...(items || []).map((i) => i.count))
  return (
    <div className="card-royal">
      <h3 className="font-cinzel font-bold text-pearl text-sm mb-4">{title}</h3>
      {(!items || items.length === 0) ? <p className="text-xs text-pearl/35 font-inter">Aucune donnée.</p> : (
        <div className="space-y-2.5">
          {items.map((it) => (
            <div key={it.label}>
              <div className="flex items-center justify-between text-xs font-inter mb-1"><span className="text-pearl/60 capitalize truncate">{it.label.replace('_', ' ')}</span><span className="text-pearl/40">{it.count}</span></div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(it.count / max) * 100}%`, background: color }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
