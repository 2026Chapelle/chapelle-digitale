'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Heart, Users, AlertCircle, EyeOff, CheckCircle, BookOpen } from 'lucide-react'
import { CATEGORIES_PRIERE, CategoriePriere } from '@/lib/mock/prieres'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'

/** Demande de prière réelle (priere_demandes), normalisée pour l'affichage. */
type PriereItem = {
  id: string; sujet: string; description: string; categorie: string
  statut: 'active' | 'exaucée' | 'archivée'; is_urgente: boolean; is_anonyme: boolean
  date: string; nb_priants: number; auteur?: string | null; temoignage?: string | null
}
function mapStatut(s?: string): 'active' | 'exaucée' | 'archivée' {
  const v = String(s || '')
  if (['reponse_recue', 'temoignage_soumis', 'temoignage_valide', 'exaucee', 'exaucée', 'temoignage'].includes(v)) return 'exaucée'
  if (['archivee', 'archivée', 'classee'].includes(v)) return 'archivée'
  return 'active'
}
function frDate(s?: string) { try { return s ? new Date(s).toLocaleDateString('fr-FR') : '' } catch { return '' } }
function mapPriere(r: any): PriereItem {
  return {
    id: String(r.id), sujet: r.sujet || 'Demande', description: r.description || '',
    categorie: r.categorie || 'autre', statut: mapStatut(r.statut),
    is_urgente: r.urgence === 'elevee' || r.priorite === 'urgent' || r.priorite === 'tres_urgent',
    is_anonyme: !!r.anonyme, date: frDate(r.created_at),
    nb_priants: Number(r.prayers_count) || 0, auteur: r.nom || null, temoignage: null,
  }
}
const PRIERE_COLS = 'id, sujet, description, categorie, statut, urgence, priorite, anonyme, created_at, prayers_count, nom'

export default function PrieresPage() {
  const [sujet, setSujet] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState<CategoriePriere | ''>('')
  const [urgente, setUrgente] = useState(false)
  const [anonyme, setAnonyme] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Témoignage lié à une prière exaucée (finalisation du workflow de prière).
  const [temoignageFor, setTemoignageFor] = useState<string | null>(null)
  const [temTitre, setTemTitre] = useState('')
  const [temCorps, setTemCorps] = useState('')
  const [temSending, setTemSending] = useState(false)
  const [temDone, setTemDone] = useState<Set<string>>(new Set())

  const [mesPrieres, setMesPrieres] = useState<PriereItem[]>([])
  const [communaute, setCommunaute] = useState<PriereItem[]>([])
  const [communautePriants, setCommunautePriants] = useState<Record<string, number>>({})
  const [prayed, setPrayed] = useState<Set<string>>(new Set())

  const { user, profile, isDemo } = useAuth()

  // Données RÉELLES (priere_demandes) : mes demandes + mur public. Aucun mock.
  useEffect(() => {
    if (IS_DEMO_MODE || isDemo) return
    let cancelled = false
    ;(async () => {
      try {
        if (user?.id) {
          const { data: mine } = await supabase.from('priere_demandes')
            .select(PRIERE_COLS).eq('user_id', user.id).order('created_at', { ascending: false })
          if (!cancelled && mine) setMesPrieres(mine.map(mapPriere))
        }
        const { data: pub } = await supabase.from('priere_demandes')
          .select(PRIERE_COLS).order('created_at', { ascending: false }).limit(50)
        if (!cancelled && pub) {
          const items = pub.map(mapPriere)
          setCommunaute(items)
          setCommunautePriants(Object.fromEntries(items.map((p) => [p.id, p.nb_priants])))
        }
      } catch { /* listes vides */ }
    })()
    return () => { cancelled = true }
  }, [user, isDemo])
  const handleSubmit = async () => {
    if (!sujet || !categorie) return
    try {
      if (!IS_DEMO_MODE && !isDemo) {
        const { error } = await supabase.from('priere_demandes').insert({
          user_id: user?.id ?? null,
          nom: anonyme ? null : (profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() : (user?.email ?? null)),
          email: anonyme ? null : (profile?.email ?? user?.email ?? null),
          sujet, description, categorie: String(categorie),
          urgence: urgente ? 'elevee' : 'normale', anonyme,
        })
        if (error) { toast.error("Échec de l'envoi de la demande."); return }
      }
      setSubmitted(true)
      setSujet(''); setDescription(''); setCategorie(''); setUrgente(false); setAnonyme(false)
      toast.success('Demande de prière envoyée 🙏')
      setTimeout(() => setSubmitted(false), 3000)
    } catch { toast.error('Erreur réseau') }
  }

  const handlePrier = (id: string) => {
    if (prayed.has(id)) return
    setPrayed((prev) => new Set(Array.from(prev).concat(id)))
    setCommunautePriants((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  // Partage d'un témoignage lié à une prière exaucée → modération admin.
  const submitTemoignage = async (p: PriereItem) => {
    if (!temCorps.trim()) { toast.error('Écrivez votre témoignage.'); return }
    setTemSending(true)
    try {
      if (!IS_DEMO_MODE && !isDemo) {
        const { error } = await supabase.from('temoignages').insert({
          demande_id: p.id,
          user_id: user?.id ?? null,
          auteur: profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || null : null,
          titre: temTitre.trim() || p.sujet,
          corps: temCorps.trim(),
          categorie: p.categorie,
          statut: 'soumis',
        })
        if (error) { toast.error("Échec de l'envoi."); setTemSending(false); return }
      }
      setTemDone((s) => new Set(s).add(p.id))
      setTemoignageFor(null); setTemTitre(''); setTemCorps('')
      toast.success('Merci ! Votre témoignage sera publié après validation 🙌')
    } catch { toast.error('Erreur réseau') }
    setTemSending(false)
  }

  const statusStyle = (statut: string) => {
    if (statut === 'active') return 'text-green-400 bg-green-500/15 border-green-500/20'
    if (statut === 'exaucée') return 'text-gold bg-gold/15 border-gold/20'
    return 'text-pearl/30 bg-pearl/5 border-pearl/10'
  }

  const statusLabel = (statut: string) => {
    if (statut === 'active') return 'Active'
    if (statut === 'exaucée') return 'Exaucée 🙌'
    return 'Archivée'
  }

  const [activeTab, setActiveTab] = useState<'demandes' | 'journal' | 'communaute'>('demandes')

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Espace Membre"
          title={<>Vie de <span className="text-cinematic-gold">Prière</span></>}
          description="Vos demandes, votre journal d'intercession, votre communauté de priants."
        />

        {/* Statistiques RÉELLES de prière (dérivées de mes demandes) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 md:gap-4 mb-6"
        >
          {[
            { icon: BookOpen, label: 'Demandes actives', value: String(mesPrieres.filter(p => p.statut === 'active').length), color: '#D4AF37' },
            { icon: CheckCircle, label: 'Prières exaucées', value: String(mesPrieres.filter(p => p.statut === 'exaucée').length), color: '#22C55E' },
            { icon: Heart, label: 'Intercessions faites', value: String(prayed.size), color: '#EC4899' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="font-cinzel text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { key: 'demandes', label: 'Mes Demandes' },
            { key: 'journal', label: 'Journal de Prière' },
            { key: 'communaute', label: 'Communauté' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
              className="px-4 py-2 rounded-lg text-xs font-inter font-semibold transition-all"
              style={{
                background: activeTab === t.key ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: activeTab === t.key ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                border: activeTab === t.key ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Prayer Journal Tab */}
        {activeTab === 'journal' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-8">
            {/* New entry */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-4">✍️ Nouvelle entrée — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <textarea
                rows={4}
                placeholder="Écrivez votre prière du jour… partagez avec Dieu ce qui est sur votre cœur."
                className="input-royal w-full resize-none mb-3"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {['Gratitude', 'Intercession', 'Direction', 'Famille', 'Santé'].map(tag => (
                    <button key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-inter font-semibold transition-all"
                      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.7)' }}>
                      {tag}
                    </button>
                  ))}
                </div>
                <button className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Enregistrer
                </button>
              </div>
            </div>

            {/* Aucune entrée fictive : le journal démarre vide. */}
            <div className="card-royal text-center py-10">
              <p className="font-inter text-sm text-pearl/40">Vous n&apos;avez encore aucune entrée de journal.</p>
              <p className="font-inter text-xs text-pearl/25 mt-1">Écrivez votre première prière ci-dessus.</p>
            </div>
          </motion.div>
        )}

        {/* Demandes tab */}
        {activeTab === 'demandes' && <>

        {/* Submission form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-royal mb-8"
        >
          <h2 className="font-cinzel text-base font-bold text-pearl mb-5 flex items-center gap-2">
            <Send className="w-4 h-4 text-gold" />
            Soumettre une demande de prière
          </h2>

          <div className="space-y-4">
            <div>
              <label className="section-label block mb-2">Sujet de prière *</label>
              <input
                className="input-royal w-full"
                placeholder="Ex: Guérison, Protection, Travail..."
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
              />
            </div>
            <div>
              <label className="section-label block mb-2">Description</label>
              <textarea
                className="input-royal w-full min-h-[90px] resize-none"
                placeholder="Partagez les détails de votre demande..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div>
              <label className="section-label block mb-3">Catégorie *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES_PRIERE.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => setCategorie(cat.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-inter font-medium transition-all border ${
                      categorie === cat.label
                        ? 'border-transparent text-black font-bold'
                        : 'border-pearl/10 text-pearl/50 hover:border-pearl/20 hover:text-pearl/70'
                    }`}
                    style={categorie === cat.label ? { background: cat.couleur } : {}}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setUrgente(!urgente)}
                  className={`w-12 h-6 rounded-full transition-all relative ${urgente ? 'bg-red-500' : 'bg-pearl/10'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all ${urgente ? 'translate-x-6' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pearl font-inter flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Urgente
                  </p>
                  <p className="text-xs text-pearl/30 font-inter">Signaler comme urgent</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setAnonyme(!anonyme)}
                  className={`w-12 h-6 rounded-full transition-all relative ${anonyme ? 'bg-gold' : 'bg-pearl/10'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all ${anonyme ? 'translate-x-6' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pearl font-inter flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5 text-pearl/40" /> Anonyme
                  </p>
                  <p className="text-xs text-pearl/30 font-inter">Masquer votre identité</p>
                </div>
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!sujet || !categorie}
              className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {submitted ? 'Demande soumise !' : 'Soumettre ma demande'}
            </button>
          </div>
        </motion.div>

        {/* My prayer requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Mes Demandes de Prière</h2>
          {mesPrieres.length === 0 && (
            <div className="card-royal text-center py-10 mb-4">
              <p className="font-inter text-sm text-pearl/40">Vous n&apos;avez encore soumis aucune demande de prière.</p>
            </div>
          )}
          <div className="space-y-4">
            {mesPrieres.map((p, i) => {
              const cat = CATEGORIES_PRIERE.find((c) => c.label === p.categorie)
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="card-royal"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{cat?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-cinzel font-bold text-pearl text-sm">{p.sujet}</h3>
                          {p.is_urgente && (
                            <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-poppins">
                              Urgente
                            </span>
                          )}
                          {p.is_anonyme && (
                            <span className="text-[10px] bg-pearl/10 text-pearl/40 rounded-full px-2 py-0.5 font-poppins flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" /> Anonyme
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-pearl/40 font-inter leading-relaxed">{p.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-[10px] border rounded-full px-2 py-0.5 font-poppins ${statusStyle(p.statut)}`}>
                        {statusLabel(p.statut)}
                      </span>
                      <span className="text-xs text-pearl/30 font-inter">{p.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-pearl/40 font-inter">
                    <Heart className="w-3 h-3 text-pink-400" />
                    <span>{p.nb_priants} personnes prient</span>
                  </div>

                  {p.temoignage && (
                    <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-400 font-inter leading-relaxed">
                        🙌 <span className="font-semibold">Témoignage :</span> {p.temoignage}
                      </p>
                    </div>
                  )}

                  {/* Partager un témoignage pour une prière exaucée */}
                  {p.statut === 'exaucée' && !p.temoignage && (
                    temDone.has(p.id) ? (
                      <p className="mt-3 text-xs text-green-400 font-inter flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Témoignage envoyé — en attente de validation. Merci 🙌</p>
                    ) : temoignageFor === p.id ? (
                      <div className="mt-3 p-3 rounded-xl bg-gold/5 border border-gold/20 space-y-2">
                        <input value={temTitre} onChange={(e) => setTemTitre(e.target.value)} placeholder="Titre (facultatif)" className="input-royal w-full text-sm" />
                        <textarea value={temCorps} onChange={(e) => setTemCorps(e.target.value)} rows={3} placeholder="Racontez ce que Dieu a fait…" className="input-royal w-full text-sm resize-none" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => submitTemoignage(p)} disabled={temSending} className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
                            <Send className="w-3.5 h-3.5" /> Envoyer mon témoignage
                          </button>
                          <button onClick={() => setTemoignageFor(null)} className="text-xs text-pearl/40 font-inter hover:text-pearl/70">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setTemoignageFor(p.id); setTemTitre(''); setTemCorps('') }}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-inter font-semibold text-gold hover:gap-2 transition-all">
                        🙌 Partager mon témoignage
                      </button>
                    )
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        </> /* end demandes tab */}

        {/* Community prayer wall */}
        {activeTab === 'communaute' && <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="font-cinzel text-base font-bold text-pearl mb-2">Mur de Prière Communautaire</h2>
          <p className="text-pearl/40 text-sm font-inter mb-5">Priez pour vos frères et sœurs</p>
          {communaute.length === 0 && (
            <div className="card-royal text-center py-10">
              <p className="font-inter text-sm text-pearl/40">Aucune demande de prière publique pour le moment.</p>
            </div>
          )}
          <div className="space-y-4">
            {communaute.map((p, i) => {
              const cat = CATEGORIES_PRIERE.find((c) => c.label === p.categorie)
              const hasPrayed = prayed.has(p.id)
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="card-royal"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0">{cat?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-cinzel font-bold text-pearl text-sm">{p.sujet}</h3>
                        {p.is_urgente && (
                          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-poppins">
                            Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-pearl/40 font-inter leading-relaxed mb-2">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-pearl/40 font-inter">
                          <span>par {p.is_anonyme ? 'Anonyme' : (p.auteur ?? 'Anonyme')}</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {communautePriants[p.id]} priants
                          </span>
                        </div>
                        <button
                          onClick={() => handlePrier(p.id)}
                          disabled={hasPrayed}
                          className={`text-xs px-3 py-1.5 rounded-xl font-inter font-semibold flex items-center gap-1.5 transition-all ${
                            hasPrayed
                              ? 'bg-green-500/20 text-green-400 cursor-default'
                              : 'bg-pearl/10 text-pearl/70 hover:bg-gold/15 hover:text-gold'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${hasPrayed ? 'fill-green-400' : ''}`} />
                          {hasPrayed ? 'Prière faite' : 'Prier pour'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>}
      </div>
    </div>
  )
}
