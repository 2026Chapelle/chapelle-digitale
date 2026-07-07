'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Users, UserCheck, UserX, GraduationCap, Crown, TrendingUp, MapPin, Loader2, ArrowRight, CalendarDays, HeartHandshake, HandHeart, UserPlus, Clock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

// Statuts réels des demandes Nouveau Venu (public.newcomer_intakes) — libellés/couleurs cockpit.
const NV_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: '#0EA5E9' },
  to_review: { label: 'À revoir', color: '#EAB308' },
  contacted: { label: 'Contacté', color: '#8B5CF6' },
  converted: { label: 'Intégré', color: '#22C55E' },
  duplicate: { label: 'Doublon', color: '#6B7280' },
  archived: { label: 'Archivé', color: '#6B7280' },
}
const fmtNvDate = (iso: string | null) => { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return iso } }

/** Carte compacte « nouveaux venus » (V2.2-A — données réelles, lien vers l'inbox). */
function NvCard({ href, icon: Icon, label, value, color }: { href: string; icon: any; label: string; value: number; color: string }) {
  return (
    <Link href={href} className="card-royal py-4 text-center group hover:border-gold/20 transition-all block">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="font-cinzel text-xl font-black text-pearl">{value}</div>
      <div className="text-[11px] text-pearl/40 font-inter mt-0.5">{label}</div>
    </Link>
  )
}

export default function PastoralOverviewPage() {
  const [d, setD] = useState<any>(null)
  const [nv, setNv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [ro, rn] = await Promise.all([
          fetch('/api/admin/pastoral/overview', { credentials: 'same-origin' }),
          fetch('/api/admin/pastoral/newcomer-stats', { credentials: 'same-origin' }),
        ])
        const jo = await ro.json().catch(() => ({}))
        if (jo.ok && jo.data) setD(jo.data)
        const jn = await rn.json().catch(() => ({}))
        if (jn.ok && jn.data) setNv(jn.data)
      } catch { /* noop */ }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>

  const k = d || { total: 0, nouveaux_7j: 0, nouveaux_30j: 0, actifs: 0, inactifs: 0, jamais: 0, par_statut: [], par_pays: [], par_ville: [], croissance: [], integration_moyenne: 0, academie_debloquee: 0, evenements: 0, prieres: 0, dons: { count: 0, total: 0, currency: 'EUR' } }
  const nvData = nv || { total: 0, by_status: {}, a_traiter: 0, nouveaux_7j: 0, nouveaux_30j: 0, contactes: 0, integres: 0, derniers: [] }
  const derniers: any[] = nvData.derniers || []

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader eyebrow="Pilotage global de l'œuvre" title={<>Centre de Gouvernement <span className="text-cinematic-gold">Pastoral</span></>}
            description="Indicateurs globaux : croissance, intégration, académie, événements, prière, dons, pays, villes." />
          <Link href="/admin/membres" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 mt-2">Gérer les membres <ArrowRight className="w-4 h-4" /></Link>
        </div>

        {!d && <div className="card-royal p-4 mb-6 text-sm text-pearl/55 font-inter">Connectez Supabase pour afficher les données réelles.</div>}

        {/* Nouveaux venus — données réelles (public.newcomer_intakes, V2.2-A) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-gold" /> Nouveaux venus</h2>
            <Link href="/admin/nouveaux-venus" className="text-[11px] font-inter font-semibold text-gold hover:gap-2 inline-flex items-center gap-1 transition-all">
              Ouvrir l&apos;inbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <NvCard href="/admin/nouveaux-venus" icon={UserPlus} label="Total demandes" value={nvData.total} color="#D4AF37" />
            <NvCard href="/admin/nouveaux-venus" icon={TrendingUp} label="Nouveaux (7j)" value={nvData.nouveaux_7j} color="#0EA5E9" />
            <NvCard href="/admin/nouveaux-venus" icon={Clock} label="À traiter" value={nvData.a_traiter} color="#F59E0B" />
            <NvCard href="/admin/nouveaux-venus" icon={HeartHandshake} label="Contactés" value={nvData.contactes} color="#8B5CF6" />
            <NvCard href="/admin/nouveaux-venus" icon={UserCheck} label="Intégrés" value={nvData.integres} color="#22C55E" />
          </div>

          {/* Aperçu des dernières demandes réelles */}
          <div className="card-royal overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h3 className="font-inter text-[11px] uppercase tracking-wider text-pearl/40">Dernières demandes</h3>
              <Link href="/admin/nouveaux-venus" className="text-[11px] font-inter text-gold hover:gap-2 inline-flex items-center gap-1 transition-all">Voir tout <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {derniers.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-pearl/35 font-inter">Aucune demande Nouveau Venu pour le moment.</p>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {derniers.map((r) => {
                  const st = NV_STATUS[r.status] || { label: r.status, color: '#6B7280' }
                  return (
                    <Link key={r.id} href="/admin/nouveaux-venus" className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <div className="min-w-0 truncate">
                        <span className="text-pearl/85 font-inter text-sm">{r.prenom} {r.nom || ''}</span>
                        <span className="text-[11px] text-pearl/35 font-inter ml-2">{r.source || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
                        <span className="text-[11px] text-pearl/40 font-inter whitespace-nowrap">{fmtNvDate(r.created_at)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

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
