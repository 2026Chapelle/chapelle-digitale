'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { UserPlus, Users, Sparkles, Heart, Loader2, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import { isIntegration } from '@/lib/roles'

interface Nouveau {
  id: string; prenom: string; nom: string; email: string; pays?: string; ville?: string
  membre_statut: string; plateforme_principale?: string; parcours_disciple_etape?: number; date_inscription: string
}
interface Data {
  nouveaux: Nouveau[]
  par_statut: Record<string, number>
  totals: { membres: number; a_integrer: number; actifs: number; disciples: number }
}

const STATUT_LABELS: Record<string, string> = {
  visiteur: 'Visiteurs', nouveau_membre: 'Nouveaux', membre_actif: 'Membres actifs',
  disciple: 'Disciples', leader_cellule: 'Leaders', berger: 'Bergers', pasteur: 'Pasteurs',
}

const DEMO: Data = {
  totals: { membres: 342, a_integrer: 47, actifs: 168, disciples: 73 },
  par_statut: { visiteur: 29, nouveau_membre: 18, membre_actif: 168, disciple: 73, leader_cellule: 31, berger: 18, pasteur: 5 },
  nouveaux: [
    { id: '1', prenom: 'Marie', nom: 'K.', email: 'marie@ex.com', pays: 'France', ville: 'Lyon', membre_statut: 'nouveau_membre', plateforme_principale: 'cier', parcours_disciple_etape: 1, date_inscription: '2026-05-28' },
    { id: '2', prenom: 'David', nom: 'M.', email: 'david@ex.com', pays: 'RDC', ville: 'Kinshasa', membre_statut: 'visiteur', plateforme_principale: 'jeunesse', parcours_disciple_etape: 0, date_inscription: '2026-05-27' },
    { id: '3', prenom: 'Sarah', nom: 'B.', email: 'sarah@ex.com', pays: 'Canada', ville: 'Montréal', membre_statut: 'nouveau_membre', plateforme_principale: 'femmes-exceptions', parcours_disciple_etape: 1, date_inscription: '2026-05-26' },
  ],
}

const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) } catch { return '—' } }

export default function IntegrationDashboard() {
  const { role, isDemo, loading: authLoading } = useAuth()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const allowed = isDemo || isIntegration(role)

  useEffect(() => {
    if (authLoading) return
    if (isDemo) { setData(DEMO); setLoading(false); return }
    if (!isIntegration(role)) { setLoading(false); return }
    ;(async () => {
      try {
        const r = await fetch('/api/member/integration', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.ok) setData(j.data)
      } catch { /* noop */ }
      setLoading(false)
    })()
  }, [authLoading, isDemo, role])

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
  }

  if (!allowed) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container-royal max-w-lg text-center">
          <Lock className="w-10 h-10 text-gold/60 mx-auto mb-4" />
          <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">Espace Intégration</h1>
          <p className="text-pearl/50 font-inter text-sm mb-6">Cet espace est réservé aux responsables de l'intégration des nouveaux membres.</p>
          <Link href="/member/dashboard" className="btn-gold-cinematic px-5 py-2.5 text-sm">Retour au tableau de bord</Link>
        </div>
      </div>
    )
  }

  const t = data?.totals
  const kpis = [
    { label: 'Membres', value: t?.membres ?? 0, icon: Users, color: '#0EA5E9' },
    { label: 'À intégrer', value: t?.a_integrer ?? 0, icon: UserPlus, color: '#F59E0B' },
    { label: 'Actifs', value: t?.actifs ?? 0, icon: Heart, color: '#22C55E' },
    { label: 'Disciples', value: t?.disciples ?? 0, icon: Sparkles, color: '#D4AF37' },
  ]
  const maxStatut = Math.max(1, ...Object.values(data?.par_statut || {}))

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Intégration"
          title={<>Parcours <span className="text-cinematic-gold">d'intégration</span></>}
          description="Accompagnez les nouveaux arrivants jusqu'à leur pleine intégration."
        />

        {isDemo && (
          <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">
            Mode démo : données d'exemple. Connectez Supabase pour le suivi réel.
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-cinematic p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.color}18` }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div className="font-cinzel font-black text-2xl text-pearl">{k.value}</div>
              <div className="text-pearl/40 text-xs font-inter mt-0.5">{k.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Funnel par statut */}
          <div className="card-cinematic p-5">
            <h2 className="font-cinzel font-bold text-pearl text-sm mb-4">Répartition par statut</h2>
            <div className="space-y-3">
              {Object.entries(STATUT_LABELS).map(([key, label]) => {
                const v = data?.par_statut?.[key] ?? 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs font-inter mb-1">
                      <span className="text-pearl/55">{label}</span>
                      <span className="text-pearl/40">{v}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(v / maxStatut) * 100}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Nouveaux arrivants */}
          <div className="card-cinematic overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-gold" />
              <h2 className="font-cinzel font-bold text-pearl text-sm">Nouveaux arrivants</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                    <th className="px-5 py-3">Membre</th>
                    <th className="px-5 py-3">Pays</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">Inscrit</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.nouveaux || []).length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-pearl/30 font-inter">Aucun nouvel arrivant.</td></tr>
                  )}
                  {(data?.nouveaux || []).map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="text-pearl/80 font-medium">{m.prenom} {m.nom}</div>
                        <div className="text-pearl/35 text-xs">{m.email}</div>
                      </td>
                      <td className="px-5 py-3 text-pearl/50">{m.pays || '—'}{m.ville ? `, ${m.ville}` : ''}</td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter capitalize"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                          {(STATUT_LABELS[m.membre_statut] || m.membre_statut).replace(/s$/, '')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-pearl/50">{fmt(m.date_inscription)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
