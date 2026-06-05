'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, Heart, Calendar, Bell, ChevronRight,
  Trophy, Play, TrendingUp, Zap, Radio,
  Star, Shield, Users, Sparkles, GraduationCap, type LucideIcon,
} from 'lucide-react'
import { BADGES, PARCOURS_DISCIPLE } from '@/lib/constants'
import { useAuth } from '@/components/providers/AuthProvider'
import { roleLabel } from '@/lib/roles'
import { AnnouncementBanner } from '@/components/features/member/AnnouncementBanner'
import { BibleTodayWidget } from '@/components/features/member/BibleTodayWidget'
import { ProgressionCard } from '@/components/features/member/ProgressionCard'

// Recueil de versets (LSG). Rotation déterministe par date — réellement « du jour ».
const VERSETS = [
  { reference: 'Philippiens 4 : 13', text: '"Je puis tout par celui qui me fortifie."' },
  { reference: 'Josué 1 : 9', text: '"Fortifie-toi et prends courage… l\'Éternel, ton Dieu, est avec toi."' },
  { reference: 'Psaume 23 : 1', text: '"L\'Éternel est mon berger : je ne manquerai de rien."' },
  { reference: 'Proverbes 3 : 5', text: '"Confie-toi en l\'Éternel de tout ton cœur."' },
  { reference: 'Ésaïe 40 : 31', text: '"Ceux qui se confient en l\'Éternel renouvellent leur force."' },
  { reference: 'Jérémie 29 : 11', text: '"Je connais les projets que j\'ai formés sur vous… des projets de paix."' },
  { reference: 'Romains 8 : 28', text: '"Toutes choses concourent au bien de ceux qui aiment Dieu."' },
  { reference: 'Matthieu 6 : 33', text: '"Cherchez premièrement le royaume et la justice de Dieu."' },
]
function versetDuJour() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const jour = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return VERSETS[jour % VERSETS.length]
}

type QuickWin = { icon: LucideIcon; label: string; sub: string; href: string; color: string }
const QUICK_WINS: QuickWin[] = [
  { icon: BookOpen, label: 'Mes formations', sub: 'Reprendre mon parcours', href: '/member/dashboard/formations', color: '#8B5CF6' },
  { icon: Heart,    label: 'Mur de prière',  sub: 'Déposer une intention',  href: '/member/dashboard/prieres',    color: '#EC4899' },
  { icon: Radio,    label: 'Cultes en direct', sub: 'Rejoindre le live',     href: '/member/dashboard/lives',      color: '#F97316' },
]

interface FormationCard { id: string; titre: string; progression: number; slug: string }

export default function DashboardPage() {
  const { profile, user, isDemo } = useAuth()
  const [formations, setFormations] = useState<FormationCard[] | null>(null)
  // Verset du jour : calculé après montage (évite tout décalage d'hydratation).
  const [DAILY_VERSE, setDailyVerse] = useState(VERSETS[0])
  useEffect(() => { setDailyVerse(versetDuJour()) }, [])

  const prenom = profile?.prenom || ''
  const pays = profile?.pays || ''
  const statut = roleLabel(profile?.membre_statut || profile?.role)
  // Données RÉELLES uniquement : aucune valeur de démonstration (défaut 0 / Visiteur).
  const score = Number(profile?.score_engagement ?? 0)
  const etapeIdx = Math.min(Math.max(Number(profile?.parcours_disciple_etape ?? 0), 0), PARCOURS_DISCIPLE.length - 1)
  const etape = PARCOURS_DISCIPLE[etapeIdx]

  useEffect(() => {
    if (isDemo) { setFormations([]); return }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/formations', { credentials: 'same-origin' })
        if (!r.ok) { if (!cancelled) setFormations([]); return }
        const j = await r.json()
        if (cancelled) return
        const cards: FormationCard[] = (j.data?.inscriptions || []).slice(0, 4).map((i: any) => ({
          id: i.id, slug: i.formation?.slug || '', titre: i.formation?.titre || 'Formation', progression: i.progression || 0,
        }))
        setFormations(cards)
      } catch { if (!cancelled) setFormations([]) }
    })()
    return () => { cancelled = true }
  }, [isDemo])

  const quickStats = [
    { label: 'Formations', value: String(formations?.length ?? '—'), suffix: 'inscrites', icon: BookOpen, color: '#8B5CF6' },
    { label: 'Engagement', value: String(score), suffix: '/ 100', icon: TrendingUp, color: '#22C55E' },
    { label: 'Parcours', value: `${etapeIdx + 1}`, suffix: `/ ${PARCOURS_DISCIPLE.length}`, icon: GraduationCap, color: '#0EA5E9' },
    { label: 'Étape', value: etape.nom, suffix: 'actuelle', icon: Trophy, color: '#D4AF37' },
  ]

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10">

        <AnnouncementBanner />

        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 mb-6"
          style={{ background: 'linear-gradient(135deg, #0F0820 0%, #1A0535 40%, #0a000f 100%)', border: '1px solid rgba(212,175,55,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        >
          <div className="absolute top-0 right-0 w-[500px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.18) 0%, transparent 65%)' }} />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="font-inter text-xs font-semibold" style={{ color: '#D4AF37' }}>
                  {statut}{pays ? ` · ${pays}` : ''}
                </span>
              </div>
              <h1 className="font-cinzel font-black mb-3 text-balance" style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                {prenom ? <>Bonjour, <span className="text-cinematic-gold">{prenom}</span></> : <>Bienvenue dans votre <span className="text-cinematic-gold">espace</span></>}
              </h1>
              <p className="font-inter text-sm md:text-[15px] mb-6 leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Étape actuelle : <span className="font-semibold" style={{ color: etape.couleur }}>{etape.nom}</span> — continuez votre progression spirituelle.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/member/dashboard/lives" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}>
                  <Radio className="w-3.5 h-3.5" /> Rejoindre le Live
                </Link>
                <Link href="/member/dashboard/formations" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-medium text-sm" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>
                  <BookOpen className="w-3.5 h-3.5" /> Mes Formations
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
              <div className="text-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`} style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                    <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4B0082" /><stop offset="100%" stopColor="#D4AF37" /></linearGradient></defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-cinzel font-black text-2xl leading-none" style={{ color: '#D4AF37' }}>{score}</span>
                    <span className="font-inter text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Score</span>
                  </div>
                </div>
                <p className="font-inter text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Engagement</p>
              </div>
              <div className="hidden md:block">
                <p className="font-inter text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Parcours Disciple</p>
                <div className="flex items-center gap-1.5">
                  {PARCOURS_DISCIPLE.map((p, i) => (
                    <div key={p.etape} title={p.nom} className="w-7 h-7 rounded-lg flex items-center justify-center font-cinzel font-black text-[10px]"
                      style={{ background: i <= etapeIdx ? `${p.couleur}CC` : 'rgba(255,255,255,0.05)', color: i <= etapeIdx ? '#1A0F00' : 'rgba(255,255,255,0.2)', boxShadow: i === etapeIdx ? `0 0 12px ${p.couleur}60` : 'none' }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                <p className="font-inter text-[11px] mt-2 font-semibold" style={{ color: etape.couleur }}>{etape.nom}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Verse + quick wins */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-1 rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(75,0,130,0.25) 0%, rgba(212,175,55,0.08) 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
              <span className="font-inter text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.7)' }}>Verset du Jour</span>
            </div>
            <p className="font-cormorant italic text-base leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>{DAILY_VERSE.text}</p>
            <p className="font-cinzel text-[11px] font-semibold" style={{ color: '#D4AF37' }}>{DAILY_VERSE.reference}</p>
          </div>
          <div className="md:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="font-cinzel text-sm font-bold flex items-center gap-2 mb-4" style={{ color: '#FFFFFF' }}><Zap className="w-4 h-4" style={{ color: '#F97316' }} /> Accès rapide</h3>
            <div className="space-y-2.5">
              {QUICK_WINS.map((win) => (
                <Link key={win.label} href={win.href} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${win.color}18`, border: `1px solid ${win.color}28` }}>
                    <win.icon className="w-4 h-4" style={{ color: win.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-sm font-semibold" style={{ color: '#FFFFFF' }}>{win.label}</p>
                    <p className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{win.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick stats (réels) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}28` }}>
                <stat.icon className="w-[18px] h-[18px]" style={{ color: stat.color }} />
              </div>
              <div className="font-cinzel font-black text-xl mb-0.5 truncate" style={{ color: stat.color }}>{stat.value}</div>
              <div className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.suffix}</div>
              <div className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Formations réelles */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}><BookOpen className="w-4 h-4" style={{ color: '#D4AF37' }} /> Mes Formations</h2>
                <Link href="/member/dashboard/formations" className="inline-flex items-center gap-1 font-inter text-xs" style={{ color: 'rgba(212,175,55,0.7)' }}>Voir tout <ChevronRight className="w-3 h-3" /></Link>
              </div>
              {formations === null ? (
                <p className="font-inter text-sm py-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement…</p>
              ) : formations.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(212,175,55,0.4)' }} />
                  <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Aucune formation en cours pour le moment.</p>
                  <Link href="/formations" className="inline-block mt-3 font-inter text-xs text-gold hover:underline">Découvrir les formations →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {formations.map((f) => (
                    <Link key={f.id} href={f.slug ? `/member/dashboard/formations/${f.slug}` : '/member/dashboard/formations'}
                      className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.28)' }}>
                        <BookOpen className="w-[18px] h-[18px]" style={{ color: '#8B5CF6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-inter text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>{f.titre}</p>
                          <span className="font-inter text-xs ml-3 flex-shrink-0" style={{ color: '#D4AF37' }}>{f.progression}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${f.progression}%`, background: 'linear-gradient(90deg, #6B21A8, #D4AF37)' }} />
                        </div>
                      </div>
                      {f.progression === 100 ? <Star className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} fill="#D4AF37" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Progression visible du membre (parcours de transformation) */}
            <ProgressionCard />
          </div>

          {/* Colonne droite */}
          <div className="space-y-5">
            {/* Lecture du jour — Bible LSG + plan annuel (données réelles + locales) */}
            <BibleTodayWidget />

            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-cinzel text-sm font-bold mb-4" style={{ color: '#FFFFFF' }}>Actions Rapides</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Play, label: 'Live', href: '/member/dashboard/lives', color: '#EF4444' },
                  { icon: Heart, label: 'Prières', href: '/member/dashboard/prieres', color: '#EC4899' },
                  { icon: BookOpen, label: 'Cours', href: '/member/dashboard/formations', color: '#8B5CF6' },
                  { icon: Calendar, label: 'Agenda', href: '/member/dashboard/evenements', color: '#22C55E' },
                  { icon: Users, label: 'Groupes', href: '/member/dashboard/groupes', color: '#F97316' },
                  { icon: Bell, label: 'Alertes', href: '/member/dashboard/notifications', color: '#0EA5E9' },
                ].map((action) => (
                  <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${action.color}20` }}>
                      <action.icon className="w-4 h-4" style={{ color: action.color }} />
                    </div>
                    <span className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Prochains événements — état vide */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}><Calendar className="w-4 h-4" style={{ color: '#D4AF37' }} /> Prochains</h2>
                <Link href="/member/dashboard/evenements" className="font-inter text-xs" style={{ color: 'rgba(212,175,55,0.6)' }}>Tout voir</Link>
              </div>
              <p className="font-inter text-sm py-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Aucun événement à venir.</p>
            </div>

            {/* Badges — catalogue (déblocage réel à venir) */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-cinzel text-sm font-bold flex items-center gap-2 mb-4" style={{ color: '#FFFFFF' }}><Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} /> Badges à débloquer</h2>
              <div className="grid grid-cols-5 gap-2">
                {BADGES.slice(0, 10).map((badge) => (
                  <div key={badge.id} title={badge.nom} className="aspect-square rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.5 }}>
                    <badge.icone className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                ))}
              </div>
            </div>

            <Link href="/member/dashboard/profil" className="flex items-center gap-4 p-5 rounded-2xl group" style={{ background: 'linear-gradient(135deg, rgba(75,0,130,0.15) 0%, rgba(212,175,55,0.06) 100%)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.1)' }}>
                <Shield className="w-6 h-6" style={{ color: '#D4AF37' }} />
              </div>
              <div className="flex-1">
                <p className="font-cinzel text-sm font-bold" style={{ color: '#FFFFFF' }}>Mon Profil</p>
                <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Compléter mon profil</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
