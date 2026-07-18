'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Heart, Clock, Globe, ArrowRight, Send, Shield, Flame, Quote, CheckCircle } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { events } from '@/lib/analytics'

/* ============================================================
   BLOC 6 — VIES & PRIÈRES (fusion Prière + Témoignages)
   Formulaire de prière RÉELLEMENT fonctionnel (POST /api/prieres).
   Témoignages réels (cms_testimonies + temoignages). Jamais vide :
   le formulaire reste actif même sans témoignage publié.
   ============================================================ */

type Testimony = { id: string; auteur: string; lieu: string; titre: string; texte: string }

export function CommunitySection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // ----- Témoignages réels -----
  const [items, setItems] = useState<Testimony[]>([])
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const [cms, workflow] = await Promise.all([
          supabase.from('cms_testimonies').select('id, author_name, location, title, body').in('status', ['approved', 'published']).limit(6),
          supabase.from('temoignages').select('id, auteur, pays, titre, corps').eq('is_public', true).limit(6),
        ])
        if (cancelled) return
        const a: Testimony[] = (cms.data || []).map((t: any) => ({
          id: `c-${t.id}`, auteur: t.author_name || 'Anonyme', lieu: t.location || '', titre: t.title || '', texte: t.body || '',
        }))
        const b: Testimony[] = (workflow.data || []).map((t: any) => ({
          id: `w-${t.id}`, auteur: t.auteur || 'Anonyme', lieu: t.pays || '', titre: t.titre || '', texte: t.corps || '',
        }))
        setItems([...a, ...b].filter((t) => t.texte).slice(0, 4))
      } catch { /* aucun témoignage */ }
    })()
    return () => { cancelled = true }
  }, [])

  // ----- Formulaire de prière fonctionnel -----
  const [nom, setNom] = useState('')
  const [sujet, setSujet] = useState('')
  const [description, setDescription] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submitPrayer(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (sujet.trim().length < 3 || description.trim().length < 5) {
      toast.error('Indiquez un sujet et une demande de prière.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/prieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim() || undefined,
          sujet: sujet.trim(),
          description: description.trim(),
          urgent,
          anonyme: !nom.trim(),
          is_public: true,
          categorie: 'autre',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Échec')
      events.prayerSubmitted({ urgent })
      setDone(true)
      setNom(''); setSujet(''); setDescription(''); setUrgent(false)
      toast.success('Votre demande est portée par les intercesseurs. 🙏')
    } catch {
      toast.error('Une erreur est survenue. Réessayez dans un instant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section-cinematic" ref={ref}>
      <div className="halo-gold w-[600px] h-[400px] -top-10 -left-40" />
      <div className="halo-light w-[500px] h-[400px] bottom-0 -right-32" />

      <div className="container-cinematic">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="section-label-dark justify-center">
            <Heart className="w-3 h-3" />
            Maison
          </div>
          <h2 className="heading-cinematic-lg mb-6">
            Une famille
            <span className="block text-cinematic-gold">qui prie avec toi</span>
          </h2>
          <p className="font-inter text-base md:text-lg leading-relaxed max-w-md mx-auto" style={{ color: 'rgba(245,230,216,0.45)' }}>
            Accueil, intercession, témoignages — la chaleur d&apos;une maison.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* LEFT — Formulaire fonctionnel */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { value: '24/7', label: 'Intercession', icon: Clock },
                { value: 'Mondial', label: 'Mur de prière', icon: Globe },
                { value: 'Ensemble', label: 'En communion', icon: Heart },
              ].map((stat) => (
                <div key={stat.label} className="card-cinematic text-center p-4">
                  <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center"
                    style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <stat.icon className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  </div>
                  <div className="font-cinzel font-black text-lg text-white mb-0.5">{stat.value}</div>
                  <div className="text-[10px] font-inter uppercase tracking-wider" style={{ color: 'rgba(245,230,216,0.45)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="card-cinematic p-6">
              {done ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <CheckCircle className="w-6 h-6" style={{ color: '#86EFAC' }} />
                  </div>
                  <p className="font-cinzel font-bold text-white text-base mb-1.5">Demande reçue</p>
                  <p className="font-inter text-sm leading-relaxed mb-5" style={{ color: 'rgba(245,230,216,0.55)' }}>
                    Elle est désormais portée par nos intercesseurs. Merci de votre confiance.
                  </p>
                  <button type="button" onClick={() => setDone(false)} className="btn-glass-cinematic">
                    Soumettre une autre demande
                  </button>
                </div>
              ) : (
                <form onSubmit={submitPrayer}>
                  <h4 className="font-cinzel text-[11px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2" style={{ color: '#D4AF37' }}>
                    <Shield className="w-3.5 h-3.5" />
                    Soumettre une demande de prière
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Votre nom (ou rester anonyme)"
                      className="input-cinematic"
                      maxLength={80}
                      aria-label="Votre nom (facultatif)"
                    />
                    <input
                      type="text"
                      value={sujet}
                      onChange={(e) => setSujet(e.target.value)}
                      placeholder="Sujet de la demande (ex. Santé, Famille…)"
                      className="input-cinematic"
                      maxLength={120}
                      required
                      aria-label="Sujet de la demande"
                    />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez votre demande de prière…"
                      rows={3}
                      className="input-cinematic resize-none"
                      maxLength={1000}
                      required
                      aria-label="Votre demande de prière"
                    />
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-sm font-inter cursor-pointer select-none" style={{ color: 'rgba(245,230,216,0.6)' }}>
                        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="rounded w-4 h-4 accent-amber-500" />
                        <Flame className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                        Demande urgente
                      </label>
                      <button type="submit" disabled={submitting} className="btn-gold-cinematic disabled:opacity-60 disabled:cursor-not-allowed">
                        <Send className="w-3.5 h-3.5" />
                        {submitting ? 'Envoi…' : 'Soumettre'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>

          {/* RIGHT — Témoignages réels / état vide encourageant */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {items.length > 0 ? (
              <>
                {items.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="card-cinematic p-5"
                  >
                    <Quote className="w-5 h-5 mb-2" style={{ color: 'rgba(212,175,55,0.5)' }} fill="currentColor" />
                    {t.titre && <p className="font-cinzel font-bold text-white text-sm mb-1.5">{t.titre}</p>}
                    <p className="font-inter text-sm leading-relaxed line-clamp-4 mb-3" style={{ color: 'rgba(245,230,216,0.7)' }}>{t.texte}</p>
                    <p className="font-inter text-xs" style={{ color: '#D4AF37' }}>
                      {t.auteur}{t.lieu ? ` · ${t.lieu}` : ''}
                    </p>
                  </motion.div>
                ))}
                <div className="text-center pt-2">
                  <Link href="/temoignages" className="btn-glass-cinematic group">
                    Lire tous les témoignages
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="card-cinematic flex flex-col items-center text-center gap-4 p-10 h-full justify-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Quote className="w-6 h-6" style={{ color: '#D4AF37' }} fill="currentColor" />
                </div>
                <div>
                  <p className="font-cinzel font-bold text-white text-base mb-1.5">Des vies transformées, bientôt racontées</p>
                  <p className="font-inter text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(245,230,216,0.55)' }}>
                    Vivez votre rencontre avec Dieu et soyez de ceux qui le raconteront.
                    En attendant, déposez votre demande de prière — elle ne reste jamais sans réponse.
                  </p>
                </div>
                <Link href="/temoignages" className="btn-glass-cinematic group">
                  Découvrir les témoignages
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
