'use client'
import { useEffect, useState } from 'react'
import { Loader2, Filter, Mail, Sparkles, BookOpen, Users, Droplets, HandHeart, Crown, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

interface Funnel {
  total: number
  par_stage: Record<string, number>
  formulaire: number
  parcours: number
  programme: number
  membre: number
  baptise: number
  service: number
  leadership: number
}

interface Journey {
  id: string
  stage_courant: number | string | null
  a_rempli_formulaire: boolean
  a_suivi_parcours: boolean
  a_participe_programme: boolean
  est_devenu_membre: boolean
  a_ete_baptise: boolean
  a_rejoint_service: boolean
  a_suivi_leadership: boolean
  created_at: string
  members: { prenom: string | null; nom: string | null; email: string | null; pays: string | null } | null
}

const STEPS = [
  { key: 'formulaire', label: 'Premier contact', icon: Mail, color: '#0EA5E9' },
  { key: 'parcours', label: 'Parcours suivi', icon: Sparkles, color: '#818CF8' },
  { key: 'programme', label: 'Programme', icon: BookOpen, color: '#D4AF37' },
  { key: 'membre', label: 'Membre', icon: Users, color: '#22C55E' },
  { key: 'baptise', label: 'Baptisé', icon: Droplets, color: '#06B6D4' },
  { key: 'service', label: 'Au service', icon: HandHeart, color: '#F97316' },
  { key: 'leadership', label: 'Leadership', icon: Crown, color: '#8B5CF6' },
] as const

const MILESTONE_FIELDS: Record<string, keyof Journey> = {
  bapteme: 'a_ete_baptise',
  service: 'a_rejoint_service',
  leadership: 'a_suivi_leadership',
}

export default function AdminTunnelPage() {
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [recent, setRecent] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await fetch('/api/admin/tunnel', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) { setFunnel(j.funnel); setRecent(j.recent || []) }
      else setError(j.message || 'Erreur')
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }

  async function toggleMilestone(jr: Journey, milestone: 'bapteme' | 'service' | 'leadership') {
    const field = MILESTONE_FIELDS[milestone]
    const value = !jr[field]
    // Optimiste
    setRecent((list) => list.map((x) => x.id === jr.id ? { ...x, [field]: value } : x))
    try {
      const r = await fetch('/api/admin/tunnel', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jr.id, milestone, value }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.message)
      toast.success('Jalon mis à jour')
    } catch {
      setRecent((list) => list.map((x) => x.id === jr.id ? { ...x, [field]: !value } : x))
      toast.error('Échec de la mise à jour')
    }
  }

  const maxStep = funnel ? Math.max(funnel.formulaire, 1) : 1

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Gouvernement pastoral"
          title={<>Tunnel d&apos;<span className="text-cinematic-gold">intégration</span></>}
          description="De l'arrivée au leadership : entonnoir réel des 7 jalons et suivi des arrivants. Aucune donnée inventée."
        />

        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour le suivi réel.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !funnel || funnel.total === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucun parcours d&apos;intégration enregistré pour le moment.</div>
        ) : (
          <>
            {/* Entonnoir */}
            <div className="card-cinematic p-5 md:p-6 mb-6">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-5 flex items-center gap-2"><Filter className="w-4 h-4 text-gold" /> Entonnoir d&apos;intégration ({funnel.total} parcours)</h2>
              <div className="space-y-3">
                {STEPS.map((step) => {
                  const value = (funnel as any)[step.key] as number
                  const pct = Math.round((value / maxStep) * 100)
                  const convPct = funnel.total ? Math.round((value / funnel.total) * 100) : 0
                  return (
                    <div key={step.key}>
                      <div className="flex items-center justify-between text-xs font-inter mb-1.5">
                        <span className="flex items-center gap-2 text-pearl/70">
                          <step.icon className="w-3.5 h-3.5" style={{ color: step.color }} /> {step.label}
                        </span>
                        <span className="text-pearl/50 font-semibold">{value} <span className="text-pearl/30">· {convPct}%</span></span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${step.color}, ${step.color}cc)` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Arrivants récents + jalons 6-8 */}
            <div className="card-cinematic p-5 md:p-6">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-gold" /> Arrivants récents</h2>
              {recent.length === 0 ? (
                <p className="text-pearl/40 text-sm font-inter py-6 text-center">Aucune donnée disponible pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {recent.map((jr) => {
                    const m = jr.members
                    const name = m ? `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || m.email || '—' : '—'
                    return (
                      <div key={jr.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex-1 min-w-0">
                          <p className="font-inter text-sm text-pearl/80 truncate">{name}</p>
                          <p className="font-inter text-[11px] text-pearl/35">{m?.pays || '—'}{m?.email ? ` · ${m.email}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(['bapteme', 'service', 'leadership'] as const).map((ms) => {
                            const active = jr[MILESTONE_FIELDS[ms]] as boolean
                            const label = ms === 'bapteme' ? 'Baptême' : ms === 'service' ? 'Service' : 'Leadership'
                            return (
                              <button key={ms} onClick={() => toggleMilestone(jr, ms)}
                                className="text-[11px] font-inter font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all border"
                                style={active
                                  ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', borderColor: 'rgba(34,197,94,0.4)' }
                                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(245,243,238,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                {active && <Check className="w-3 h-3" />} {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
