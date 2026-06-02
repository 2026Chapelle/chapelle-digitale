'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Star, Flame, Globe, Crown, ChevronRight,
  Check, Lock, Award, Zap, Heart, Users, Target, Mic, Sprout, HandHeart, Trophy, Download, Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { TunnelProgress } from '@/components/features/tunnel/TunnelProgress'
import { TUNNEL_BY_KEY, nextStage, type TunnelStageKey } from '@/lib/tunnel'
import { useAuth } from '@/components/providers/AuthProvider'

/** Position RÉELLE dans le Tunnel Royal, dérivée du statut du membre (profil Supabase). */
function statutToStage(membre_statut?: string): TunnelStageKey {
  switch (membre_statut) {
    case 'visiteur': return 'visiteur'
    case 'nouveau_membre': return 'integration'
    case 'membre_actif': return 'membre'
    case 'disciple': return 'disciple'
    case 'leader_cellule': return 'serviteur'
    case 'berger':
    case 'pasteur': return 'leader'
    default: return 'visiteur'
  }
}

/** Actions recommandées concrètes selon l'étape (guide de croissance). */
const ACTIONS_PAR_ETAPE: Record<TunnelStageKey, { label: string; href: string }[]> = {
  visiteur: [
    { label: 'Déposer une demande de prière', href: '/member/dashboard/prieres' },
    { label: 'Découvrir les cultes en direct', href: '/member/dashboard/lives' },
    { label: 'Compléter mon profil', href: '/member/dashboard/profil' },
  ],
  contact: [
    { label: 'Rejoindre un groupe', href: '/member/dashboard/groupes' },
    { label: 'Commencer une formation', href: '/member/dashboard/formations' },
  ],
  integration: [
    { label: 'Suivre le parcours Nouveau Converti', href: '/member/dashboard/formations' },
    { label: 'Rejoindre une cellule', href: '/member/dashboard/groupes' },
    { label: "S'inscrire à un événement", href: '/member/dashboard/evenements' },
  ],
  membre: [
    { label: 'Avancer dans mes formations', href: '/member/dashboard/formations' },
    { label: 'Participer au mur de prière', href: '/member/dashboard/prieres' },
  ],
  disciple: [
    { label: 'Terminer un parcours certifiant', href: '/member/dashboard/formations' },
    { label: 'Servir dans un groupe', href: '/member/dashboard/groupes' },
  ],
  serviteur: [
    { label: 'Formation Leadership', href: '/member/dashboard/formations' },
    { label: 'Encadrer une cellule', href: '/member/dashboard/groupes' },
  ],
  leader: [
    { label: 'Accompagner de nouveaux disciples', href: '/member/dashboard/groupes' },
    { label: 'Partager un témoignage', href: '/priere' },
  ],
}

type Stage = {
  id: string
  titre: string
  icon: LucideIcon
  couleur: string
  xpTotal: number
  desc: string
  modules: { id: string; titre: string; duree: string; done: boolean; xp: number }[]
}

const STAGES: Stage[] = [
  {
    id: 'nouveau',
    titre: 'Nouveau Croyant',
    icon: Sprout,
    couleur: '#22C55E',
    xpTotal: 500,
    desc: 'Premiers pas dans la foi. Découvrir les fondements essentiels.',
    modules: [
      { id: 'm1', titre: 'La Prière — Parler à Dieu', duree: '30min', done: false, xp: 50 },
      { id: 'm2', titre: 'Lire la Bible chaque jour', duree: '25min', done: false, xp: 50 },
      { id: 'm3', titre: 'Comprendre la Grâce', duree: '40min', done: false, xp: 75 },
      { id: 'm4', titre: 'Votre témoignage de conversion', duree: '20min', done: false, xp: 75 },
      { id: 'm5', titre: 'Le baptême — Signification et symbolisme', duree: '45min', done: false, xp: 100 },
      { id: 'm6', titre: 'Trouver votre communauté', duree: '20min', done: false, xp: 75 },
    ],
  },
  {
    id: 'disciple',
    titre: 'Disciple',
    icon: BookOpen,
    couleur: '#0EA5E9',
    xpTotal: 1000,
    desc: 'Approfondir la Parole. Développer une vie spirituelle structurée.',
    modules: [
      { id: 'm7', titre: 'Étude systématique de la Bible', duree: '60min', done: false, xp: 100 },
      { id: 'm8', titre: 'Le jeûne et ses bienfaits', duree: '45min', done: false, xp: 100 },
      { id: 'm9', titre: 'Les dons spirituels', duree: '55min', done: false, xp: 125 },
      { id: 'm10', titre: 'Guérison et délivrance', duree: '50min', done: false, xp: 125 },
      { id: 'm11', titre: "L'armure de Dieu", duree: '40min', done: false, xp: 100 },
      { id: 'm12', titre: 'Évangéliser votre entourage', duree: '35min', done: false, xp: 100 },
      { id: 'm13', titre: 'Le service et la dîme', duree: '30min', done: false, xp: 100 },
      { id: 'm14', titre: 'Témoigner publiquement', duree: '25min', done: false, xp: 150 },
    ],
  },
  {
    id: 'serviteur',
    titre: 'Serviteur',
    icon: HandHeart,
    couleur: '#8B5CF6',
    xpTotal: 2000,
    desc: "Servir la communauté. Exercer ses dons au bénéfice de l'Église.",
    modules: [
      { id: 'm15', titre: 'Leadership serviteur', duree: '60min', done: false, xp: 200 },
      { id: 'm16', titre: 'Accompagnement pastoral', duree: '75min', done: false, xp: 250 },
      { id: 'm17', titre: 'Diriger une cellule de groupe', duree: '50min', done: false, xp: 200 },
      { id: 'm18', titre: 'Gestion des conflits', duree: '45min', done: false, xp: 175 },
      { id: 'm19', titre: 'Finances personnelles selon le Royaume', duree: '55min', done: false, xp: 175 },
    ],
  },
  {
    id: 'leader',
    titre: 'Leader',
    icon: Crown,
    couleur: '#D4AF37',
    xpTotal: 3500,
    desc: 'Former et multiplier. Reproduire le caractère du Christ dans les autres.',
    modules: [
      { id: 'm20', titre: 'Former des disciples', duree: '90min', done: false, xp: 400 },
      { id: 'm21', titre: 'Vision et planification stratégique', duree: '80min', done: false, xp: 350 },
      { id: 'm22', titre: 'Prédication et enseignement', duree: '70min', done: false, xp: 350 },
      { id: 'm23', titre: 'Gestion d\'une équipe de service', duree: '60min', done: false, xp: 300 },
    ],
  },
  {
    id: 'missionnaire',
    titre: 'Missionnaire',
    icon: Globe,
    couleur: '#EC4899',
    xpTotal: 5000,
    desc: 'Aller vers les nations. Porter le message au-delà des frontières.',
    modules: [
      { id: 'm24', titre: 'Missiologie biblique', duree: '90min', done: false, xp: 500 },
      { id: 'm25', titre: 'Plantation d\'Église', duree: '120min', done: false, xp: 600 },
      { id: 'm26', titre: 'Intercession pour les nations', duree: '60min', done: false, xp: 400 },
      { id: 'm27', titre: 'Témoignage interculturel', duree: '75min', done: false, xp: 450 },
      { id: 'm28', titre: "Mission d'envoi — Certification", duree: '30min', done: false, xp: 800 },
    ],
  },
]

/**
 * PROGRAMME D'INTÉGRATION — NIVEAU 1
 * Les 3 parcours d'entrée, progressifs, qui mènent au parcours de discipulat.
 * Logique d'ensemble : Entrer → S'enraciner → Être formé → Être envoyé.
 * (Additif : ne remplace pas les STAGES de discipulat existants.)
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
  const TUNNEL_STAGE = statutToStage(profile?.membre_statut)
  // Position dans le programme d'intégration (0,1,2) dérivée du statut réel.
  const integEtape = TUNNEL_STAGE === 'visiteur' || TUNNEL_STAGE === 'contact' ? 0 : TUNNEL_STAGE === 'integration' ? 1 : 2
  const etapeNom = TUNNEL_BY_KEY[TUNNEL_STAGE]?.nom ?? 'Visiteur'
  const suivante = nextStage(TUNNEL_STAGE)
  const score = Number(profile?.score_engagement ?? 0)
  const recommandations = ACTIONS_PAR_ETAPE[TUNNEL_STAGE] ?? []

  // Stats RÉELLES dérivées du profil (aucun chiffre inventé).
  const STATS = [
    { icon: Zap, label: 'Score engagement', value: String(score), color: '#D4AF37' },
    { icon: Target, label: 'Étape actuelle', value: etapeNom, color: '#22C55E' },
    { icon: Trophy, label: 'Prochaine étape', value: suivante?.nom ?? 'Envoyé', color: '#8B5CF6' },
  ]
  // Mentorat réel à venir (table mentorships) — aucun mentor fictif affiché.
  const MENTOR = { nom: '', role: 'Mentorat à venir', initials: '✦', disponible: false }

  const [activeStage, setActiveStage] = useState('nouveau')
  const [expandedMod, setExpandedMod] = useState<string | null>(null)

  // Livret d'Accueil : URL stockée dans cms_settings (médiathèque). Aucune valeur codée en dur.
  const [livretUrl, setLivretUrl] = useState<string | null>(null)
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_settings').select('value').eq('key', 'livret_accueil_url').maybeSingle()
        if (cancelled) return
        const v = data?.value
        const u = typeof v === 'string' ? v : (v && typeof v === 'object' && 'url' in v ? (v as any).url : null)
        if (u) setLivretUrl(String(u).replace(/^"|"$/g, ''))
      } catch { /* pas de livret configuré */ }
    })()
    return () => { cancelled = true }
  }, [])

  const stage = STAGES.find(s => s.id === activeStage) ?? STAGES[0]
  const currentStageIdx = STAGES.findIndex(s => s.id === activeStage)
  const doneModules = stage.modules.filter(m => m.done)
  const earnedXP = doneModules.reduce((s, m) => s + m.xp, 0)
  const stageProgress = earnedXP / stage.xpTotal
  const totalDone = STAGES[0].modules.filter(m => m.done).length

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
            Parcours de Discipolat
          </h1>
          <p className="font-inter text-sm md:text-[15px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Grandissez étape par étape dans votre marche avec Dieu.
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
            {MENTOR.disponible && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{ background: '#22C55E', boxShadow: '0 0 0 2px #050505, 0 0 8px rgba(34,197,94,0.55)' }}
                title="Disponible"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-inter text-xs font-semibold text-white truncate">{MENTOR.nom}</div>
            <div className="font-inter text-[10px]" style={{ color: 'rgba(212,175,55,0.7)' }}>{MENTOR.role}</div>
          </div>
          <button data-tunnel-stage={TUNNEL_STAGE} className="ml-2 text-[10px] font-inter font-semibold px-3 py-1.5 rounded-lg transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
            <Mic className="w-3 h-3 inline mr-1" />Appeler
          </button>
        </div>
      </div>

      {/* Tunnel Royal — position globale dans le parcours d'intégration */}
      <div className="p-5 md:p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(75,0,130,0.06))', border: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-inter text-sm font-bold text-white flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold" /> Votre place dans le Royaume
          </h2>
          <span className="font-inter text-xs text-pearl/45">
            Étape : <span className="text-gold font-semibold">{TUNNEL_BY_KEY[TUNNEL_STAGE].nom}</span>
          </span>
        </div>
        <TunnelProgress current={TUNNEL_STAGE} variant="horizontal" />
      </div>

      {/* Programme d'Intégration — Niveau 1 : les 3 parcours d'entrée progressifs */}
      <div className="p-5 md:p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <h2 className="font-cinzel text-base font-bold text-pearl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" /> Programme d'Intégration — Niveau 1
          </h2>
          <span className="font-inter text-[11px] text-pearl/45">Entrer → S'enraciner → Être formé → Être envoyé</span>
        </div>
        <p className="font-inter text-sm text-pearl/55 mb-5 max-w-2xl">
          Trois parcours progressifs pour passer du premier pas au disciple actif. Ils préparent et nourrissent votre parcours de discipulat ci-dessous.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROGRAMME_INTEGRATION.map((p, i) => {
            const done = i < integEtape
            const active = i === integEtape
            return (
              <div key={p.num} className="relative rounded-2xl p-5 flex flex-col"
                style={{
                  background: active ? `${p.couleur}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? `${p.couleur}45` : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: active ? `0 0 24px ${p.couleur}22` : 'none',
                }}>
                {/* Connecteur de progression (desktop) */}
                {i < PROGRAMME_INTEGRATION.length - 1 && (
                  <div className="hidden md:block absolute top-9 -right-2 w-4 h-0.5 z-10" style={{ background: 'rgba(255,255,255,0.12)' }} />
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: `${p.couleur}1A`, border: `1px solid ${p.couleur}40` }}>
                    {done ? <Check className="w-5 h-5" style={{ color: p.couleur }} /> : <p.icon className="w-5 h-5" style={{ color: p.couleur }} />}
                  </div>
                  <span className="font-inter text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: `${p.couleur}1A`, color: p.couleur }}>{p.phase}</span>
                </div>
                <div className="font-inter text-[11px] font-semibold mb-0.5" style={{ color: p.couleur }}>Parcours {p.num}</div>
                <h3 className="font-cinzel text-base font-bold text-pearl mb-1.5 leading-tight">{p.titre}</h3>
                <p className="font-inter text-xs text-pearl/50 leading-relaxed mb-3">{p.desc}</p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {p.objectifs.map((o) => (
                    <li key={o} className="flex items-start gap-2 font-inter text-[11px] text-pearl/60">
                      <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: p.couleur }} />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
                <Link href={p.href}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: active ? `linear-gradient(135deg, ${p.couleur}, ${p.couleur}bb)` : 'rgba(255,255,255,0.05)', color: active ? '#0B0717' : 'rgba(255,255,255,0.75)', border: active ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                  {done ? 'Revoir ce parcours' : active ? 'Continuer ce parcours' : 'Découvrir'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-gold/70 flex-shrink-0" />
          <p className="font-inter text-[11px] text-pearl/45">
            Une fois ces parcours franchis, vous poursuivez votre croissance dans le <span className="text-gold font-semibold">parcours de discipulat</span> ci-dessous.
          </p>
        </div>
      </div>

      {/* Livret d'Accueil — Bienvenue → Vision → Téléchargement → Étape suivante */}
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
          {livretUrl ? (
            <a href={livretUrl} target="_blank" rel="noreferrer" className="btn-gold inline-flex items-center gap-1.5 text-xs px-4 py-2">
              <Download className="w-3.5 h-3.5" /> Télécharger le Livret d'Accueil
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-inter text-pearl/35" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Download className="w-3.5 h-3.5" /> Livret d'Accueil bientôt disponible
            </span>
          )}
        </div>
      </div>

      {/* Moteur de progression : prochaine étape + actions recommandées */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(75,0,130,0.18) 0%, rgba(212,175,55,0.06) 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-gold" />
          <h2 className="font-cinzel text-sm font-bold text-pearl">Votre prochaine étape</h2>
        </div>
        <p className="font-inter text-sm text-pearl/60 mb-4">
          Vous êtes <span className="text-gold font-semibold">{etapeNom}</span>
          {suivante ? <> — prochaine étape : <span className="font-semibold" style={{ color: '#D4AF37' }}>{suivante.nom}</span>.</> : <> — vous êtes envoyé pour multiplier. 🌍</>}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {recommandations.map((a) => (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Stage journey path */}
      <div className="p-6 rounded-3xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="font-inter text-sm font-bold text-white mb-6">Votre progression</h2>
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 hidden md:block" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="absolute top-6 left-6 h-0.5 hidden md:block transition-all duration-700"
            style={{ width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%`, background: `linear-gradient(90deg, #22C55E, ${stage.couleur})` }} />

          <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between relative">
            {STAGES.map((s, i) => {
              const isActive = s.id === activeStage
              const isPast = i < currentStageIdx
              const isLocked = i > currentStageIdx + 1
              return (
                <button
                  key={s.id}
                  onClick={() => !isLocked && setActiveStage(s.id)}
                  disabled={isLocked}
                  className="flex md:flex-col items-center gap-3 md:gap-2 text-left md:text-center md:w-28 group"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-all flex-shrink-0"
                    style={{
                      background: isActive ? `${s.couleur}25` : isPast ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isActive ? s.couleur : isPast ? '#22C55E' : 'rgba(255,255,255,0.1)'}`,
                      opacity: isLocked ? 0.4 : 1,
                      boxShadow: isActive ? `0 0 16px ${s.couleur}40` : 'none',
                    }}
                  >
                    {isLocked ? (
                      <Lock className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    ) : (
                      <s.icon
                        className="w-5 h-5"
                        style={{ color: isActive ? s.couleur : isPast ? '#22C55E' : 'rgba(255,255,255,0.55)' }}
                      />
                    )}
                    {isPast && !isActive && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#22C55E', boxShadow: '0 0 0 2px #050505' }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-inter text-xs font-bold transition-colors"
                      style={{ color: isActive ? s.couleur : isLocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)' }}>
                      {s.titre}
                    </div>
                    {isActive && <div className="text-[9px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.modules.length} modules</div>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active stage detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          {/* Stage info + progress */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-6 rounded-2xl" style={{ background: `${stage.couleur}10`, border: `1px solid ${stage.couleur}25` }}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: `${stage.couleur}22`,
                  border: `1px solid ${stage.couleur}45`,
                  boxShadow: `0 8px 24px ${stage.couleur}25`,
                }}
              >
                <stage.icon className="w-7 h-7" style={{ color: stage.couleur }} />
              </div>
              <h3 className="font-cinzel text-xl font-black text-white mb-2 tracking-tight" style={{ letterSpacing: '-0.01em' }}>{stage.titre}</h3>
              <p className="font-inter text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{stage.desc}</p>

              {/* XP Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-[11px] font-inter mb-2">
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Progression</span>
                  <span style={{ color: stage.couleur }}>{earnedXP} / {stage.xpTotal} XP</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, stageProgress * 100)}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: `linear-gradient(90deg, ${stage.couleur}, ${stage.couleur}aa)` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-inter mt-3">
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{doneModules.length}/{stage.modules.length} modules</span>
                <span className="font-bold" style={{ color: stage.couleur }}>
                  {Math.round(stageProgress * 100)}%
                </span>
              </div>
            </div>

            {/* Badges to unlock */}
            <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h4 className="font-inter text-xs font-bold text-white mb-3 flex items-center gap-2">
                <Award className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
                Badges de cette étape
              </h4>
              <div className="space-y-2">
                {([
                  { label: `${stage.titre} Débutant`,  Icon: Star,   unlocked: doneModules.length >= 2 },
                  { label: `${stage.titre} Confirmé`,  Icon: Award,  unlocked: doneModules.length >= Math.floor(stage.modules.length / 2) },
                  { label: `${stage.titre} Accompli`,  Icon: Trophy, unlocked: doneModules.length >= stage.modules.length },
                ] as const).map(b => (
                  <div key={b.label} className="flex items-center gap-3 py-1.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: b.unlocked ? `${stage.couleur}20` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${b.unlocked ? `${stage.couleur}40` : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <b.Icon
                        className="w-3.5 h-3.5"
                        style={{ color: b.unlocked ? stage.couleur : 'rgba(255,255,255,0.25)' }}
                        fill={b.unlocked ? stage.couleur : 'transparent'}
                      />
                    </div>
                    <div className="font-inter text-xs flex-1" style={{ color: b.unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
                      {b.label}
                    </div>
                    {b.unlocked && <Check className="w-3 h-3" style={{ color: '#22C55E' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Module list */}
          <div className="lg:col-span-2 space-y-2">
            <h3 className="font-inter text-sm font-bold text-white mb-4">
              Modules — {stage.titre}
              <span className="ml-2 text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {doneModules.length} sur {stage.modules.length} complétés
              </span>
            </h3>
            {stage.modules.map((mod, i) => {
              const isLocked = !mod.done && i > 0 && !stage.modules[i - 1].done && stage.id !== 'nouveau'
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
                    style={{
                      background: mod.done ? `${stage.couleur}08` : expandedMod === mod.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${mod.done ? `${stage.couleur}25` : expandedMod === mod.id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                      opacity: isLocked ? 0.4 : 1,
                    }}
                    onClick={() => !isLocked && setExpandedMod(expandedMod === mod.id ? null : mod.id)}
                  >
                    {/* Status indicator */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: mod.done ? `${stage.couleur}20` : 'rgba(255,255,255,0.05)' }}>
                      {isLocked
                        ? <Lock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        : mod.done
                          ? <Check className="w-3.5 h-3.5" style={{ color: stage.couleur }} />
                          : <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-inter text-sm font-medium text-white truncate">{mod.titre}</div>
                      <div className="text-[10px] font-inter mt-0.5 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span>{mod.duree}</span>
                        <span>·</span>
                        <span className="font-semibold" style={{ color: stage.couleur }}>+{mod.xp} XP</span>
                      </div>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 flex-shrink-0 transition-transform"
                      style={{ color: 'rgba(255,255,255,0.2)', transform: expandedMod === mod.id ? 'rotate(90deg)' : 'none' }}
                    />
                  </div>

                  <AnimatePresence>
                    {expandedMod === mod.id && !isLocked && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 py-4 rounded-b-2xl mx-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
                          <p className="font-inter text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                            Ce module vous guidera à travers une étude approfondie de ce sujet spirituel, avec des exercices pratiques, des versets clés et des questions de réflexion personnelle.
                          </p>
                          <div className="flex gap-2">
                            {mod.done ? (
                              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-inter text-xs font-semibold"
                                style={{ background: `${stage.couleur}15`, color: stage.couleur }}>
                                <Check className="w-3 h-3" /> Complété — Revoir
                              </button>
                            ) : (
                              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-inter text-xs font-semibold transition-all hover:-translate-y-0.5"
                                style={{ background: `linear-gradient(135deg, ${stage.couleur}, ${stage.couleur}bb)`, color: '#1A0F00' }}>
                                <BookOpen className="w-3 h-3" /> Commencer le module
                              </button>
                            )}
                            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-inter text-xs font-semibold"
                              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                              <Users className="w-3 h-3" /> Étudier en groupe
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  )
}
