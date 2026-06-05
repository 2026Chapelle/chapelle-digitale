'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GraduationCap, Users, TrendingUp, Award, Loader2, Lock, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import { isFormateur } from '@/lib/roles'

interface FormationRow {
  id: string; titre: string; slug: string; statut: string; niveau: string
  inscrits: number; progression_moyenne: number; termines: number
}
interface Totals { formations: number; apprenants: number; progression_moyenne: number; termines: number; publiees: number }

const DEMO: { formations: FormationRow[]; totals: Totals } = {
  totals: { formations: 4, apprenants: 128, progression_moyenne: 62, termines: 37, publiees: 3 },
  formations: [
    { id: '1', titre: 'Fondations de la foi', slug: 'fondations', statut: 'publie', niveau: 'debutant', inscrits: 54, progression_moyenne: 71, termines: 18 },
    { id: '2', titre: 'École des intercesseurs', slug: 'intercession', statut: 'publie', niveau: 'intermediaire', inscrits: 41, progression_moyenne: 58, termines: 12 },
    { id: '3', titre: 'Leadership du Royaume', slug: 'leadership', statut: 'publie', niveau: 'avance', inscrits: 23, progression_moyenne: 49, termines: 7 },
    { id: '4', titre: 'Marche prophétique', slug: 'prophetique', statut: 'brouillon', niveau: 'expert', inscrits: 10, progression_moyenne: 40, termines: 0 },
  ],
}

export default function FormateurDashboard() {
  const { role, isDemo, loading: authLoading } = useAuth()
  const [data, setData] = useState<{ formations: FormationRow[]; totals: Totals } | null>(null)
  const [loading, setLoading] = useState(true)
  const allowed = isDemo || isFormateur(role)

  useEffect(() => {
    if (authLoading) return
    if (isDemo) { setData(DEMO); setLoading(false); return }
    if (!isFormateur(role)) { setLoading(false); return }
    ;(async () => {
      try {
        const r = await fetch('/api/member/formateur', { credentials: 'same-origin' })
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
          <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">Espace Formateur</h1>
          <p className="text-pearl/50 font-inter text-sm mb-6">Cet espace est réservé aux formateurs et responsables pédagogiques.</p>
          <Link href="/member/dashboard" className="btn-gold-cinematic px-5 py-2.5 text-sm">Retour au tableau de bord</Link>
        </div>
      </div>
    )
  }

  const t = data?.totals
  const kpis = [
    { label: 'Formations', value: t?.formations ?? 0, sub: `${t?.publiees ?? 0} publiées`, icon: BookOpen, color: '#8B5CF6' },
    { label: 'Apprenants', value: t?.apprenants ?? 0, sub: 'inscriptions', icon: Users, color: '#0EA5E9' },
    { label: 'Progression moy.', value: `${t?.progression_moyenne ?? 0}%`, sub: 'tous cours', icon: TrendingUp, color: '#22C55E' },
    { label: 'Terminés', value: t?.termines ?? 0, sub: 'parcours complétés', icon: Award, color: '#D4AF37' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Formateur"
          title={<>Suivi <span className="text-cinematic-gold">pédagogique</span></>}
          description="Vos formations, vos apprenants et leur progression en temps réel."
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
              <div className="text-pearl/40 text-xs font-inter mt-0.5">{k.label} · {k.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Formations table */}
        <div className="card-cinematic overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gold" />
            <h2 className="font-cinzel font-bold text-pearl text-sm">Mes formations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                  <th className="px-5 py-3">Formation</th>
                  <th className="px-5 py-3">Niveau</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Inscrits</th>
                  <th className="px-5 py-3">Progression</th>
                  <th className="px-5 py-3">Terminés</th>
                </tr>
              </thead>
              <tbody>
                {(data?.formations || []).length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-pearl/30 font-inter">Aucune formation ne vous est encore assignée. L&apos;administration peut vous attribuer une formation depuis « Formations (LMS) » (champ « Formateur responsable »).</td></tr>
                )}
                {(data?.formations || []).map((f) => (
                  <tr key={f.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-pearl/80 font-medium">{f.titre}</td>
                    <td className="px-5 py-3 text-pearl/50 capitalize">{f.niveau}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter"
                        style={f.statut === 'publie' ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : { background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}>
                        {f.statut === 'publie' ? 'Publiée' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-pearl/70">{f.inscrits}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 max-w-[120px] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${f.progression_moyenne}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
                        </div>
                        <span className="text-pearl/50 text-xs">{f.progression_moyenne}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-pearl/70">{f.termines}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
