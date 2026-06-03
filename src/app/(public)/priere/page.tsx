'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart, Send, Shield, Filter, Search, Clock, Globe, Users, ArrowRight, Flame, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react'
import { CATEGORIES_PRIERE, type CategoriePriere } from '@/lib/mock/prieres'
import { events } from '@/lib/analytics'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'

// Repères qualitatifs (aucun chiffre fictif).
const STATS = [
  { value: '24/7', label: 'Intercession continue', icon: Clock, color: '#D4AF37' },
  { value: 'Mondial', label: 'Mur de prière', icon: Globe, color: '#0EA5E9' },
  { value: 'Ouvert', label: 'À tous les membres', icon: Heart, color: '#EC4899' },
  { value: 'Communauté', label: "Chaîne d'intercession", icon: Users, color: '#22C55E' },
]

type PriereErrs = { sujet?: string | null; description?: string | null; categorie?: string | null }

export default function PrierePage() {
  const { user } = useAuth()
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

  const handlePray = (id: string) => {
    if (prayedFor.has(id)) return
    setPrayedFor(prev => new Set(Array.from(prev).concat(id)))
    if (!IS_DEMO_MODE) {
      fetch('/api/priere/pray', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => {})
    }
  }

  const handleSubmitPriere = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setPErrs({ sujet: 'Connectez-vous ou créez un compte pour déposer votre demande de prière.' })
      return
    }
    const next: PriereErrs = {}
    if (sujet.trim().length < 3) next.sujet = 'Précisez le sujet (3 caractères min).'
    if (description.trim().length < 10) next.description = 'Décrivez votre demande (10 caractères min).'
    if (!categorie) next.categorie = 'Sélectionnez une catégorie.'
    setPErrs(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    events.prayerSubmitted({ categorie, urgente, anonyme: !nom })
    try {
      if (!IS_DEMO_MODE) {
        const { error } = await supabase.from('priere_demandes').insert({
          nom: nom.trim() || null, sujet: sujet.trim(), description: description.trim(),
          categorie, urgence: urgente ? 'elevee' : 'normale', anonyme: !nom.trim(),
        })
        if (error) { setPErrs({ sujet: "L'envoi a échoué. Réessayez." }); setSubmitting(false); return }
      } else {
        await new Promise(r => setTimeout(r, 700))
      }
    } catch { setPErrs({ sujet: 'Erreur réseau.' }); setSubmitting(false); return }
    setSubmitting(false)
    setSubmitted(true)
    setNom(''); setSujet(''); setDescription(''); setCategorie(''); setUrgente(false)
    setTimeout(() => setSubmitted(false), 4000)
  }

  // Témoignages exaucés (validés + publics) — boucle Demande → Réponse → Impact.
  const [temoignages, setTemoignages] = useState<any[]>([])
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('temoignages')
          .select('id, titre, corps, auteur, categorie, pays, ville, created_at')
          .eq('statut', 'valide').eq('is_public', true)
          .order('created_at', { ascending: false }).limit(12)
        if (!cancelled) setTemoignages(data || [])
      } catch { /* vide */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Mur de prière RÉEL : demandes publiques (non anonymes, en cours). Aucune donnée fictive.
  const [wall, setWall] = useState<any[]>([])
  const [wallLoaded, setWallLoaded] = useState(false)
  useEffect(() => {
    if (IS_DEMO_MODE) { setWallLoaded(true); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('priere_demandes')
          .select('id, nom, sujet, description, categorie, urgence, anonyme, created_at, prayers_count')
          .eq('anonyme', false)
          .in('statut', ['nouvelle', 'en_priere'])
          .order('created_at', { ascending: false })
          .limit(60)
        if (cancelled) return
        setWall((data || []).map((d: any) => ({
          id: d.id, auteur: d.nom || 'Membre', sujet: d.sujet, description: d.description || '',
          categorie: d.categorie || 'general', is_anonyme: false,
          is_urgente: d.urgence === 'elevee' || d.urgence === 'urgent', date: d.created_at,
          nb_priants: d.prayers_count || 0,
        })))
      } catch { /* mur vide */ }
      finally { if (!cancelled) setWallLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = wall.filter(req => {
    const matchesCategorie = activeCategorie === 'Tous' || req.categorie === activeCategorie
    const matchesSearch = !searchQuery || req.sujet.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategorie && matchesSearch
  })

  return (
    <div className="min-h-screen bg-charbon">

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="halo-gold w-[900px] h-[480px] -top-10 left-1/2 -translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-14">
            <div className="section-label-dark justify-center">
              <Heart className="w-3 h-3" />
              Mur de Prière
            </div>
            <h1 className="heading-cinematic-xl mb-5">
              Priez avec
              <span className="block text-cinematic-gold">le Monde Entier</span>
            </h1>
            <p className="font-inter text-base md:text-lg mb-10 leading-relaxed mx-auto" style={{ color: 'rgba(245,230,216,0.55)', maxWidth: '600px' }}>
              Notre mur de prière mondial unit des intercesseurs de nombreuses nations. Priez, soyez prié,
              rejoignez la chaîne d&apos;intercession qui ne s&apos;arrête jamais.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {STATS.map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                  className="text-center p-4 card-cinematic">
                  <div className="w-9 h-9 rounded-lg mx-auto mb-2.5 flex items-center justify-center" style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div className="font-cinzel font-black text-xl mb-0.5 text-white">{stat.value}</div>
                  <div className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.4)' }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid lg:grid-cols-3 gap-10 items-start">

            {/* LEFT — Submit form */}
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="lg:sticky lg:top-28">
              <form onSubmit={handleSubmitPriere} noValidate className="card-cinematic p-6" aria-label="Soumettre une demande de prière">
                <h2 className="font-cinzel text-sm font-bold tracking-wide mb-5 flex items-center gap-2" style={{ color: '#D4AF37' }}>
                  <Shield className="w-4 h-4" />
                  Soumettre une demande
                </h2>

                {!user && (
                  <div className="mb-4 px-4 py-3 rounded-xl text-xs font-inter"
                    style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: '#F5E6A7' }}>
                    <p className="mb-2 font-semibold">Connectez-vous ou créez un compte pour déposer votre demande de prière.</p>
                    <div className="flex gap-2">
                      <Link href="/login" className="px-3 py-1.5 rounded-lg font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}>Se connecter</Link>
                      <Link href="/register" className="px-3 py-1.5 rounded-lg font-semibold" style={{ background: 'rgba(212,175,55,0.18)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.35)' }}>Créer un compte</Link>
                    </div>
                  </div>
                )}

                {submitted && (
                  <div role="status" aria-live="polite" className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-inter"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86EFAC' }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Merci, votre demande a été soumise. La communauté priera pour vous.</span>
                  </div>
                )}

                <div className="space-y-3.5 mb-5">
                  <div>
                    <label htmlFor="priere-nom" className="sr-only">Votre nom (optionnel)</label>
                    <input id="priere-nom" type="text" value={nom} onChange={e => setNom(e.target.value)}
                      placeholder="Votre nom (ou rester anonyme)" autoComplete="name" className="input-cinematic" />
                  </div>

                  <div>
                    <label htmlFor="priere-sujet" className="sr-only">Sujet</label>
                    <input id="priere-sujet" type="text" value={sujet}
                      onChange={e => { setSujet(e.target.value); if (pErrs.sujet) setPErrs(p => ({ ...p, sujet: null })) }}
                      placeholder="Sujet de la demande" required aria-invalid={!!pErrs.sujet}
                      aria-describedby={pErrs.sujet ? 'priere-sujet-err' : undefined} className="input-cinematic"
                      style={pErrs.sujet ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined} />
                    {pErrs.sujet && (
                      <p id="priere-sujet-err" className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#FCA5A5' }}>
                        <AlertCircle className="w-3 h-3" /> {pErrs.sujet}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="priere-desc" className="sr-only">Description</label>
                    <textarea id="priere-desc" value={description}
                      onChange={e => { setDescription(e.target.value); if (pErrs.description) setPErrs(p => ({ ...p, description: null })) }}
                      placeholder="Décrivez votre demande de prière..." rows={4} required aria-invalid={!!pErrs.description}
                      aria-describedby={pErrs.description ? 'priere-desc-err' : undefined} className="input-cinematic resize-none"
                      style={pErrs.description ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined} />
                    {pErrs.description && (
                      <p id="priere-desc-err" className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#FCA5A5' }}>
                        <AlertCircle className="w-3 h-3" /> {pErrs.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="priere-cat" className="sr-only">Catégorie</label>
                    <select id="priere-cat" value={categorie}
                      onChange={e => { setCategorie(e.target.value); if (pErrs.categorie) setPErrs(p => ({ ...p, categorie: null })) }}
                      required aria-invalid={!!pErrs.categorie} aria-describedby={pErrs.categorie ? 'priere-cat-err' : undefined}
                      className="input-cinematic" style={pErrs.categorie ? { borderColor: 'rgba(239,68,68,0.5)' } : undefined}>
                      <option value="">Catégorie...</option>
                      {CATEGORIES_PRIERE.map(c => (
                        <option key={c.label} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                    {pErrs.categorie && (
                      <p id="priere-cat-err" className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#FCA5A5' }}>
                        <AlertCircle className="w-3 h-3" /> {pErrs.categorie}
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2.5 text-sm font-inter cursor-pointer select-none" style={{ color: 'rgba(245,230,216,0.6)' }}>
                    <input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} className="rounded w-4 h-4 accent-amber-500" />
                    <span>Marquer comme urgente</span>
                    <Flame className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                  </label>
                </div>

                <button type="submit" disabled={submitting || !user}
                  title={!user ? 'Connectez-vous pour déposer une demande' : undefined}
                  className="btn-gold-cinematic w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-[#1A0F00]/30 border-t-[#1A0F00] animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Soumettre ma demande</>
                  )}
                </button>

                <p className="font-inter text-[11px] text-center mt-3 leading-relaxed" style={{ color: 'rgba(245,230,216,0.4)' }}>
                  Votre demande sera partagée avec la communauté mondiale d&apos;intercesseurs.
                </p>
              </form>

              {/* Premium CTA */}
              <div className="mt-4 card-cinematic-gold p-5 text-center">
                <div className="text-2xl mb-2">🙏</div>
                <h3 className="font-cinzel text-sm font-bold mb-1.5 text-white">Rejoignez l&apos;équipe</h3>
                <p className="font-inter text-xs mb-4 leading-relaxed" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  Devenez intercesseur officiel et priez avec la communauté mondiale chaque jour.
                </p>
                <Link href="/register" className="btn-gold-cinematic" style={{ padding: '10px 20px', fontSize: '0.8rem' }}>
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.35)' }} />
                  <input type="text" placeholder="Rechercher une demande..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} className="input-cinematic pl-10" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(245,230,216,0.35)' }} />
                  <select value={activeCategorie} onChange={e => setActiveCategorie(e.target.value as CategoriePriere | 'Tous')} className="input-cinematic">
                    <option value="Tous">Toutes</option>
                    {CATEGORIES_PRIERE.map(c => (
                      <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => setActiveCategorie('Tous')}
                  className="px-3.5 py-1.5 rounded-full font-inter text-xs font-semibold transition-all duration-200"
                  style={activeCategorie === 'Tous'
                    ? { background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)', color: '#1A0F00' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Toutes
                </button>
                {CATEGORIES_PRIERE.map(cat => (
                  <button key={cat.label} onClick={() => setActiveCategorie(cat.label)}
                    className="px-3.5 py-1.5 rounded-full font-inter text-xs font-semibold transition-all duration-200"
                    style={activeCategorie === cat.label
                      ? { background: `${cat.couleur}1F`, color: cat.couleur, border: `1px solid ${cat.couleur}40` }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                    <motion.div key={req.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="card-cinematic p-5"
                      style={prayed ? { borderColor: `${catColor}45`, boxShadow: `0 0 24px ${catColor}1F, 0 18px 50px rgba(0,0,0,0.45)` } : undefined}>
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center font-cinzel font-bold text-sm text-white flex-shrink-0" style={{ background: catColor }}>
                          {req.is_anonyme ? '?' : String(req.auteur ?? 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-inter text-sm font-semibold text-white truncate">
                              {req.is_anonyme ? 'Anonyme' : (req.auteur ?? 'Anonyme')}
                            </span>
                            {req.is_urgente && (
                              <span className="inline-flex items-center gap-1 font-inter text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
                                <Flame className="w-2.5 h-2.5" /> URGENT
                              </span>
                            )}
                            {cat && (
                              <span className="font-inter text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${catColor}18`, color: catColor }}>
                                {cat.emoji} {cat.label}
                              </span>
                            )}
                          </div>

                          <h3 className="font-inter text-sm font-semibold mb-1" style={{ color: 'rgba(245,230,216,0.85)' }}>{req.sujet}</h3>
                          <p className="font-inter text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'rgba(245,230,216,0.5)' }}>{req.description}</p>

                          <div className="flex items-center justify-between">
                            <span className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.35)' }}>
                              {req.date ? new Date(req.date).toLocaleDateString('fr', { day: 'numeric', month: 'short' }) : ''}
                            </span>

                            <button onClick={() => handlePray(req.id)} disabled={prayed}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-inter text-xs font-semibold transition-all duration-300"
                              style={prayed
                                ? { background: `${catColor}1F`, color: catColor, border: `1px solid ${catColor}40` }
                                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <Heart className="w-3.5 h-3.5" fill={prayed ? 'currentColor' : 'none'} />
                              <span className="tabular-nums">{req.nb_priants + (prayed ? 1 : 0)} priants</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}

                {wallLoaded && filtered.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">🙏</div>
                    <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>Aucune demande dans cette catégorie pour le moment.</p>
                  </div>
                )}
              </div>

              <div className="text-center mt-8">
                <Link href="/register" className="btn-glass-cinematic group">
                  Voir plus de demandes — Rejoindre la Chapelle
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Témoignages exaucés — l'impact réel de la prière */}
          {temoignages.length > 0 && (
            <div className="mt-16">
              <h2 className="font-cinzel text-xl font-bold text-center mb-2 text-white">Témoignages exaucés</h2>
              <p className="font-inter text-sm text-center mb-8" style={{ color: 'rgba(245,230,216,0.5)' }}>Ce que Dieu a fait dans la communauté.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {temoignages.map((t) => (
                  <div key={t.id} className="card-cinematic p-5">
                    <Sparkles className="w-4 h-4 mb-2" style={{ color: '#D4AF37' }} />
                    {t.titre && <h3 className="font-cinzel font-bold text-sm mb-1 text-white">{t.titre}</h3>}
                    <p className="font-inter text-sm leading-relaxed line-clamp-5" style={{ color: 'rgba(245,230,216,0.6)' }}>{t.corps}</p>
                    <p className="font-inter text-[11px] mt-3" style={{ color: 'rgba(245,230,216,0.4)' }}>{t.auteur || 'Anonyme'}{t.pays ? ` · ${t.pays}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
