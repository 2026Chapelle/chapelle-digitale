'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Globe, ChevronRight, BookOpen,
  Check, Zap, Target, Mic, Sprout, HandHeart, Sparkles, Lock, Clock, TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { KingdomRecognition } from '@/components/features/member/KingdomRecognition'
import { useAuth } from '@/components/providers/AuthProvider'

/**
 * MON PARCOURS DU ROYAUME — page membre.
 *
 * Les QUATRE axes du Parcours du Royaume ne sont JAMAIS fondus en une seule
 * échelle « magique » :
 *   • Croissance + Appartenance → reconnaissance CANONIQUE (KingdomRecognition).
 *   • Formation (learning journey) → « Programme d'Intégration » ci-dessous.
 *   • Fonction / ministère → affiché dans la reconnaissance, jamais comme un niveau.
 * Aucune séquence mixte (Visiteur → Membre → Disciple → Leader de cellule → Pasteur).
 */

/** Actions recommandées, orientées intégration/formation — jamais un « niveau » spirituel. */
const RECOMMENDED_ACTIONS: { label: string; href: string }[] = [
  { label: 'Avancer dans mes formations', href: '/member/dashboard/formations' },
  { label: 'Rejoindre un groupe / une cellule', href: '/member/dashboard/groupes' },
  { label: 'Participer au mur de prière', href: '/member/dashboard/prieres' },
  { label: "S'inscrire à un événement", href: '/member/dashboard/evenements' },
  { label: 'Compléter mon profil', href: '/member/dashboard/profil' },
]

/**
 * PROGRAMME D'INTÉGRATION — NIVEAU 1 (FORMATION, jamais un niveau de croissance).
 * Logique : Entrer → S'enraciner → Être formé → Être envoyé.
 */
const PROGRAMME_INTEGRATION: {
  num: number; titre: string; phase: string; desc: string
  objectifs: string[]; icon: LucideIcon; couleur: string; href: string
}[] = [
  {
    num: 1,
    titre: 'Je découvre la maison',
    phase: 'Entrer',
    desc: 'Comprendre qui nous sommes, la vision de la CIER, et trouver ma place dans la famille.',
    objectifs: ['Découvrir la vision et l\'histoire', 'Comprendre les valeurs du Royaume', 'Être accueilli et rattaché à une cellule'],
    icon: Sparkles,
    couleur: '#0EA5E9',
    href: '/member/dashboard/formations',
  },
  {
    num: 2,
    titre: 'Je stabilise ma foi',
    phase: "S'enraciner",
    desc: 'Poser des fondations solides : la prière, la Parole, le baptême et la vie communautaire.',
    objectifs: ['Établir une vie de prière', 'Lire la Bible chaque jour', 'Comprendre le baptême et la grâce'],
    icon: Sprout,
    couleur: '#22C55E',
    href: '/member/dashboard/formations',
  },
  {
    num: 3,
    titre: 'Je deviens un disciple actif',
    phase: 'Être formé → Être envoyé',
    desc: 'Grandir, servir et porter du fruit : être formé, exercer ses dons et être envoyé vers les autres.',
    objectifs: ['Être formé comme disciple', 'Servir dans un groupe', 'Témoigner et accompagner'],
    icon: HandHeart,
    couleur: '#D4AF37',
    href: '/member/dashboard/formations',
  },
]

export default function ParcoursPage() {
  const { profile } = useAuth()
  const score = Number(profile?.score_engagement ?? 0)

  // Mentorat réel à venir (table mentorships) — aucun mentor fictif affiché.
  const MENTOR = { nom: 'À assigner', role: 'Mentorat à venir', initials: '✦', disponible: false }

  // Progression RÉELLE du Programme d'Intégration (FORMATION), source serveur.
  const [integ, setInteg] = useState<{ parcours: any[]; overall_pct: number; current_slug: string | null; next_slug: string | null; integration_complete: boolean } | null>(null)
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch('/api/member/integration-progression', { credentials: 'same-origin' })
        const j = await r.json()
        if (!cancelled && j.ok) setInteg(j.data)
      } catch { /* noop */ }
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  // Position d'intégration (0,1,2) dérivée de la FORMATION réelle (jamais d'un niveau).
  const integEtape = integ?.current_slug
    ? Math.max(0, integ.parcours.findIndex((p: any) => p.slug === integ.current_slug))
    : 0

  // Stats RÉELLES — chacune sur SA nature (aucune « étape » mixte).
  const STATS = [
    { icon: Zap, label: 'Score engagement', value: String(score), color: '#D4AF37' },
    { icon: TrendingUp, label: 'Progression intégration', value: `${integ?.overall_pct ?? 0}%`, color: '#22C55E' },
    { icon: Target, label: 'Parcours de formation', value: `${integEtape + 1}/${integ?.parcours?.length ?? PROGRAMME_INTEGRATION.length}`, color: '#8B5CF6' },
  ]

  const PALETTE = ['#0EA5E9', '#22C55E', '#D4AF37', '#A855F7']
  const displayCards = (integ?.parcours?.length)
    ? integ.parcours.map((p: any, i: number) => ({
        key: p.slug, num: p.ordre, titre: p.titre, pct: p.pct as number | undefined,
        done: p.complete, locked: p.locked, active: p.slug === integ.current_slug,
        href: `/member/dashboard/formations/${p.slug}`, couleur: PALETTE[i % PALETTE.length], statut: p.statut,
      }))
    : PROGRAMME_INTEGRATION.map((p, i) => ({
        key: String(p.num), num: p.num, titre: p.titre, pct: undefined as number | undefined,
        done: i < integEtape, locked: false, active: i === integEtape,
        href: p.href, couleur: p.couleur, statut: 'publie',
      }))

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-label mb-2">Espace Membre</div>
          <h1
            className="font-cinzel font-black text-pearl mb-1.5 text-balance"
            style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Mon Parcours du Royaume
          </h1>
          <p className="font-inter text-sm md:text-[15px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Grandis, apprends et avance dans ta marche avec Dieu, accompagné par la Citadelle.
          </p>
        </div>
        {/* Mentor card */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="relative flex-shrink-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-cinzel font-black text-sm tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #4B0082, #D4AF37)',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px rgba(75,0,130,0.3), 0 0 0 1px rgba(212,175,55,0.25) inset',
              }}
            >
              {MENTOR.initials}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-inter text-xs font-semibold text-white truncate">{MENTOR.nom}</div>
            <div className="font-inter text-[10px]" style={{ color: 'rgba(212,175,55,0.7)' }}>{MENTOR.role}</div>
          </div>
          <span className="ml-2 text-[10px] font-inter font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(212,175,55,0.25)', color: 'rgba(212,175,55,0.6)' }}>
            <Mic className="w-3 h-3 inline mr-1" />Bientôt
          </span>
        </div>
      </div>

      {/* MA RECONNAISSANCE DANS LA MAISON — croissance + appartenance + ministère (axes séparés). */}
      <KingdomRecognition />

      {/* Programme d'Intégration — Niveau 1 : les parcours d'entrée (FORMATION). */}
      <div className="p-5 md:p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <h2 className="font-cinzel text-base font-bold text-pearl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" /> Ma formation — Programme d'Intégration
          </h2>
          <span className="font-inter text-[11px] text-pearl/45">Progression globale : <span className="text-gold font-semibold">{integ?.overall_pct ?? 0}%</span></span>
        </div>
        <p className="font-inter text-sm text-pearl/55 mb-5 max-w-2xl">
          Parcours pédagogiques progressifs, à suivre dans l&apos;ordre. C&apos;est ta progression de
          <span className="text-pearl/80 font-semibold"> formation</span> — distincte de ton niveau de croissance et de ton statut communautaire.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayCards.map((p) => (
            <div key={p.key} className="relative rounded-2xl p-5 flex flex-col"
              style={{
                background: p.active ? `${p.couleur}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${p.active ? `${p.couleur}45` : 'rgba(255,255,255,0.07)'}`,
                boxShadow: p.active ? `0 0 24px ${p.couleur}22` : 'none',
                opacity: p.locked ? 0.6 : 1,
              }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-cinzel font-black"
                  style={{ background: `${p.couleur}1A`, border: `1px solid ${p.couleur}40`, color: p.couleur }}>
                  {p.done ? <Check className="w-5 h-5" /> : p.locked ? <Lock className="w-4 h-4" /> : p.num}
                </div>
                {p.done ? (
                  <span className="font-inter text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Terminé</span>
                ) : p.locked ? (
                  <span className="font-inter text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Verrouillé</span>
                ) : typeof p.pct === 'number' ? (
                  <span className="font-inter text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${p.couleur}1A`, color: p.couleur }}>{p.pct}%</span>
                ) : null}
              </div>
              <div className="font-inter text-[11px] font-semibold mb-0.5" style={{ color: p.couleur }}>Parcours {p.num}</div>
              <h3 className="font-cinzel text-base font-bold text-pearl mb-1.5 leading-tight">{p.titre}</h3>
              {typeof p.pct === 'number' && (
                <div className="mb-4 mt-1">
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.couleur }} /></div>
                </div>
              )}
              <div className="flex-1" />
              {p.statut !== 'publie' ? (
                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                  <Clock className="w-3.5 h-3.5" /> Bientôt disponible
                </span>
              ) : p.locked ? (
                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                  <Lock className="w-3.5 h-3.5" /> Terminez le précédent
                </span>
              ) : (
                <Link href={p.href}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: p.active ? `linear-gradient(135deg, ${p.couleur}, ${p.couleur}bb)` : 'rgba(255,255,255,0.05)', color: p.active ? '#0B0717' : 'rgba(255,255,255,0.75)', border: p.active ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                  {p.done ? 'Revoir ce parcours' : p.active ? 'Continuer ce parcours' : 'Commencer'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-gold/70 flex-shrink-0" />
          <p className="font-inter text-[11px] text-pearl/45">
            Ces parcours nourrissent ta croissance, mais ne la <span className="text-pearl/70 font-semibold">déterminent pas automatiquement</span> : ta reconnaissance est confirmée par tes bergers.
          </p>
        </div>
      </div>

      {/* Livret d'Accueil */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(75,0,130,0.12) 100%)', border: '1px solid rgba(212,175,55,0.25)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold" />
          <h2 className="font-cinzel text-sm font-bold text-pearl">Bienvenue dans la Citadelle{profile?.prenom ? `, ${profile.prenom}` : ''}</h2>
        </div>
        <p className="font-inter text-sm text-pearl/60 mb-4 max-w-2xl">
          La Citadelle est une famille spirituelle mondiale. Découvrez la vision de l'œuvre, téléchargez votre livret d'accueil, puis avancez vers votre prochaine étape.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/notre-histoire" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-inter font-semibold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
            <Globe className="w-3.5 h-3.5" /> Découvrir la vision
          </Link>
          <a href="/livret-accueil" target="_blank" rel="noreferrer" className="btn-gold inline-flex items-center gap-1.5 text-xs px-4 py-2">
            <BookOpen className="w-3.5 h-3.5" /> Lire le Livret d'Accueil
          </a>
        </div>
      </div>

      {/* Prochaines actions recommandées (concrètes, non hiérarchiques). */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(75,0,130,0.18) 0%, rgba(212,175,55,0.06) 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-gold" />
          <h2 className="font-cinzel text-sm font-bold text-pearl">Mes prochaines actions</h2>
        </div>
        <p className="font-inter text-sm text-pearl/60 mb-4">
          Des pas concrets pour avancer — chacun nourrit un axe différent (formation, communauté, prière).
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {RECOMMENDED_ACTIONS.map((a) => (
            <Link key={a.href + a.label} href={a.href}
              className="flex items-center justify-between gap-2 p-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="font-inter text-xs text-pearl/80">{a.label}</span>
              <ChevronRight className="w-4 h-4 text-gold/60 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STATS.map(s => (
          <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="font-cinzel text-xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Poursuite de la formation */}
      <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-gold" />
          <h2 className="font-cinzel text-base font-bold text-pearl">Ma formation de disciple</h2>
        </div>
        <p className="font-inter text-sm text-pearl/55 mb-5 max-w-2xl">
          Ta formation se poursuit dans tes cours. Le cursus de l&apos;Académie des Élus s&apos;y débloque
          progressivement, une fois ton intégration franchie.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/member/dashboard/formations"
            className="btn-gold inline-flex items-center gap-1.5 text-xs px-4 py-2.5">
            <BookOpen className="w-3.5 h-3.5" /> Accéder à Mes Formations
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/member/dashboard/formations"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-inter font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
            <Sprout className="w-3.5 h-3.5" /> Académie des Élus
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
