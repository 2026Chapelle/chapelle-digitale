'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Users, ShieldCheck, CalendarCheck, TrendingUp, AlertTriangle, Activity,
  ArrowLeft, Crown, Loader2, ArrowRight,
} from 'lucide-react'

const statutLabel = (s: string) => (s === '—' ? '—' : s.replace(/_/g, ' '))

export default function PlateformesPage() {
  const [overview, setOverview] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [demo, setDemo] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [detail, setDetail] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/member/plateformes', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.demo) { setDemo(true); setLoading(false); return }
        if (r.status === 403) { setDenied(true); setLoading(false); return }
        if (j.ok) setOverview(j.data || [])
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  const openDetail = useCallback(async (slug: string) => {
    setSel(slug); setDetail(null); setLoadingDetail(true)
    try {
      const r = await fetch(`/api/member/plateformes?plateforme=${slug}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setDetail(j.data)
    } catch { /* */ }
    setLoadingDetail(false)
  }, [])

  if (demo) return <Shell><div className="card-royal p-8 text-center text-pearl/60 font-inter">Mode démo : connectez Supabase.</div></Shell>
  if (denied) return <Shell><div className="card-royal p-10 text-center"><ShieldCheck className="w-7 h-7 mx-auto mb-3 text-gold/50" /><p className="font-inter text-sm text-pearl/55">Réservé aux administrateurs et responsables nationaux.</p></div></Shell>

  return (
    <Shell>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card-royal h-36 animate-pulse opacity-40" />)}</div>
      ) : sel ? (
        <DetailView slug={sel} detail={detail} loading={loadingDetail} onBack={() => { setSel(null); setDetail(null) }} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(overview || []).map((p, i) => (
            <motion.button
              key={p.slug}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => openDetail(p.slug)}
              className="card-royal text-left hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <Building2 className="w-4 h-4" style={{ color: '#D4AF37' }} />
                </div>
                <h3 className="font-cinzel text-sm font-bold text-pearl leading-tight">{p.label}</h3>
                <ArrowRight className="w-3.5 h-3.5 text-pearl/25 ml-auto" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Mini icon={Users} label="Membres" value={p.membres} />
                <Mini icon={Users} label="Groupes" value={p.groupes} />
                <Mini icon={Crown} label="Leaders" value={p.leaders} />
                <Mini icon={CalendarCheck} label="Présence" value={`${p.taux_presence}%`} />
                <Mini icon={Activity} label="Engagement" value={p.engagement_moyen} color="#D4AF37" />
                <Mini icon={AlertTriangle} label="Alertes" value={p.alertes_ouvertes} color={p.alertes_ouvertes ? '#EF4444' : undefined} />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </Shell>
  )
}

function DetailView({ slug, detail, loading, onBack }: { slug: string; detail: any; loading: boolean; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-5"><ArrowLeft className="w-4 h-4" /> Toutes les plateformes</button>
      {loading || !detail ? (
        <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      ) : (
        <div className="space-y-5">
          <h2 className="font-cinzel text-xl font-bold text-pearl">{detail.label}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Big icon={Users} label="Membres" value={detail.membres} />
            <Big icon={Users} label="Groupes" value={detail.groupes} />
            <Big icon={Crown} label="Leaders" value={detail.leaders} />
            <Big icon={Activity} label="Engagement moyen" value={detail.engagement_moyen} color="#D4AF37" />
            <Big icon={CalendarCheck} label="Taux de présence" value={`${detail.presence?.taux_presence ?? 0}%`} color="#22C55E" />
            <Big icon={CalendarCheck} label="Assiduité" value={`${detail.presence?.taux_assiduite ?? 0}%`} />
            <Big icon={ShieldCheck} label="Rétention (30j)" value={`${detail.retention ?? 0}%`} color="#22C55E" />
            <Big icon={AlertTriangle} label="Alertes ouvertes" value={detail.alertes_ouvertes} color={detail.alertes_ouvertes ? '#EF4444' : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Croissance */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Croissance (nouveaux / mois)</h3>
              {(!detail.croissance || detail.croissance.length === 0) ? <p className="text-xs text-pearl/35 font-inter">Aucune donnée.</p> : (
                <Bars data={detail.croissance.map((c: any) => ({ label: c.period.slice(5), value: c.count }))} />
              )}
            </div>
            {/* Conversions */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gold" /> Conversions de statut</h3>
              {(detail.conversions?.total_transitions ?? 0) === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucune conversion enregistrée.</p> : (
                <>
                  <Bars data={(detail.conversions?.conversions_over_time ?? []).map((c: any) => ({ label: c.period.slice(5), value: c.total }))} />
                  <div className="space-y-1 mt-3">
                    {(detail.conversions?.top_transitions ?? []).map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-inter">
                        <span className="text-pearl/55">{statutLabel(t.from)}</span>
                        <ArrowRight className="w-3 h-3 text-pearl/25" />
                        <span className="text-pearl/75">{statutLabel(t.to)}</span>
                        <span className="ml-auto font-semibold" style={{ color: '#D4AF37' }}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="mb-8">
          <div className="section-label mb-2">Gouvernement pastoral</div>
          <h1 className="font-cinzel font-black text-pearl" style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', lineHeight: 1.05 }}>
            Dashboard <span className="text-cinematic-gold">Plateformes</span>
          </h1>
          <p className="text-pearl/50 text-sm font-inter mt-2">Pilotage des 8 plateformes officielles — lecture seule.</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function Mini({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-1 mb-0.5"><Icon className="w-2.5 h-2.5" style={{ color: color || 'rgba(245,230,216,0.4)' }} /><span className="text-[9px] font-inter text-pearl/40">{label}</span></div>
      <div className="font-cinzel text-sm font-bold" style={{ color: color || '#F5E6A7' }}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</div>
    </div>
  )
}

function Big({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <div className="card-royal py-3 px-3.5">
      <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3" style={{ color: color || 'rgba(245,230,216,0.4)' }} /><span className="text-[10px] font-inter text-pearl/45">{label}</span></div>
      <div className="font-cinzel text-lg font-black" style={{ color: color || '#F5E6A7' }}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</div>
    </div>
  )
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.label} : ${d.value}`}>
          <div className="w-full rounded-t" style={{ height: `${Math.round((d.value / max) * 100)}%`, minHeight: 3, background: 'rgba(212,175,55,0.5)' }} />
          <span className="text-[9px] font-inter text-pearl/30">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
