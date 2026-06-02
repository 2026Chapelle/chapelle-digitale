'use client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Globe, Users, Crown, Heart, HandCoins, GraduationCap, Radio, Calendar, ShieldAlert, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import { flagOf } from '@/lib/flags'

interface Stats { inscrits: number; membres: number; responsables: number; prieres: number; cure_ame: number; dons: number; formations: number; live_views: number; evenements: number }
interface Data { role: string; isSuper: boolean; scope: string; nations: string[]; stats: Stats }

export default function NationDashboardPage() {
  const { isDemo } = useAuth()
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [pays, setPays] = useState('')

  const load = useCallback(async (p?: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/member/nation${p ? `?pays=${encodeURIComponent(p)}` : ''}`, { credentials: 'same-origin' })
      if (r.status === 403) { setForbidden(true); setLoading(false); return }
      const j = await r.json()
      if (j.ok) setD(j)
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { if (!isDemo) load() }, [isDemo, load])

  if (forbidden) {
    return (
      <div className="min-h-screen bg-abyss pt-24 pb-16"><div className="container-royal">
        <div className="card-royal text-center py-16 max-w-lg mx-auto">
          <Lock className="w-10 h-10 text-gold/50 mx-auto mb-4" />
          <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">Accès réservé</h1>
          <p className="font-inter text-sm text-pearl/50">Ce tableau de bord est réservé aux responsables de nation. Contactez la direction pastorale pour une affectation.</p>
        </div>
      </div></div>
    )
  }

  const KPIS = d ? [
    { icon: Users, color: '#60A5FA', value: d.stats.inscrits, label: 'Inscrits' },
    { icon: Crown, color: '#22C55E', value: d.stats.membres, label: 'Membres' },
    { icon: Heart, color: '#EC4899', value: d.stats.prieres, label: 'Demandes de prière' },
    { icon: HandCoins, color: '#EAB308', value: d.stats.dons, label: 'Dons' },
    { icon: GraduationCap, color: '#0EA5E9', value: d.stats.formations, label: 'Formations suivies' },
    { icon: Radio, color: '#EF4444', value: d.stats.live_views, label: 'Vues live' },
    { icon: Calendar, color: '#A855F7', value: d.stats.evenements, label: 'Événements' },
    { icon: ShieldAlert, color: '#F97316', value: d.stats.cure_ame, label: 'Cure d\'âme (confidentiel)' },
  ] : []

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Gouvernement par nation"
          title={<>Tableau de bord <span className="text-cinematic-gold">national</span></>}
          description="Statistiques limitées à votre périmètre pastoral. La portée est garantie côté serveur."
        />

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !d ? (
          <div className="card-royal p-10 text-center text-pearl/40 font-inter">Aucune donnée disponible.</div>
        ) : (
          <>
            <div className="card-royal mb-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-inter text-sm text-pearl/70">
                <Globe className="w-4 h-4 text-gold" /> Périmètre : <strong className="text-pearl">{d.scope !== 'Toutes les nations' ? `${flagOf(d.scope)} ${d.scope}` : 'Toutes les nations'}</strong>
              </div>
              {d.isSuper && (
                <select value={pays} onChange={(e) => { setPays(e.target.value); load(e.target.value) }} className="input-royal text-sm">
                  <option value="">Toutes les nations</option>
                  {d.nations.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {KPIS.map((k) => (
                <div key={k.label} className="card-royal">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                    <k.icon className="w-4 h-4" style={{ color: k.color }} />
                  </div>
                  <div className="font-cinzel text-2xl font-black text-pearl leading-none">{k.value.toLocaleString('fr-FR')}</div>
                  <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{k.label}</div>
                </div>
              ))}
            </div>

            <p className="font-inter text-[11px] text-pearl/30 mt-6">
              Confidentialité : la cure d&apos;âme et la prière n&apos;affichent qu&apos;un comptage agrégé — jamais de contenu nominatif. Chaque consultation est journalisée.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
