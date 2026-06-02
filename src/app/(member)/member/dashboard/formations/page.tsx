'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Clock, Award, ChevronRight, Trophy, Zap, BookOpenCheck, GraduationCap, Plus } from 'lucide-react'
import { FORMATIONS } from '@/lib/mock/formations'
import { PageHeader } from '@/components/ui/PageHeader'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Dispo { id: string; titre: string; slug: string; niveau?: string; certifiant?: boolean; instructeur_nom?: string; contenu_court?: string }
interface Certif { id: string; titre: string; reference?: string; delivre_le: string }

const TABS = ['Toutes', 'En cours', 'Terminées', 'À commencer'] as const
type Tab = typeof TABS[number]

/** Mappe les inscriptions réelles (/api/member/formations) vers l'affichage. */
function mapInscriptions(inscriptions: any[]): typeof FORMATIONS {
  return (inscriptions || []).map((i) => {
    const f = i.formation || {}
    const statut = i.statut === 'termine' ? 'terminé' : i.statut === 'actif' ? 'en_cours' : 'non_commencé'
    return {
      id: i.id,
      slug: f.slug || '',
      titre: f.titre || 'Formation',
      categorie: (f.niveau ? String(f.niveau) : 'Formation'),
      instructeur: f.instructeur_nom || 'Citadelle',
      emoji: f.certifiant ? '🏆' : '📚',
      couleur: '#D4AF37',
      progression: typeof i.progression === 'number' ? i.progression : 0,
      statut,
      nb_modules: 0,
      duree: f.duree_heures ? `${f.duree_heures}h` : '—',
    }
  }) as unknown as typeof FORMATIONS
}

function statusLabel(statut?: string) {
  if (statut === 'en_cours') return 'En cours'
  if (statut === 'terminé') return 'Terminée'
  return 'À commencer'
}

function statusClass(statut?: string) {
  if (statut === 'en_cours') return 'badge-gold'
  if (statut === 'terminé') return 'badge-royal'
  return 'text-pearl/30 border border-pearl/10 rounded-full px-2 py-0.5 text-[10px] font-poppins'
}

export default function FormationsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Toutes')
  const [items, setItems] = useState<typeof FORMATIONS>([]) // aucune donnée fictive : rempli par le réel
  const [dispo, setDispo] = useState<Dispo[]>([])
  const [certificats, setCertificats] = useState<Certif[]>([])
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [enrolledSlugs, setEnrolledSlugs] = useState<Set<string>>(new Set())

  // Données réelles : inscriptions du membre ; repli sur le mock en démo / vide.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/formations', { credentials: 'same-origin' })
        if (r.ok) {
          const j = await r.json()
          if (!cancelled && j.ok) {
            const mapped = mapInscriptions(j.data?.inscriptions || [])
            setItems(mapped)
            setEnrolledSlugs(new Set(mapped.map((m: any) => m.slug).filter(Boolean)))
          }
        }
        // Certificats réels
        const rc = await fetch('/api/member/certificats', { credentials: 'same-origin' })
        if (rc.ok) { const jc = await rc.json(); if (!cancelled && jc.ok) setCertificats(jc.certificats || []) }
        // Formations publiées disponibles (découverte / inscription)
        if (!IS_DEMO_MODE) {
          const { data } = await supabase.from('formations')
            .select('id, titre, slug, niveau, certifiant, instructeur_nom, contenu_court')
            .eq('statut', 'publie').order('created_at', { ascending: false })
          if (!cancelled) setDispo(data || [])
        }
      } catch { /* garde le mock */ }
    })()
    return () => { cancelled = true }
  }, [])

  async function enroll(f: Dispo) {
    setEnrolling(f.id)
    try {
      const r = await fetch('/api/member/formations/enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ formation_id: f.id }),
      })
      const j = await r.json()
      if (j.ok) { toast.success('Inscription confirmée ✓'); router.push(`/member/dashboard/formations/${f.slug}`) }
      else toast.error(j.message || 'Échec de l\'inscription')
    } catch { toast.error('Erreur réseau') }
    setEnrolling(null)
  }

  const stats = useMemo(() => {
    const enCours = items.filter((f: any) => f.statut === 'en_cours').length
    const terminees = items.filter((f: any) => f.statut === 'terminé').length
    const progMoy = items.length
      ? Math.round(items.reduce((s: number, f: any) => s + (f.progression || 0), 0) / items.length)
      : 0
    return [
      { label: 'En cours', value: enCours, icon: Zap, color: '#D4AF37' },
      { label: 'Terminées', value: terminees, icon: Trophy, color: '#22C55E' },
      { label: 'Progression moy.', value: `${progMoy}%`, icon: Award, color: '#8B5CF6' },
    ]
  }, [items])

  const filtered = items.filter((f) => {
    if (activeTab === 'Toutes') return true
    if (activeTab === 'En cours') return f.statut === 'en_cours'
    if (activeTab === 'Terminées') return f.statut === 'terminé'
    if (activeTab === 'À commencer') return f.statut === 'non_commencé' || !f.statut
    return true
  })

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Espace Membre"
          title={<>Mes <span className="text-cinematic-gold">Formations</span></>}
          description="Continuez votre parcours spirituel à votre rythme."
        />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {stats.map((s) => (
            <div key={s.label} className="card-royal text-center py-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: `${s.color}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="font-cinzel text-2xl font-black text-pearl mb-1">{s.value}</div>
              <div className="text-xs text-pearl/40 font-inter">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-inter font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-gold text-black'
                  : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </motion.div>

        {/* Formation grid */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 card-royal"
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <BookOpenCheck className="w-7 h-7" style={{ color: '#D4AF37' }} />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucune formation dans cette catégorie</p>
            <p className="text-pearl/35 text-sm font-inter mt-1">Explorez nos formations disponibles.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link href={`/member/dashboard/formations/${f.slug}`}
                  className="card-royal flex flex-col h-full hover:border-gold/20 transition-all group block"
                >
                  {/* Top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${f.couleur}20` }}>
                      {f.emoji}
                    </div>
                    <span className={statusClass(f.statut)}>{statusLabel(f.statut)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="badge-royal mb-2 inline-flex">{f.categorie}</div>
                    <h3 className="font-cinzel font-bold text-pearl text-base mb-1 group-hover:text-gold transition-colors">
                      {f.titre}
                    </h3>
                    <p className="text-xs text-pearl/40 font-inter mb-3 flex items-center gap-1">
                      <span>par {f.instructeur}</span>
                    </p>

                    {/* Progress bar */}
                    {f.progression !== undefined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-pearl/40 mb-1.5 font-inter">
                          <span>Progression</span>
                          <span>{f.progression}%</span>
                        </div>
                        <div className="progress-royal">
                          <div className="progress-fill" style={{ width: `${f.progression}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-pearl/5">
                    <div className="flex items-center gap-3 text-xs text-pearl/40">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {f.nb_modules} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {f.duree}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-pearl/20 group-hover:text-gold transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mes certificats (réels) */}
        {certificats.length > 0 && (
          <div className="mt-10">
            <h2 className="font-cinzel text-base font-bold text-pearl mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-gold" /> Mes certificats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {certificats.map((c) => (
                <div key={c.id} className="card-royal flex flex-col" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
                  <Award className="w-6 h-6 text-gold mb-2" />
                  <h3 className="font-cinzel font-bold text-pearl text-sm">{c.titre}</h3>
                  <p className="text-xs text-pearl/40 font-inter mt-1 mb-3">Délivré le {new Date(c.delivre_le).toLocaleDateString('fr-FR')}{c.reference ? ` · ${c.reference}` : ''}</p>
                  {c.reference && (
                    <a href={`/certificat/${encodeURIComponent(c.reference)}`} target="_blank" rel="noreferrer"
                      className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5 self-start mt-auto">
                      <Award className="w-3.5 h-3.5" /> Voir / Télécharger
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formations disponibles (découverte + inscription réelle) */}
        {dispo.filter((d) => !enrolledSlugs.has(d.slug)).length > 0 && (
          <div className="mt-10">
            <h2 className="font-cinzel text-base font-bold text-pearl mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-gold" /> Formations disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {dispo.filter((d) => !enrolledSlugs.has(d.slug)).map((f) => (
                <div key={f.id} className="card-royal flex flex-col h-full">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 mb-4" style={{ background: 'rgba(212,175,55,0.15)' }}>
                    {f.certifiant ? '🏆' : '📚'}
                  </div>
                  <h3 className="font-cinzel font-bold text-pearl text-base mb-1">{f.titre}</h3>
                  {f.niveau && <div className="badge-royal mb-2 inline-flex capitalize w-fit">{f.niveau}</div>}
                  {f.contenu_court && <p className="text-xs text-pearl/45 font-inter flex-1 line-clamp-3">{f.contenu_court}</p>}
                  <button onClick={() => enroll(f)} disabled={enrolling === f.id}
                    className="btn-gold text-xs py-2.5 mt-4 justify-center disabled:opacity-50 inline-flex items-center gap-1.5">
                    {enrolling === f.id ? 'Inscription…' : <><Plus className="w-3.5 h-3.5" /> S'inscrire</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
