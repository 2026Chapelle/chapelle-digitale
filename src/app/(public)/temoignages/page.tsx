'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Send, CheckCircle, ArrowRight, Quote } from 'lucide-react'
import Link from 'next/link'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

type Temoignage = {
  id: string
  auteur: string
  drapeau: string
  pays: string
  plateforme: string
  categorie: string
  titre: string
  texte: string
  date: string
  likes: number
  couleur: string
  emoji: string
}

// Aucune donnée fictive : les témoignages publiés proviennent du CMS (cms_testimonies, statut approuvé/publié).

const CATEGORIES = [
  { id: 'all', label: 'Tous', emoji: '⭐' },
  { id: 'guerison', label: 'Guérison', emoji: '🌹' },
  { id: 'transformation', label: 'Transformation', emoji: '✨' },
  { id: 'famille', label: 'Famille', emoji: '💚' },
  { id: 'vocation', label: 'Vocation', emoji: '👑' },
  { id: 'priere', label: 'Prière', emoji: '🙏' },
]

export default function TemoignagesPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [nom, setNom] = useState('')
  const [temoignage, setTemoignage] = useState('')
  const [categorie, setCategorie] = useState('')
  const [items, setItems] = useState<Temoignage[]>([])

  // Témoignages RÉELS, depuis DEUX sources unifiées (aucun mock) :
  //  • cms_testimonies (CMS éditorial, statut approved/published)
  //  • temoignages (issus du workflow de prière, statut validé + public)
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    const knownCats = new Set(CATEGORIES.map((c) => c.id))
    ;(async () => {
      try {
        const [cms, workflow] = await Promise.all([
          supabase.from('cms_testimonies')
            .select('id, author_name, location, title, body, created_at')
            .in('status', ['approved', 'published'])
            .order('created_at', { ascending: false }).limit(60),
          supabase.from('temoignages')
            .select('id, auteur, pays, titre, corps, categorie, created_at')
            .eq('statut', 'valide').eq('is_public', true)
            .order('created_at', { ascending: false }).limit(60),
        ])
        if (cancelled) return
        const fromCms: Temoignage[] = (cms.data || []).map((t: any) => ({
          id: `cms-${t.id}`, auteur: t.author_name || 'Anonyme', drapeau: '', pays: t.location || '',
          plateforme: '', categorie: 'all', titre: t.title || '', texte: t.body || '',
          date: (t.created_at || '').slice(0, 10), likes: 0, couleur: '#D4AF37', emoji: '✨',
        }))
        const fromWorkflow: Temoignage[] = (workflow.data || []).map((t: any) => ({
          id: `tem-${t.id}`, auteur: t.auteur || 'Anonyme', drapeau: '', pays: t.pays || '',
          plateforme: 'Prière exaucée',
          categorie: knownCats.has(t.categorie) ? t.categorie : 'priere',
          titre: t.titre || 'Témoignage', texte: t.corps || '',
          date: (t.created_at || '').slice(0, 10), likes: 0, couleur: '#8B5CF6', emoji: '🙏',
        }))
        const merged = [...fromWorkflow, ...fromCms].sort((a, b) => b.date.localeCompare(a.date))
        setItems(merged)
      } catch { /* liste vide */ }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter(t => activeCategory === 'all' || t.categorie === activeCategory)

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Enregistrement réel : soumission en modération (statut 'submitted').
    try {
      if (!IS_DEMO_MODE && temoignage.trim()) {
        await supabase.from('cms_testimonies').insert({
          author_name: nom.trim() || 'Anonyme',
          body: temoignage.trim(),
          status: 'submitted',
          is_anonymous: !nom.trim(),
        })
      }
    } catch { /* ignore : confirmation affichée quand même */ }
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-abyss">

      {/* Hero */}
      <div className="relative pt-32 pb-16 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.09) 0%, transparent 70%)' }} />
        <div className="relative container-royal text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-label justify-center mb-4">Fidélité de Dieu</div>
            <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
              Témoignages
              <span className="text-gradient-gold block">du Royaume</span>
            </h1>
            <p className="font-inter text-pearl/50 max-w-xl mx-auto mb-8">
              « Ils l'ont vaincu à cause du sang de l'Agneau et à cause de la parole de leur témoignage. »
              — Apocalypse 12:11
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12">

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-10 justify-center"
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all"
              style={{
                background: activeCategory === cat.id ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                color: activeCategory === cat.id ? '#D4AF37' : 'rgba(255,255,255,0.45)',
                border: `1px solid ${activeCategory === cat.id ? 'rgba(212,175,55,0.3)' : 'transparent'}`,
              }}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="card-royal text-center py-16 mb-14 max-w-2xl mx-auto">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="font-cinzel text-lg font-bold text-pearl mb-2">Aucun témoignage pour le moment</h2>
            <p className="font-inter text-sm text-pearl/45">
              Soyez le premier à partager ce que Dieu a accompli dans votre vie.
            </p>
          </div>
        )}

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          <AnimatePresence mode="popLayout">
            {filtered.map((t, i) => {
              const isLiked = likedIds.has(t.id)
              const isExpanded = expanded === t.id
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="card-royal flex flex-col group"
                  style={{ borderColor: `${t.couleur}15` }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${t.couleur}15` }}>
                      {t.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-inter text-sm font-bold text-pearl truncate">{t.auteur}</span>
                        <span className="text-sm">{t.drapeau}</span>
                      </div>
                      <div className="text-[10px] font-inter" style={{ color: t.couleur }}>{t.plateforme}</div>
                    </div>
                    <Quote className="w-5 h-5 flex-shrink-0 opacity-30" style={{ color: t.couleur }} />
                  </div>

                  {/* Title */}
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-3 leading-tight">{t.titre}</h3>

                  {/* Text */}
                  <div className="flex-1 mb-4">
                    <p className="font-inter text-xs text-pearl/50 leading-relaxed">
                      {isExpanded ? t.texte : `${t.texte.slice(0, 180)}${t.texte.length > 180 ? '…' : ''}`}
                    </p>
                    {t.texte.length > 180 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : t.id)}
                        className="text-xs font-inter mt-2 transition-colors"
                        style={{ color: t.couleur }}
                      >
                        {isExpanded ? 'Voir moins ↑' : 'Lire la suite ↓'}
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-pearl/5">
                    <span className="text-[10px] text-pearl/25 font-inter">
                      {new Date(t.date).toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => toggleLike(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-inter font-semibold transition-all"
                      style={{
                        background: isLiked ? `${t.couleur}15` : 'rgba(255,255,255,0.04)',
                        color: isLiked ? t.couleur : 'rgba(255,255,255,0.35)',
                        border: `1px solid ${isLiked ? `${t.couleur}30` : 'transparent'}`,
                      }}
                    >
                      <Heart className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} />
                      {t.likes + (isLiked ? 1 : 0)}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Submit testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="card-royal text-center mb-6" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
            <div className="text-4xl mb-3">✨</div>
            <h2 className="font-cinzel text-xl font-bold text-pearl mb-3">Partagez votre Témoignage</h2>
            <p className="font-inter text-pearl/45 mb-5">
              Votre histoire peut être l'étincelle qui transforme une autre vie. Ne gardez pas ce que Dieu a fait pour vous !
            </p>
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="btn-gold px-8 py-3">
                Partager mon témoignage
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : submitted ? (
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-green-400/15 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-400" />
                </div>
                <p className="font-cinzel text-lg text-pearl">Merci pour votre témoignage !</p>
                <p className="font-inter text-sm text-pearl/45">Il sera examiné par notre équipe et publié sous 48h.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="text-left space-y-4 mt-4">
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Votre prénom & pays"
                  required
                  className="input-royal w-full"
                />
                <div>
                  <label className="text-xs text-pearl/40 font-inter uppercase tracking-wider mb-2 block">Catégorie</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategorie(cat.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-inter transition-all"
                        style={{
                          borderColor: categorie === cat.id ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)',
                          background: categorie === cat.id ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                          color: categorie === cat.id ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={temoignage}
                  onChange={e => setTemoignage(e.target.value)}
                  placeholder="Partagez ce que Dieu a accompli dans votre vie…"
                  required
                  rows={5}
                  className="input-royal w-full resize-none"
                />
                <div className="flex gap-3">
                  <button type="submit" className="btn-gold flex-1 justify-center py-3">
                    <Send className="w-4 h-4" />
                    Envoyer pour révision
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4 py-3">
                    Annuler
                  </button>
                </div>
                <p className="text-[11px] text-pearl/25 font-inter text-center">
                  Votre témoignage sera relu par notre équipe pastorale avant publication.
                </p>
              </form>
            )}
          </div>

          {/* CTA bottom */}
          <div className="text-center">
            <p className="font-inter text-sm text-pearl/35 mb-3">Rejoignez la communauté qui vit ces miracles</p>
            <Link href="/rejoindre" className="btn-ghost text-sm">
              Rejoindre la Chapelle →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
