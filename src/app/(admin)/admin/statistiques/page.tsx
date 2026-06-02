'use client'
import { useEffect, useState } from 'react'
import { Loader2, Users, Globe, BookOpen, Heart, Radio, Mail, FileText, HandCoins, GraduationCap, TrendingUp, Award } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface Stats {
  membres: { total: number; par_pays: { pays: string; n: number }[]; par_statut: { statut: string; n: number }[]; pays_distincts: number }
  contenus: { articles: number; pages: number; medias: number; lives: number; events: number; formations: number }
  engagement: { prieres: number; messages: number; newsletter: number; adhesions: number; dons: number }
  lms?: { inscrits: number; progression_moyenne: number; taux_completion: number; termines: number; abandons: number; certificats: number }
}

export default function AdminStatsPage() {
  const [s, setS] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/stats', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.demo) setDemo(true)
        else if (j.ok) setS(j)
        else setError(j.message || 'Erreur')
      } catch { setError('Erreur réseau') }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>Statistiques <span className="text-cinematic-gold">réelles</span></>} description="Comptages exacts depuis Supabase — aucune donnée inventée." />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour les chiffres réels.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !s ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune donnée disponible pour le moment.</div>
        ) : (
          <>
            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi icon={Users} color="#60A5FA" value={s.membres.total} label="Fidèles inscrits" />
              <Kpi icon={Globe} color="#22C55E" value={s.membres.pays_distincts} label="Pays représentés" />
              <Kpi icon={Heart} color="#EC4899" value={s.engagement.prieres} label="Demandes de prière" />
              <Kpi icon={HandCoins} color="#EAB308" value={s.engagement.dons} label="Dons enregistrés" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Membres par pays */}
              <div className="card-cinematic p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-gold" /> Fidèles par pays</h2>
                {s.membres.par_pays.length === 0 ? (
                  <p className="text-pearl/40 text-sm font-inter py-6 text-center">Aucune donnée disponible pour le moment.</p>
                ) : (
                  <div className="space-y-2">
                    {s.membres.par_pays.map((p) => {
                      const max = s.membres.par_pays[0].n || 1
                      return (
                        <div key={p.pays}>
                          <div className="flex items-center justify-between text-xs font-inter mb-1">
                            <span className="text-pearl/60">{p.pays}</span><span className="text-pearl/40 font-semibold">{p.n}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(p.n / max) * 100}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Membres par statut */}
              <div className="card-cinematic p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-gold" /> Répartition par statut</h2>
                {s.membres.par_statut.length === 0 ? (
                  <p className="text-pearl/40 text-sm font-inter py-6 text-center">Aucune donnée disponible pour le moment.</p>
                ) : (
                  <div className="space-y-2">
                    {s.membres.par_statut.map((p) => (
                      <div key={p.statut} className="flex items-center justify-between text-sm font-inter py-1.5 border-b border-white/5">
                        <span className="text-pearl/60 capitalize">{p.statut.replace(/_/g, ' ')}</span><span className="text-gold font-cinzel font-bold">{p.n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* LMS — formation & discipulat */}
            {s.lms && (
              <div className="card-cinematic p-5 mb-6">
                <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-gold" /> LMS — Formation & discipulat</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Mini icon={Users} label="Inscrits" value={s.lms.inscrits} />
                  <Mini icon={TrendingUp} label="Progression moy. %" value={s.lms.progression_moyenne} />
                  <Mini icon={Award} label="Complétion %" value={s.lms.taux_completion} />
                  <Mini icon={Award} label="Terminés" value={s.lms.termines} />
                  <Mini icon={Award} label="Certificats" value={s.lms.certificats} />
                  <Mini icon={Users} label="Abandons" value={s.lms.abandons} />
                </div>
              </div>
            )}

            {/* Volumes contenu & engagement */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Mini icon={FileText} label="Pages" value={s.contenus.pages} />
              <Mini icon={BookOpen} label="Articles" value={s.contenus.articles} />
              <Mini icon={Radio} label="Lives" value={s.contenus.lives} />
              <Mini icon={BookOpen} label="Médias" value={s.contenus.medias} />
              <Mini icon={Mail} label="Messages" value={s.engagement.messages} />
              <Mini icon={Mail} label="Newsletter" value={s.engagement.newsletter} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <div className="card-cinematic p-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel font-black text-3xl text-pearl">{value}</div>
      <div className="text-pearl/40 text-xs font-inter mt-0.5">{label}</div>
    </div>
  )
}
function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="card-cinematic p-4 text-center">
      <Icon className="w-4 h-4 mx-auto mb-2 text-gold/60" />
      <div className="font-cinzel font-black text-xl text-pearl">{value}</div>
      <div className="text-pearl/35 text-[11px] font-inter">{label}</div>
    </div>
  )
}
