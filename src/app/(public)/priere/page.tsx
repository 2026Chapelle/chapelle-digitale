'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart, Send, Shield, Filter, Search, Clock, Globe, Users, ArrowRight, Flame, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CATEGORIES_PRIERE, PRIERES_COMMUNAUTE, MES_PRIERES, type CategoriePriere } from '@/lib/mock/prieres'
import { events } from '@/lib/analytics'

const ALL_REQUESTS = [...MES_PRIERES.filter(p => !p.is_anonyme || p.sujet), ...PRIERES_COMMUNAUTE]
  .filter(p => p.statut === 'active')
  .sort((a, b) => b.nb_priants - a.nb_priants)

const STATS = [
  { value: '24/7', label: 'Intercession continue', icon: Clock, color: '#D4AF37' },
  { value: '120+', label: 'Nations représentées', icon: Globe, color: '#0EA5E9' },
  { value: '50K+', label: 'Prières soumises', icon: Heart, color: '#EC4899' },
  { value: '8K+', label: 'Intercesseurs actifs', icon: Users, color: '#22C55E' },
]

type PriereErrs = { sujet?: string | null; description?: string | null; categorie?: string | null }

export default function PrierePage() {
  const [prayedFor, setPrayedFor] = useState<Set<string>>(new Set())
  const [activeCategorie, setActiveCategorie] = useState<CategoriePriere | 'Tous'>('Tous')
  const [searchQuery, setSearchQuery] = useState('')

  // Submission form state
  const [nom, setNom] = useState('')
  const [sujet, setSujet] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pErrs, setPErrs] = useState<PriereErrs>({})

  const handlePray = (id: string) => setPrayedFor(prev => new Set(Array.from(prev).concat(id)))

  const handleSubmitPriere = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: PriereErrs = {}
    if (sujet.trim().length < 3) next.sujet = 'Précisez le sujet (3 caractères min).'
    if (description.trim().length < 10) next.description = 'Décrivez votre demande (10 caractères min).'
    if (!categorie) next.categorie = 'Sélectionnez une catégorie.'
    setPErrs(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    events.prayerSubmitted({ categorie, urgente, anonyme: !nom })
    await new Promise(r => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
    setNom(''); setSujet(''); setDescription(''); setCategorie(''); setUrgente(false)
    setTimeout(() => setSubmitted(false), 4000)
  }

  const filtered = ALL_REQUESTS.filter(req => {
    const matchesCategorie = activeCategorie === 'Tous' || req.categorie === activeCategorie
    const matchesSearch = !searchQuery || req.sujet.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategorie && matchesSearch
  })

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>

      {/* Hero */}
      <section
        className="relative pt-32 pb-20 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F5F5F3 0%, #FFFFFF 100%)' }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 65%)' }}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-5">Mur de Prière</div>
            <h1
              className="font-cinzel font-black mb-5 tracking-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#111827', lineHeight: 1.05 }}
            >
              Priez avec
              <span
                className="block"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #92721A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                le Monde Entier
              </span>
            </h1>
            <p className="font-inter text-gray-500 text-lg mb-10 leading-relaxed mx-auto" style={{ maxWidth: '600px' }}>
              Notre mur de prière mondial unit des intercesseurs de 120+ nations. Priez, soyez prié, rejoignez la chaîne d'intercession qui ne s'arrête jamais.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="text-center p-4 rounded-2xl bg-white"
                  style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg mx-auto mb-2.5 flex items-center justify-center"
                    style={{ background: `${stat.color}12` }}
                  >
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div className="font-cinzel font-black text-xl mb-0.5" style={{ color: '#111827' }}>{stat.value}</div>
                  <div className="font-inter text-xs text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid lg:grid-cols-3 gap-10 items-start">

            {/* LEFT — Submit form */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="lg:sticky lg:top-28"
            >
              <form
                onSubmit={handleSubmitPriere}
                noValidate
                className="rounded-2xl p-6 bg-white"
                style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
                aria-label="Soumettre une demande de prière"
              >
                <h2 className="font-cinzel text-sm font-bold tracking-wide mb-5 flex items-center gap-2" style={{ color: '#92721A' }}>
                  <Shield className="w-4 h-4" />
                  Soumettre une demande
                </h2>

                {submitted && (
                  <div role="status" aria-live="polite" className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-inter"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#15803d' }}
                  >
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Merci, votre demande a été soumise. La communauté priera pour vous.</span>
                  </div>
                )}

                <div className="space-y-3.5 mb-5">
                  <div>
                    <label htmlFor="priere-nom" className="sr-only">Votre nom (optionnel)</label>
                    <input
                      id="priere-nom"
                      type="text"
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      placeholder="Votre nom (ou rester anonyme)"
                      autoComplete="name"
                      className="w-full px-4 py-3 rounded-xl font-inter text-sm text-gray-900 placeholder-gray-300 bg-white outline-none transition-all duration-200"
                      style={{ border: '1.5px solid rgba(0,0,0,0.1)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.1)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="priere-sujet" className="sr-only">Sujet</label>
                    <input
                      id="priere-sujet"
                      type="text"
                      value={sujet}
                      onChange={e => { setSujet(e.target.value); if (pErrs.sujet) setPErrs(p => ({ ...p, sujet: null })) }}
                      placeholder="Sujet de la demande"
                      required
                      aria-invalid={!!pErrs.sujet}
                      aria-describedby={pErrs.sujet ? 'priere-sujet-err' : undefined}
                      className="w-full px-4 py-3 rounded-xl font-inter text-sm text-gray-900 placeholder-gray-300 bg-white outline-none transition-all duration-200"
                      style={{ border: `1.5px solid ${pErrs.sujet ? 'rgba(239,68,68,0.5)' : 'rgba(0,0,0,0.1)'}` }}
                      onFocus={e => { if (!pErrs.sujet) { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.1)' } }}
                      onBlur={e => { if (!pErrs.sujet) { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none' } }}
                    />
                    {pErrs.sujet && (
                      <p id="priere-sujet-err" className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                        <AlertCircle className="w-3 h-3" /> {pErrs.sujet}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="priere-desc" className="sr-only">Description</label>
                    <textarea
                      id="priere-desc"
                      value={description}
                      onChange={e => { setDescription(e.target.value); if (pErrs.description) setPErrs(p => ({ ...p, description: null })) }}
                      placeholder="Décrivez votre demande de prière..."
                      rows={4}
                      required
                      aria-invalid={!!pErrs.description}
                      aria-describedby={pErrs.description ? 'priere-desc-err' : undefined}
                      className="w-full px-4 py-3 rounded-xl font-inter text-sm text-gray-900 placeholder-gray-300 bg-white outline-none resize-none transition-all duration-200"
                      style={{ border: `1.5px solid ${pErrs.description ? 'rgba(239,68,68,0.5)' : 'rgba(0,0,0,0.1)'}` }}
                    />
                    {pErrs.description && (
                      <p id="priere-desc-err" className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                        <AlertCircle className="w-3 h-3" /> {pErrs.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="priere-cat" className="sr-only">Catégorie</label>
                    <select
                      id="priere-cat"
                      value={categorie}
                      onChange={e => { setCategorie(e.target.value); if (pErrs.categorie) setPErrs(p => ({ ...p, categorie: null })) }}
                      required
                      aria-invalid={!!pErrs.categorie}
                      aria-describedby={pErrs.categorie ? 'priere-cat-err' : undefined}
                      className="w-full px-4 py-3 rounded-xl font-inter text-sm text-gray-700 bg-white outline-none transition-all duration-200"
                      style={{ border: `1.5px solid ${pErrs.categorie ? 'rgba(239,68,68,0.5)' : 'rgba(0,0,0,0.1)'}` }}
                    >
                      <option value="">Catégorie...</option>
                      {CATEGORIES_PRIERE.map(c => (
                        <option key={c.label} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                    {pErrs.categorie && (
                      <p id="priere-cat-err" className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                        <AlertCircle className="w-3 h-3" /> {pErrs.categorie}
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2.5 text-sm text-gray-500 font-inter cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={urgente}
                      onChange={e => setUrgente(e.target.checked)}
                      className="rounded w-4 h-4 accent-amber-600"
                    />
                    <span>Marquer comme urgente</span>
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-inter font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Soumettre ma demande
                    </>
                  )}
                </button>

                <p className="font-inter text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                  Votre demande sera partagée avec la communauté mondiale d&apos;intercesseurs.
                </p>
              </form>

              {/* Premium CTA */}
              <div
                className="mt-4 rounded-2xl p-5 text-center"
                style={{
                  background: 'linear-gradient(135deg, #0F0820 0%, #1A0535 100%)',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <div className="text-2xl mb-2">🙏</div>
                <h3 className="font-cinzel text-sm font-bold mb-1.5" style={{ color: '#FFFFFF' }}>
                  Rejoignez l'équipe
                </h3>
                <p className="font-inter text-xs mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Devenez intercesseur officiel et priez avec la communauté mondiale chaque jour.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-inter font-semibold text-xs transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}
                >
                  Rejoindre gratuitement
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>

            {/* RIGHT — Prayer wall */}
            <div className="lg:col-span-2">

              {/* Search + filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Rechercher une demande..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl font-inter text-sm text-gray-900 placeholder-gray-300 bg-white outline-none"
                    style={{ border: '1px solid rgba(0,0,0,0.09)' }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <select
                    value={activeCategorie}
                    onChange={e => setActiveCategorie(e.target.value as CategoriePriere | 'Tous')}
                    className="px-3 py-2.5 rounded-xl font-inter text-sm text-gray-600 bg-white outline-none"
                    style={{ border: '1px solid rgba(0,0,0,0.09)' }}
                  >
                    <option value="Tous">Toutes</option>
                    {CATEGORIES_PRIERE.map(c => (
                      <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveCategorie('Tous')}
                  className="px-3.5 py-1.5 rounded-full font-inter text-xs font-semibold transition-all duration-200"
                  style={{
                    background: activeCategorie === 'Tous' ? '#111827' : 'rgba(0,0,0,0.04)',
                    color: activeCategorie === 'Tous' ? '#FFFFFF' : '#6B7280',
                    border: '1px solid',
                    borderColor: activeCategorie === 'Tous' ? '#111827' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  Toutes
                </button>
                {CATEGORIES_PRIERE.map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategorie(cat.label)}
                    className="px-3.5 py-1.5 rounded-full font-inter text-xs font-semibold transition-all duration-200"
                    style={{
                      background: activeCategorie === cat.label ? `${cat.couleur}15` : 'rgba(0,0,0,0.04)',
                      color: activeCategorie === cat.label ? cat.couleur : '#6B7280',
                      border: '1px solid',
                      borderColor: activeCategorie === cat.label ? `${cat.couleur}30` : 'rgba(0,0,0,0.08)',
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              {/* Prayer cards */}
              <div className="space-y-3">
                {filtered.map((req, i) => {
                  const cat = CATEGORIES_PRIERE.find(c => c.label === req.categorie)
                  const catColor = cat?.couleur ?? '#D4AF37'
                  const prayed = prayedFor.has(req.id)

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl p-5 bg-white transition-all duration-300"
                      style={{
                        border: `1px solid ${prayed ? `${catColor}30` : 'rgba(0,0,0,0.07)'}`,
                        boxShadow: prayed
                          ? `0 4px 20px ${catColor}12`
                          : '0 1px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-cinzel font-bold text-sm text-white flex-shrink-0"
                          style={{ background: catColor }}
                        >
                          {req.is_anonyme ? '?' : (req.auteur ?? 'A').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-inter text-sm font-semibold text-gray-900 truncate">
                              {req.is_anonyme ? 'Anonyme' : (req.auteur ?? 'Anonyme')}
                            </span>
                            {req.is_urgente && (
                              <span
                                className="inline-flex items-center gap-1 font-inter text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                              >
                                <Flame className="w-2.5 h-2.5" />
                                URGENT
                              </span>
                            )}
                            {cat && (
                              <span
                                className="font-inter text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${catColor}12`, color: catColor }}
                              >
                                {cat.emoji} {cat.label}
                              </span>
                            )}
                          </div>

                          <h3 className="font-inter text-sm font-semibold text-gray-800 mb-1">{req.sujet}</h3>
                          <p className="font-inter text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
                            {req.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="font-inter text-[11px] text-gray-300">
                              {new Date(req.date).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}
                            </span>

                            <button
                              onClick={() => handlePray(req.id)}
                              disabled={prayed}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-inter text-xs font-semibold transition-all duration-300"
                              style={{
                                background: prayed ? `${catColor}15` : 'rgba(0,0,0,0.04)',
                                color: prayed ? catColor : '#9CA3AF',
                                border: `1px solid ${prayed ? `${catColor}30` : 'rgba(0,0,0,0.06)'}`,
                                transform: prayed ? 'scale(1.02)' : 'scale(1)',
                              }}
                            >
                              <Heart className="w-3.5 h-3.5" fill={prayed ? 'currentColor' : 'none'} />
                              <span className="tabular-nums">
                                {req.nb_priants + (prayed ? 1 : 0)} priants
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">🙏</div>
                    <p className="font-inter text-gray-400 text-sm">Aucune demande dans cette catégorie.</p>
                  </div>
                )}
              </div>

              <div className="text-center mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-medium text-sm transition-all duration-200 border group hover:-translate-y-px"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#4B5563', background: 'rgba(255,255,255,0.8)' }}
                >
                  Voir plus de demandes — Rejoindre la Chapelle
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
