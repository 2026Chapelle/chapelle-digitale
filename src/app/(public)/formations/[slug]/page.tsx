'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Clock, BookOpen, Award, Loader2 } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { FormationEnrollButton } from '@/components/conversion/FormationEnrollButton'

interface PubFormation {
  id: string; titre: string; slug: string; contenu_court?: string; description?: string
  niveau?: string; certifiant?: boolean; instructeur_nom?: string; duree_heures?: number; image_couverture?: string
}
interface PubModule { id: string; ordre: number; titre: string; duree_minutes?: number }

export default function FormationPublicDetailPage({ params }: { params: { slug: string } }) {
  const [formation, setFormation] = useState<PubFormation | null>(null)
  const [modules, setModules] = useState<PubModule[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoading(false); setNotFound(true); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data: f } = await supabase.from('formations')
          .select('id, titre, slug, contenu_court, description, niveau, certifiant, instructeur_nom, duree_heures, image_couverture')
          .eq('slug', params.slug).eq('statut', 'publie').maybeSingle()
        if (cancelled) return
        if (!f) { setNotFound(true); setLoading(false); return }
        setFormation(f as PubFormation)
        try {
          const { data: mods } = await supabase.from('formation_modules')
            .select('id, ordre, titre, duree_minutes').eq('formation_id', f.id).eq('status', 'published')
            .order('ordre', { ascending: true })
          if (!cancelled && mods) setModules(mods as PubModule[])
        } catch { /* modules non lisibles publiquement : liste vide */ }
      } catch { setNotFound(true) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [params.slug])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
  }
  if (notFound || !formation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-cinzel text-2xl font-bold text-pearl mb-2">Formation introuvable</h1>
          <p className="font-inter text-sm text-pearl/50 mb-6">Cette formation n'existe pas ou n'est pas encore publiée.</p>
          <Link href="/formations" className="btn-gold-cinematic inline-flex">Voir les formations</Link>
        </div>
      </div>
    )
  }

  const f = formation
  const desc = f.contenu_court || f.description || ''
  const duree = f.duree_heures ? `${f.duree_heures}h` : null

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        <nav className="flex items-center gap-2 text-sm text-pearl/40 font-inter mb-8">
          <Link href="/" className="hover:text-gold transition-colors">Accueil</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/formations" className="hover:text-gold transition-colors">Formations</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-pearl/70 truncate">{f.titre}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {f.niveau && <span className="text-[11px] font-inter font-semibold px-3 py-1 rounded-full capitalize" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{f.niveau}</span>}
              {f.certifiant && <span className="text-[11px] font-inter px-3 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}><Award className="w-3 h-3" /> Certifiant</span>}
            </div>

            {f.image_couverture && (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 mb-6">
                <Image src={f.image_couverture} alt={f.titre} fill sizes="(max-width:1024px) 100vw, 66vw" className="object-cover" />
              </div>
            )}

            <h1 className="font-cinzel text-3xl md:text-4xl font-black text-pearl leading-tight mb-4">{f.titre}</h1>
            {desc && <p className="text-pearl/55 font-inter leading-relaxed mb-6 max-w-2xl">{desc}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm text-pearl/50 font-inter">
              {f.instructeur_nom && <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-pearl/40" /> par <strong className="text-pearl/75">{f.instructeur_nom}</strong></span>}
              {duree && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-pearl/40" />{duree}</span>}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="card-cinematic p-6 sticky top-28">
              <div className="text-center mb-5">
                <p className="font-cinzel text-2xl font-bold text-pearl mb-1">{f.certifiant ? 'Premium' : 'Gratuit'}</p>
                {f.certifiant && <p className="text-sm text-pearl/40 font-inter">Accès inclus avec Disciple Premium</p>}
              </div>
              <FormationEnrollButton formationId={f.id} slug={f.slug} />
              <div className="space-y-3 text-sm">
                {duree && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-pearl/50 font-inter flex items-center gap-2"><Clock className="w-4 h-4" /> Durée</span>
                    <span className="font-semibold text-pearl/80">{duree}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-pearl/50 font-inter flex items-center gap-2"><BookOpen className="w-4 h-4" /> Modules</span>
                  <span className="font-semibold text-pearl/80">{modules.length || '—'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="font-cinzel text-xl font-bold text-pearl mb-5">Programme{modules.length ? ` (${modules.length} modules)` : ''}</h2>
          {modules.length === 0 ? (
            <div className="card-cinematic p-8 text-center">
              <p className="font-inter text-sm text-pearl/40">Le programme détaillé sera bientôt disponible.</p>
            </div>
          ) : (
            <div className="card-cinematic overflow-hidden">
              {modules.map((m, i) => (
                <div key={m.id} className="flex items-center gap-4 p-4 border-b last:border-b-0 border-white/5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold font-inter text-pearl/85">{m.titre}</p>
                    {m.duree_minutes ? <p className="text-xs text-pearl/40 font-inter flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{m.duree_minutes} min</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
