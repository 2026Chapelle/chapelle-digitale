'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Heart, Users, AlertCircle, EyeOff, Flame, CheckCircle, BookOpen, ChevronRight } from 'lucide-react'
import { MES_PRIERES, PRIERES_COMMUNAUTE, CATEGORIES_PRIERE, CategoriePriere } from '@/lib/mock/prieres'
import { PageHeader } from '@/components/ui/PageHeader'

const STREAK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const STREAK_STATUS = [true, true, true, true, false, true, true]

const JOURNAL_ENTRIES = [
  { date: '9 mai 2026', texte: 'Seigneur, merci pour ta protection sur ma famille. Je Te confie les prochaines semaines et je crois en Ta provision.', tags: ['Gratitude', 'Famille'] },
  { date: '8 mai 2026', texte: "Père, je te demande de toucher le cœur de mon responsable. Que les portes s'ouvrent selon Ta volonté.", tags: ['Travail', 'Direction'] },
  { date: '7 mai 2026', texte: 'Intercession pour la nation. Que Dieu bénisse les leaders et que la paix règne.', tags: ['Intercession', 'Nations'] },
]

export default function PrieresPage() {
  const [sujet, setSujet] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState<CategoriePriere | ''>('')
  const [urgente, setUrgente] = useState(false)
  const [anonyme, setAnonyme] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [communautePriants, setCommunautePriants] = useState<Record<string, number>>(
    Object.fromEntries(PRIERES_COMMUNAUTE.map((p) => [p.id, p.nb_priants]))
  )
  const [prayed, setPrayed] = useState<Set<string>>(new Set())

  const handleSubmit = () => {
    if (!sujet || !categorie) return
    setSubmitted(true)
    setSujet('')
    setDescription('')
    setCategorie('')
    setUrgente(false)
    setAnonyme(false)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const handlePrier = (id: string) => {
    if (prayed.has(id)) return
    setPrayed((prev) => new Set(Array.from(prev).concat(id)))
    setCommunautePriants((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
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

        {/* Prayer stats + streak */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {/* Streak card */}
          <div className="md:col-span-1 p-5 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Flame className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="font-cinzel text-2xl font-black text-white">12</div>
                <div className="text-[11px] font-inter" style={{ color: 'rgba(255,255,255,0.4)' }}>jours consécutifs</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              {STREAK_DAYS.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[9px] font-inter" style={{ color: 'rgba(255,255,255,0.3)' }}>{d}</div>
                  <div className="w-full aspect-square rounded-md flex items-center justify-center"
                    style={{ background: STREAK_STATUS[i] ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.06)' }}>
                    {STREAK_STATUS[i] && <Flame className="w-3 h-3 text-red-300" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="md:col-span-2 grid grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: 'Demandes actives', value: '3', color: '#D4AF37' },
              { icon: CheckCircle, label: 'Prières exaucées', value: '7', color: '#22C55E' },
              { icon: Heart, label: 'Intercessions faites', value: '34', color: '#EC4899' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="font-cinzel text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
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

            {/* Past entries */}
            {JOURNAL_ENTRIES.map((entry, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                className="card-royal cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-inter font-semibold" style={{ color: 'rgba(212,175,55,0.7)' }}>{entry.date}</div>
                  <div className="flex gap-1">
                    {entry.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-inter px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <p className="font-inter text-sm leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.texte}</p>
                <div className="flex items-center gap-1 mt-3 text-[10px] font-inter opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'rgba(212,175,55,0.6)' }}>
                  Lire l&apos;entrée complète <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
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
          <div className="space-y-4">
            {MES_PRIERES.map((p, i) => {
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
          <div className="space-y-4">
            {PRIERES_COMMUNAUTE.map((p, i) => {
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
