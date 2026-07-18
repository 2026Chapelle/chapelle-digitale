'use client'
import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, Clock, ArrowRight, Lock, Play, Pause, GraduationCap, Mic, Headphones, ChevronRight,
} from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { useAudioPlayer, type AudioTrack } from '@/components/providers/AudioPlayerProvider'
import { events } from '@/lib/analytics'
import { selectHomeFormations, deriveDisplayType } from '@/lib/cms/featured'

/* ============================================================
   BLOC 5 — GRANDIR (fusion Formations + Podcast)
   « Nourrissez-vous » : formations à la une + podcast.
   Données réelles (formations, cms_podcasts). États vides honnêtes.
   Palette tenue : or × charbon (vert réservé à « Gratuit »).
   ============================================================ */

interface FormationCard {
  slug: string; titre: string; description: string; niveau: string;
  duree: string; modules: number; gratuit: boolean; emoji: string; plateforme: string
  image: string | null; displayType: string
}

const PODCAST_PLATFORMS = [
  { name: 'Spotify', emoji: '🟢', url: process.env.NEXT_PUBLIC_SPOTIFY_URL || '/podcast' },
  { name: 'Apple', emoji: '🎵', url: process.env.NEXT_PUBLIC_APPLE_PODCAST_URL || '/podcast' },
  { name: 'YouTube', emoji: '▶️', url: process.env.NEXT_PUBLIC_YOUTUBE_URL || '/podcast' },
].filter((p) => p.url)

export function GrowSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const { toggle, isPlaying } = useAudioPlayer()

  // Formations RÉELLES (table formations).
  const [formations, setFormations] = useState<FormationCard[]>([])
  const [fLoaded, setFLoaded] = useState(false)
  // Podcasts RÉELS (cms_podcasts publiés).
  const [episodes, setEpisodes] = useState<AudioTrack[]>([])
  const [pLoaded, setPLoaded] = useState(false)

  useEffect(() => {
    if (IS_DEMO_MODE) { setFLoaded(true); setPLoaded(true); return }
    let cancelled = false
    ;(async () => {
      try {
        // V2.9-B : formations PUBLIÉES ; vedettes (is_featured) triées par featured_order,
        // sinon repli déterministe (plus récentes). Fusion tous types (le badge garde le
        // type réel). Vedettes remontées d'abord côté requête pour un pool suffisant.
        const { data } = await supabase.from('formations')
          // V2.10-A perf : colonnes explicites (réduit le payload — pas d'objectifs/tags/méta/compteurs).
          .select('id, slug, titre, description, contenu_court, niveau, duree_heures, gratuit, prix, image_couverture, type, statut, is_featured, featured_order, date_publication, created_at')
          .eq('statut', 'publie')
          .order('is_featured', { ascending: false })
          .order('featured_order', { ascending: true })
          .order('date_publication', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(12)
        if (!cancelled) {
          const selected = selectHomeFormations((data || []) as any[], 3)
          setFormations(selected.map((f: any) => ({
            slug: f.slug || f.id,
            titre: f.titre || f.title || 'Formation',
            description: f.description || f.contenu_court || '',
            niveau: f.niveau || 'Tous niveaux',
            duree: f.duree_heures ? `${f.duree_heures}h` : (f.duree || ''),
            modules: Number(f.nb_modules || f.modules || 0),
            gratuit: f.gratuit === true || Number(f.prix) === 0,
            emoji: f.emoji || '📖',
            plateforme: f.plateforme || f.categorie || '',
            // Image de couverture RÉELLE (CMS). null → repli visuel (icône) seulement si absente.
            image: f.image_couverture || null,
            // Type réel (Parcours / Formation / Enseignement / Programme).
            displayType: deriveDisplayType(f.type),
          })))
        }
      } catch { /* vide */ } finally { if (!cancelled) setFLoaded(true) }
    })()
    // V2.10-A perf : podcasts lus EN PARALLÈLE des formations (lectures indépendantes → pas de waterfall).
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_podcasts').select('*').eq('status', 'published').order('episode', { ascending: false }).limit(4)
        if (!cancelled) {
          setEpisodes((data || []).filter((p: any) => p.audio_url).map((p: any) => ({
            id: String(p.id), titre: p.title || 'Épisode', auteur: p.speaker || p.auteur || 'La Chapelle',
            serie: p.serie || 'Podcast', duree: p.duree || '', dureeSecondes: Number(p.duree_secondes) || 0,
            emoji: '🎙️', couleur: '#D4AF37', audioUrl: p.audio_url,
          })))
        }
      } catch { /* vide */ } finally { if (!cancelled) setPLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <section ref={ref} className="section-cinematic">
      <div className="halo-gold w-[900px] h-[400px] -top-10 left-1/2 -translate-x-1/2" />

      <div className="container-cinematic">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="section-label-dark justify-center">
            <GraduationCap className="w-3 h-3" />
            Grandir
          </div>
          <h2 className="heading-cinematic-lg mb-5">
            Nourris ta foi,
            <span className="block text-cinematic-gold">où que tu sois</span>
          </h2>
          <p className="font-inter text-base md:text-lg leading-relaxed" style={{ color: 'rgba(245,230,216,0.55)' }}>
            Des formations bibliques et des enseignements à écouter partout —
            pensés pour ta croissance, à ton rythme.
          </p>
        </motion.div>

        {/* ---- FORMATIONS ---- */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-cinzel font-bold text-lg md:text-xl text-white">Formations à la une</h3>
          <Link href="/formations" className="inline-flex items-center gap-1.5 text-sm font-semibold font-inter transition-all hover:gap-2.5" style={{ color: '#D4AF37' }}>
            Toutes les formations
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {fLoaded && formations.length === 0 ? (
          <div className="card-cinematic text-center py-12 mb-16">
            <GraduationCap className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(212,175,55,0.4)' }} />
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Nos formations seront bientôt disponibles ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {formations.map((f, i) => (
              <motion.div
                key={f.slug}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/formations/${f.slug}`}
                  onClick={() => events.formationViewed(f.slug)}
                  className="block h-full card-cinematic overflow-hidden group"
                >
                  <div className="relative h-44 overflow-hidden">
                    {f.image ? (
                      <>
                        {/* Image de couverture RÉELLE — remplit la zone (object-cover), sans déformation. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.image} alt={f.titre} loading="lazy" decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(5,3,8,0.85) 100%)' }} />
                      </>
                    ) : (
                      <>
                        {/* Repli visuel (icône) UNIQUEMENT si aucune image de couverture réelle. */}
                        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                          style={{
                            background:
                              'radial-gradient(circle at 30% 30%, rgba(212,175,55,0.30) 0%, transparent 60%),' +
                              'radial-gradient(circle at 70% 70%, rgba(212,175,55,0.16) 0%, transparent 60%),' +
                              'linear-gradient(135deg, rgba(212,175,55,0.16) 0%, #050308 100%)',
                          }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(5,3,8,0.85) 100%)' }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]">{f.emoji}</span>
                        </div>
                      </>
                    )}

                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                      <span className="chip-gold backdrop-blur-md">{f.displayType}</span>
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

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(212,175,55,0.25)', border: '2px solid rgba(212,175,55,0.6)', backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(212,175,55,0.5)' }}>
                        <Play className="w-5 h-5 ml-0.5" fill="#FFFFFF" color="#FFFFFF" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {f.plateforme && (
                        <span className="text-[10px] font-inter font-bold tracking-widest uppercase block mb-1" style={{ color: '#D4AF37' }}>{f.plateforme}</span>
                      )}
                      <h4 className="font-cinzel font-bold text-base text-white leading-tight">{f.titre}</h4>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-inter leading-relaxed mb-4 line-clamp-2" style={{ color: 'rgba(245,230,216,0.5)' }}>{f.description}</p>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-3 text-xs font-inter" style={{ color: 'rgba(245,230,216,0.4)' }}>
                        {f.duree && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.duree}</span>}
                        {f.modules > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{f.modules} mod.</span>}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold transition-all group-hover:gap-2" style={{ color: '#D4AF37' }}>
                        Découvrir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* ---- PODCAST ---- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="font-cinzel font-bold text-lg md:text-xl text-white flex items-center gap-2">
            <Mic className="w-4 h-4" style={{ color: '#D4AF37' }} />
            Podcast CIER
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {PODCAST_PLATFORMS.map((p) => (
              <a key={p.name} href={p.url}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-inter font-medium transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(245,230,216,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span>{p.emoji}</span>{p.name}
              </a>
            ))}
          </div>
        </div>

        {pLoaded && episodes.length === 0 ? (
          <div className="card-cinematic text-center py-12">
            <Headphones className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(212,175,55,0.4)' }} />
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Nos épisodes de podcast arrivent bientôt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {episodes.map((ep, i) => (
              <motion.button
                key={ep.id}
                type="button"
                onClick={() => toggle(ep)}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="card-cinematic flex items-center gap-4 p-4 text-left group"
                style={isPlaying(ep.id) ? { borderColor: 'rgba(212,175,55,0.45)', boxShadow: '0 0 24px rgba(212,175,55,0.18), 0 16px 40px rgba(0,0,0,0.5)' } : undefined}
              >
                <div className="flex-shrink-0 relative">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    {ep.emoji}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(212,175,55,0.5)', backdropFilter: 'blur(4px)' }}>
                    {isPlaying(ep.id) ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" fill="white" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-inter font-bold mb-0.5 tracking-widest uppercase" style={{ color: '#D4AF37' }}>{ep.serie}</div>
                  <h4 className="font-inter text-sm font-bold text-white truncate">{ep.titre}</h4>
                  <div className="text-[10px] font-inter mt-0.5" style={{ color: 'rgba(245,230,216,0.4)' }}>{ep.auteur}{ep.duree ? ` · ${ep.duree}` : ''}</div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-all group-hover:translate-x-0.5" style={{ color: 'rgba(245,230,216,0.3)' }} />
              </motion.button>
            ))}
          </div>
        )}

        {episodes.length > 0 && (
          <div className="text-center mt-8">
            <Link href="/podcast" className="btn-glass-cinematic group">
              Tous les épisodes
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
