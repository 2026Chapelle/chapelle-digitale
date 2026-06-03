'use client'
import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, Play, Globe, CheckCircle, ChevronRight, MessageSquare,
  Radio, GraduationCap, BookOpen, Headphones, Calendar, Heart, MessageCircle, MapPin, Clock
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Plateforme } from '@/types'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { getPlatformImage } from '@/lib/images'

type ExploreLink = { href: string; label: string; icon: LucideIcon }

// Liens « Explorer d'abord » réutilisables — toutes les destinations existent sur le site.
const EXPLORE: Record<string, ExploreLink> = {
  live: { href: '/live', label: 'Cultes en direct', icon: Radio },
  formations: { href: '/formations', label: 'Formations', icon: GraduationCap },
  enseignements: { href: '/enseignements', label: 'Enseignements', icon: BookOpen },
  podcast: { href: '/podcast', label: 'Podcast', icon: Headphones },
  evenements: { href: '/evenements', label: 'Événements & retraites', icon: Calendar },
  priere: { href: '/priere', label: 'Prière & intercession', icon: Heart },
  temoignages: { href: '/temoignages', label: 'Témoignages', icon: MessageCircle },
}

// 3 à 5 liens pertinents par plateforme (selon params.id).
const EXPLORE_MAP: Record<string, ExploreLink[]> = {
  cier: [EXPLORE.live, EXPLORE.enseignements, EXPLORE.formations, EXPLORE.priere, EXPLORE.evenements],
  jeunesse: [EXPLORE.live, EXPLORE.podcast, EXPLORE.formations, EXPLORE.evenements, EXPLORE.priere],
  'chapelle-familiale': [EXPLORE.live, EXPLORE.formations, EXPLORE.enseignements, EXPLORE.evenements],
  'femmes-exceptions': [EXPLORE.formations, EXPLORE.enseignements, EXPLORE.evenements, EXPLORE.live, EXPLORE.temoignages],
  'cite-refuge': [EXPLORE.priere, EXPLORE.enseignements, EXPLORE.temoignages, EXPLORE.live, EXPLORE.evenements],
  cfic: [EXPLORE.formations, EXPLORE.enseignements, EXPLORE.live, EXPLORE.podcast],
  mahanaim: [EXPLORE.priere, EXPLORE.live, EXPLORE.evenements, EXPLORE.enseignements],
  'familles-chapelle': [EXPLORE.live, EXPLORE.evenements, EXPLORE.enseignements, EXPLORE.priere],
}

const FEATURES_MAP: Record<string, string[]> = {
  cier: ['Cultes en direct chaque dimanche', 'Enseignements bibliques profonds', 'Communauté internationale', 'Lives & replays illimités', 'Prière 24/7', 'Formations certifiantes'],
  jeunesse: ['Worship contemporain & créatif', 'Formations pour jeunes leaders', 'Challenges spirituels', 'Groupes de prière jeunesse', 'Camps & retraites', 'Coaching identité'],
  'chapelle-familiale': ['Séminaires pour couples', 'Éducation des enfants chrétiens', 'Conseil conjugal biblique', 'Lives familles', 'Parcours mariage', 'Soutien aux parents'],
  'femmes-exceptions': ['Leadership au féminin', 'Identité & estime de soi', 'Ministère des femmes', 'Masterclass exclusives', 'Réseau mondial féminin', 'Événements VIP'],
  'cite-refuge': ['Accompagnement pastoral', 'Guérison intérieure', 'Groupe de soutien', 'Sessions individuelles', 'Programme de restauration', 'Ressources thérapeutiques'],
  cfic: ['Cours théologiques certifiants', 'Formation ministérielle', 'Biblique avancé', 'Homilétique & prédication', 'Leadership spirituel', 'Certification reconnue'],
  mahanaim: ['Veillées de prière 24/7', 'Intercession pour les nations', 'École de prière avancée', 'Guerre spirituelle', 'Prophétie & discernement', 'Retraites intercession'],
  'familles-chapelle': ['Cellules de croissance', 'Groupes de vie intimes', 'Évangélisation locale', 'Soutien communautaire', 'Fêtes de familles', 'Leaders de cellule formés'],
}

interface PlatEvent { id: string; titre: string; date: string; heure: string; lieu: string; enLigne: boolean }
interface PlatFormation { id: string; titre: string; slug: string; niveau?: string }

export default function PlateformePage({ plateforme }: { plateforme: Plateforme }) {
  const features = FEATURES_MAP[plateforme.id] || FEATURES_MAP.cier
  const exploreLinks = EXPLORE_MAP[plateforme.id] || [
    EXPLORE.live, EXPLORE.formations, EXPLORE.enseignements, EXPLORE.evenements, EXPLORE.priere,
  ]
  const color = plateforme.couleur_primaire

  // Parallaxe subtile du Hero (désactivée si l'utilisateur préfère moins d'animation).
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 90])

  // Contenu RÉEL de la plateforme (événements + formations filtrés). Aucun mock.
  const [events, setEvents] = useState<PlatEvent[]>([])
  const [formations, setFormations] = useState<PlatFormation[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoaded(true); return }
    let cancelled = false
    const id = plateforme.id.toLowerCase()
    const nom = plateforme.nom.toLowerCase()
    const matches = (v?: string) => {
      if (!v) return false
      const s = String(v).toLowerCase()
      return s.includes(id) || id.includes(s) || s.includes(nom) || nom.includes(s)
    }
    ;(async () => {
      try {
        const [{ data: evs }, { data: forms }] = await Promise.all([
          supabase.from('cms_events')
            .select('id, title, starts_at, location, is_online, platform, status')
            .eq('status', 'published').order('starts_at', { ascending: true }),
          supabase.from('formations').select('*').limit(100),
        ])
        if (cancelled) return
        const now = Date.now()
        setEvents((evs || []).filter((e: any) => matches(e.platform) && (!e.starts_at || new Date(e.starts_at).getTime() >= now))
          .slice(0, 4).map((e: any) => ({
            id: e.id, titre: e.title || 'Événement',
            date: e.starts_at ? new Date(e.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '',
            heure: e.starts_at ? new Date(e.starts_at).toTimeString().slice(0, 5) : '',
            lieu: e.location || (e.is_online ? 'En ligne' : ''), enLigne: !!e.is_online,
          })))
        setFormations((forms || []).filter((f: any) =>
          matches(f.plateforme) || matches(f.platform) || matches(f.categorie) || matches(f.ministere))
          .slice(0, 6).map((f: any) => ({ id: f.id, titre: f.titre || f.title || 'Formation', slug: f.slug, niveau: f.niveau })))
      } catch (e) { console.error('[plateforme] chargement contenu échoué', e) }
      finally { if (!cancelled) setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [plateforme.id, plateforme.nom])

  return (
    <div className="min-h-screen bg-charbon">

      {/* Hero — image identitaire de la plateforme en fond, overlay sombre premium */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4">
        {/* Image de fond + parallaxe subtile (fallback dégradé auto si absente) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={reduce ? undefined : { y: heroY }}
          aria-hidden
        >
          <div className="absolute inset-0 scale-110">
            <PremiumImage image={getPlatformImage(plateforme.id)} fill priority overlay="none" sizes="100vw" />
          </div>
        </motion.div>
        {/* Overlay sombre 78% — lisibilité garantie */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(8,8,10,0.74) 0%, rgba(8,8,10,0.82) 55%, rgba(8,8,10,0.95) 100%)' }} aria-hidden />
        {/* Teinte d'accent propre à la plateforme */}
        <div className="absolute inset-0 pointer-events-none opacity-70"
          style={{ background: `radial-gradient(ellipse at 75% 15%, ${color}33 0%, transparent 55%)` }} aria-hidden />
        {/* Fondu vers le charbon de la page */}
        <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent, #08080A)' }} aria-hidden />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm font-inter mb-8" style={{ color: 'rgba(245,230,216,0.4)' }}>
              <Link href="/" className="hover:text-gold transition-colors">Accueil</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/plateformes" className="hover:text-gold transition-colors" style={{ color }}>Plateformes</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span style={{ color: 'rgba(245,230,216,0.7)' }}>{plateforme.nom}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-8"
                  style={{ background: `linear-gradient(135deg, ${color}2A, ${color}10)`, border: `1px solid ${color}40`, boxShadow: `0 12px 40px ${color}25` }}
                >
                  {plateforme.icone}
                </motion.div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
                  style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                  <span className="text-xs font-bold font-inter uppercase tracking-wider" style={{ color }}>Plateforme Active</span>
                </div>

                <h1 className="font-cinzel text-4xl md:text-5xl font-black mb-4 leading-tight text-white">{plateforme.nom}</h1>
                <p className="text-lg font-cormorant italic mb-6" style={{ color }}>&laquo;&nbsp;{plateforme.slogan}&nbsp;&raquo;</p>
                <p className="font-inter leading-relaxed text-base mb-8 max-w-lg" style={{ color: 'rgba(245,230,216,0.6)' }}>
                  {plateforme.description}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, color: '#FFFFFF', boxShadow: `0 8px 28px ${color}45` }}>
                    Rejoindre ce ministère
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/live" className="btn-glass-cinematic">
                    <Play className="w-4 h-4" />
                    Voir un live
                  </Link>
                </div>
              </div>

              {/* Highlights */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="card-cinematic p-8"
              >
                <p className="font-cinzel text-lg font-bold text-white mb-5">Ce que vous y trouverez</p>
                <div className="space-y-3">
                  {features.slice(0, 4).map((feat, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}1F`, border: `1px solid ${color}30` }}>
                        <CheckCircle className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.78)' }}>{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} className="text-center mb-14">
            <div className="section-label-dark justify-center">Ce que nous offrons</div>
            <h2 className="heading-cinematic-lg mb-4">Tout pour votre croissance spirituelle</h2>
            <p className="font-inter max-w-2xl mx-auto" style={{ color: 'rgba(245,230,216,0.55)' }}>
              Le ministère {plateforme.nom} vous accompagne avec des ressources, des formations et une communauté dédiée.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 p-5 card-cinematic"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}1F`, border: `1px solid ${color}30` }}>
                  <CheckCircle className="w-4 h-4" style={{ color }} />
                </div>
                <p className="font-inter text-sm font-medium leading-relaxed" style={{ color: 'rgba(245,230,216,0.72)' }}>{feat}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explorer d'abord */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} className="text-center mb-14">
            <div className="section-label-dark justify-center">Explorer d&apos;abord</div>
            <h2 className="heading-cinematic-lg mb-4">Découvrez nos contenus</h2>
            <p className="font-inter max-w-2xl mx-auto" style={{ color: 'rgba(245,230,216,0.55)' }}>
              Plongez dès maintenant dans les lives, formations, enseignements et moments forts du ministère {plateforme.nom}.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {exploreLinks.map((link, i) => {
              const Icon = link.icon
              return (
                <motion.div key={link.href}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Link href={link.href} className="flex items-center gap-4 p-5 card-cinematic group h-full">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1F`, border: `1px solid ${color}30` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <span className="font-inter text-sm font-semibold flex-1 text-white">{link.label}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color }} />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contenu réel du ministère — événements & formations (Supabase) */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} className="text-center mb-14">
            <div className="section-label-dark justify-center">Agenda &amp; parcours</div>
            <h2 className="heading-cinematic-lg mb-4">Le ministère {plateforme.nom} en action</h2>
            <p className="font-inter max-w-2xl mx-auto" style={{ color: 'rgba(245,230,216,0.55)' }}>Événements et formations propres à ce ministère, mis à jour en temps réel.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Événements */}
            <div>
              <h3 className="font-cinzel text-lg font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color }} /> Prochains événements</h3>
              {!loaded ? (
                <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>Chargement…</p>
              ) : events.length === 0 ? (
                <div className="card-cinematic p-6 text-center">
                  <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Aucun événement programmé pour le moment.</p>
                  <Link href="/evenements" className="inline-flex items-center gap-1.5 text-sm font-inter font-semibold mt-2" style={{ color }}>Voir tout l&apos;agenda <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((e) => (
                    <div key={e.id} className="card-cinematic p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}2A` }}>
                        <Calendar className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-cinzel text-sm font-bold text-white truncate">{e.titre}</p>
                        <p className="font-inter text-xs flex items-center gap-2 flex-wrap mt-0.5" style={{ color: 'rgba(245,230,216,0.5)' }}>
                          {e.date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.date}{e.heure ? ` · ${e.heure}` : ''}</span>}
                          {e.lieu && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.lieu}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formations */}
            <div>
              <h3 className="font-cinzel text-lg font-bold text-white mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4" style={{ color }} /> Formations du ministère</h3>
              {!loaded ? (
                <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>Chargement…</p>
              ) : formations.length === 0 ? (
                <div className="card-cinematic p-6 text-center">
                  <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Aucune formation rattachée pour le moment.</p>
                  <Link href="/formations" className="inline-flex items-center gap-1.5 text-sm font-inter font-semibold mt-2" style={{ color }}>Voir toutes les formations <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {formations.map((f) => (
                    <Link key={f.id} href={`/formations/${f.slug}`} className="card-cinematic p-4 flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}2A` }}>
                        <BookOpen className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-cinzel text-sm font-bold text-white truncate">{f.titre}</p>
                        {f.niveau && <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(245,230,216,0.5)' }}>{f.niveau}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} className="text-center mb-14">
            <div className="section-label-dark justify-center">Témoignages</div>
            <h2 className="heading-cinematic-lg">Ils ont rejoint {plateforme.nom}</h2>
          </motion.div>

          <div className="card-cinematic p-12 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${color}1F`, border: `1px solid ${color}30` }}>
              <MessageSquare className="w-6 h-6" style={{ color }} />
            </div>
            <p className="font-cinzel text-lg font-bold text-white mb-2">Aucun témoignage pour le moment</p>
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>
              Les premiers témoignages de ce ministère seront partagés ici très bientôt.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4 pb-28">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
            className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${color}1F 0%, ${color}08 100%)`, border: `1px solid ${color}35` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] blur-[60px] opacity-30"
              style={{ background: `radial-gradient(ellipse, ${color}, transparent 70%)` }} />
            <div className="relative z-10">
              <div className="text-5xl mb-6">{plateforme.icone}</div>
              <h2 className="font-cinzel text-3xl md:text-4xl font-black text-white mb-4">
                Rejoignez {plateforme.nom} dès aujourd&apos;hui
              </h2>
              <p className="font-inter max-w-lg mx-auto mb-8" style={{ color: 'rgba(245,230,216,0.6)' }}>
                Faites partie d&apos;une communauté mondiale de croyants qui grandissent ensemble dans la foi.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-inter font-semibold text-base transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, color: '#FFFFFF', boxShadow: `0 8px 32px ${color}45` }}>
                  Créer mon compte gratuit
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={exploreLinks[0].href} className="btn-glass-cinematic">
                  <Globe className="w-4 h-4" />
                  Explorer d&apos;abord
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
