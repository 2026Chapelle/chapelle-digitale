'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight, Play, Globe, CheckCircle, ChevronRight, MessageSquare,
  Radio, GraduationCap, BookOpen, Headphones, Calendar, Heart, MessageCircle, MapPin, Clock
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Plateforme } from '@/types'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

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
    <div className="min-h-screen" style={{ background: '#F5F5F3' }}>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4"
        style={{ background: `linear-gradient(135deg, ${color}08 0%, #F5F5F3 40%, white 100%)` }}>
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-10 blur-[80px]"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm font-inter text-gray-400 mb-8">
              <Link href="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span style={{ color }}>Plateformes</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-600">{plateforme.nom}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-8 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)`, border: `2px solid ${color}30` }}
                >
                  {plateforme.icone}
                </motion.div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                  <span className="text-xs font-bold font-inter uppercase tracking-wider" style={{ color }}>Plateforme Active</span>
                </div>

                <h1 className="font-cinzel text-4xl md:text-5xl font-black mb-4 leading-tight"
                  style={{ color: '#111827' }}>
                  {plateforme.nom}
                </h1>
                <p className="text-lg font-cormorant italic mb-6"
                  style={{ color }}>
                  "{plateforme.slogan}"
                </p>
                <p className="text-gray-600 font-inter leading-relaxed text-base mb-8 max-w-lg">
                  {plateforme.description}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-semibold text-sm transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                      color: 'white',
                      boxShadow: `0 4px 20px ${color}40`,
                    }}>
                    Rejoindre ce ministère
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/live"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-inter font-medium text-sm transition-all duration-300 bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md">
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
                className="card-elevated p-8"
              >
                <p className="font-cinzel text-lg font-bold text-gray-900 mb-5">
                  Ce que vous y trouverez
                </p>
                <div className="space-y-3">
                  {features.slice(0, 4).map((feat, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}15` }}>
                        <CheckCircle className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="font-inter text-sm text-gray-700">{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-4">Ce que nous offrons</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Tout pour votre croissance spirituelle
            </h2>
            <p className="text-gray-500 font-inter max-w-2xl mx-auto">
              Le ministère {plateforme.nom} vous accompagne avec des ressources, des formations et une communauté dédiée.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-3 p-5 card-light"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15` }}>
                  <CheckCircle className="w-4 h-4" style={{ color }} />
                </div>
                <p className="font-inter text-sm font-medium text-gray-700 leading-relaxed">{feat}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explorer d'abord */}
      <section className="py-20 px-4" style={{ background: '#F5F5F3' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-4">Explorer d'abord</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Découvrez nos contenus
            </h2>
            <p className="text-gray-500 font-inter max-w-2xl mx-auto">
              Plongez dès maintenant dans les lives, formations, enseignements et moments forts du ministère {plateforme.nom}.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {exploreLinks.map((link, i) => {
              const Icon = link.icon
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link
                    href={link.href}
                    className="flex items-center gap-4 p-5 card-light group h-full transition-all duration-300 hover:shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <span className="font-inter text-sm font-semibold text-gray-800 flex-1">{link.label}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" style={{ color }} />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contenu réel du ministère — événements & formations (Supabase) */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="section-label-light justify-center mb-4">Agenda &amp; parcours</div>
            <h2 className="font-cinzel text-3xl md:text-4xl font-black text-gray-900 mb-4">Le ministère {plateforme.nom} en action</h2>
            <p className="text-gray-500 font-inter max-w-2xl mx-auto">Événements et formations propres à ce ministère, mis à jour en temps réel.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Événements */}
            <div>
              <h3 className="font-cinzel text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color }} /> Prochains événements</h3>
              {!loaded ? (
                <p className="font-inter text-sm text-gray-400">Chargement…</p>
              ) : events.length === 0 ? (
                <div className="card-light p-6 text-center">
                  <p className="font-inter text-sm text-gray-500">Aucun événement programmé pour le moment.</p>
                  <Link href="/evenements" className="inline-flex items-center gap-1.5 text-sm font-inter font-semibold mt-2" style={{ color }}>Voir tout l&apos;agenda <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((e) => (
                    <div key={e.id} className="card-light p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                        <Calendar className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-cinzel text-sm font-bold text-gray-900 truncate">{e.titre}</p>
                        <p className="font-inter text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
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
              <h3 className="font-cinzel text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4" style={{ color }} /> Formations du ministère</h3>
              {!loaded ? (
                <p className="font-inter text-sm text-gray-400">Chargement…</p>
              ) : formations.length === 0 ? (
                <div className="card-light p-6 text-center">
                  <p className="font-inter text-sm text-gray-500">Aucune formation rattachée pour le moment.</p>
                  <Link href="/formations" className="inline-flex items-center gap-1.5 text-sm font-inter font-semibold mt-2" style={{ color }}>Voir toutes les formations <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {formations.map((f) => (
                    <Link key={f.id} href={`/formations/${f.slug}`} className="card-light p-4 flex items-center gap-4 group hover:shadow-md transition-all">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                        <BookOpen className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-cinzel text-sm font-bold text-gray-900 truncate group-hover:underline">{f.titre}</p>
                        {f.niveau && <p className="font-inter text-xs text-gray-500 mt-0.5">{f.niveau}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" style={{ color }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4" style={{ background: '#F5F5F3' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="section-label-light justify-center mb-4">Témoignages</div>
            <h2 className="font-cinzel text-3xl font-black text-gray-900">Ils ont rejoint {plateforme.nom}</h2>
          </motion.div>

          <div className="card-elevated p-12 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${color}15` }}>
              <MessageSquare className="w-6 h-6" style={{ color }} />
            </div>
            <p className="font-cinzel text-lg font-bold text-gray-800 mb-2">
              Aucun témoignage pour le moment
            </p>
            <p className="font-inter text-sm text-gray-500">
              Les premiers témoignages de ce ministère seront partagés ici très bientôt.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
              border: `1px solid ${color}25`,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] blur-[60px] opacity-20"
              style={{ background: `radial-gradient(ellipse, ${color}, transparent 70%)` }} />
            <div className="relative z-10">
              <div className="text-5xl mb-6">{plateforme.icone}</div>
              <h2 className="font-cinzel text-3xl md:text-4xl font-black text-gray-900 mb-4">
                Rejoignez {plateforme.nom} dès aujourd'hui
              </h2>
              <p className="text-gray-500 font-inter max-w-lg mx-auto mb-8">
                Faites partie d'une communauté mondiale de croyants qui grandissent ensemble dans la foi.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-inter font-semibold text-base transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                    color: 'white',
                    boxShadow: `0 4px 24px ${color}40`,
                  }}>
                  Créer mon compte gratuit
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={exploreLinks[0].href}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-inter font-medium text-sm bg-white border border-gray-200 text-gray-700 hover:shadow-md transition-all">
                  <Globe className="w-4 h-4" />
                  Explorer d'abord
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
