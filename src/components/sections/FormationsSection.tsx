'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { BookOpen, Clock, Star, ArrowRight, Lock, Play, GraduationCap } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

interface FormationCard { slug: string; titre: string; description: string; niveau: string; duree: string; modules: number; gratuit: boolean; emoji: string; couleur: string; plateforme: string; featured?: boolean }

const NIVEAU_COLORS: Record<string, string> = {
  'Débutant': '#22C55E',
  'Intermédiaire': '#F59E0B',
  'Avancé': '#EF4444',
  'Tous niveaux': '#D4AF37',
}

export function FormationsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // Formations RÉELLES (table formations). Aucune donnée inventée.
  const [formations, setFormations] = useState<FormationCard[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (IS_DEMO_MODE) { setLoaded(true); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('formations').select('*').limit(6)
        if (cancelled) return
        setFormations((data || []).map((f: any) => {
          const niveau = f.niveau || 'Tous niveaux'
          return {
            slug: f.slug || f.id,
            titre: f.titre || f.title || 'Formation',
            description: f.description || '',
            niveau,
            duree: f.duree_heures ? `${f.duree_heures}h` : (f.duree || ''),
            modules: Number(f.nb_modules || f.modules || 0),
            gratuit: f.gratuit === true || Number(f.prix) === 0,
            emoji: f.emoji || '📖',
            couleur: f.couleur || NIVEAU_COLORS[niveau] || '#D4AF37',
            plateforme: f.plateforme || f.categorie || '',
          }
        }))
      } catch { /* liste vide */ }
      finally { if (!cancelled) setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [])
  const FEATURED_FORMATIONS = formations

  return (
    <section ref={ref} className="section-cinematic">
      <div className="halo-gold w-[900px] h-[400px] -top-10 left-1/2 -translate-x-1/2" />

      <div className="container-cinematic">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-14 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="section-label-dark">
              <GraduationCap className="w-3 h-3" />
              Centre de Formation
            </div>
            <h2 className="heading-cinematic-lg">
              Grandir dans
              <span className="block text-cinematic-gold">la Connaissance</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-start md:items-end gap-3"
          >
            <p className="font-inter text-sm max-w-xs md:text-right leading-relaxed"
              style={{ color: 'rgba(245,230,216,0.45)' }}>
              Des formations bibliques, des certifications et des instructeurs au service de votre croissance
            </p>
            <Link href="/formations" className="btn-gold-cinematic group">
              Toutes les formations
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* État vide honnête tant qu'aucune formation publiée n'existe */}
        {loaded && FEATURED_FORMATIONS.length === 0 && (
          <div className="card-cinematic text-center py-14">
            <GraduationCap className="w-8 h-8 mx-auto mb-3 text-gold/40" />
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Nos formations seront bientôt disponibles ici.</p>
          </div>
        )}

        {/* Formations grid — Netflix-style premium cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURED_FORMATIONS.map((f, i) => (
            <motion.div
              key={f.slug}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/formations/${f.slug}`}
                className="block h-full card-cinematic overflow-hidden group"
              >
                {/* Cover */}
                <div className="relative h-44 overflow-hidden">
                  <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                    style={{
                      background: `
                        radial-gradient(circle at 30% 30%, ${f.couleur}55 0%, transparent 60%),
                        radial-gradient(circle at 70% 70%, ${f.couleur}30 0%, transparent 60%),
                        linear-gradient(135deg, ${f.couleur}30 0%, #050308 100%)
                      `,
                    }}
                  />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(5,3,8,0.85) 100%)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]">{f.emoji}</span>
                  </div>

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-inter font-bold tracking-widest uppercase px-2 py-0.5 rounded-full backdrop-blur-md"
                        style={{
                          background: `${NIVEAU_COLORS[f.niveau]}30`,
                          color: '#FFFFFF',
                          border: `1px solid ${NIVEAU_COLORS[f.niveau]}50`,
                        }}>
                        {f.niveau}
                      </span>
                      {f.featured && (
                        <span className="chip-gold backdrop-blur-md">
                          <Star className="w-2.5 h-2.5" fill="currentColor" />
                          Top
                        </span>
                      )}
                    </div>
                    {f.gratuit ? (
                      <span className="text-[9px] font-inter font-bold tracking-widest uppercase px-2 py-0.5 rounded-full backdrop-blur-md"
                        style={{ background: 'rgba(34,197,94,0.3)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.5)' }}>
                        Gratuit
                      </span>
                    ) : (
                      <span className="text-[9px] font-inter font-bold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1"
                        style={{ background: 'rgba(212,175,55,0.25)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.45)' }}>
                        <Lock className="w-2.5 h-2.5" />
                        Premium
                      </span>
                    )}
                  </div>

                  {/* Hover play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: 'rgba(212,175,55,0.25)',
                        border: '2px solid rgba(212,175,55,0.6)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 0 40px rgba(212,175,55,0.5)',
                      }}>
                      <Play className="w-5 h-5 ml-0.5" fill="#FFFFFF" color="#FFFFFF" />
                    </div>
                  </div>

                  {/* Bottom title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-[10px] font-inter font-bold tracking-widest uppercase block mb-1"
                      style={{ color: f.couleur }}>{f.plateforme}</span>
                    <h3 className="font-cinzel font-bold text-base text-white leading-tight">{f.titre}</h3>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs font-inter leading-relaxed mb-4 line-clamp-2"
                    style={{ color: 'rgba(245,230,216,0.5)' }}>
                    {f.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs mb-4 font-inter"
                    style={{ color: 'rgba(245,230,216,0.4)' }}>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.duree}</div>
                    <div className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{f.modules} mod.</div>
                  </div>

                  <div className="flex items-center justify-end pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="inline-flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2"
                      style={{ color: f.couleur }}>
                      Découvrir
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
