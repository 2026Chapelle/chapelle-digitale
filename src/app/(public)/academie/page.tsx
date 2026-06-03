'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Crown, Lock, Check, ArrowRight, BookOpen, GraduationCap, Clock, Trophy,
  Download, Sparkles, PlayCircle, FileText, History,
} from 'lucide-react'
import { getLevels, getLevelModules, getLibrary, type AcademieModuleView } from '@/lib/academie/student'
import { useAcademyProgress } from '@/components/academie/useAcademyProgress'
import { KingdomBadge } from '@/components/academie/KingdomBadge'
import { AcademySeal } from '@/components/academie/AcademySeal'

const N1 = 'acad-fondements'

export default function AcademiePage() {
  const prog = useAcademyProgress()
  const levels = useMemo(() => getLevels(), [])
  const niveau1 = useMemo(() => getLevelModules(N1), [])
  const library = useMemo(() => getLibrary(), [])

  const levelDone = (id: string) => getLevelModules(id).every((m) => prog.isCompleted(m.stepId))
  const levelPct = (id: string) => {
    const mods = getLevelModules(id)
    const done = mods.filter((m) => prog.isCompleted(m.stepId)).length
    return Math.round((done / mods.length) * 100)
  }
  const levelUnlocked = (i: number) => i === 0 || levelDone(levels[i - 1].id)

  const validated = niveau1.filter((m) => prog.isCompleted(m.stepId)).length
  const locked120 = levels.reduce((n, l) => n + getLevelModules(l.id).filter((m) => prog.statusOf(m.stepId) === 'locked').length, 0)
  const R = 52, C = 2 * Math.PI * R

  return (
    <div className="min-h-screen bg-charbon">

      {/* HERO */}
      <section className="section-cinematic pt-32 md:pt-36">
        <div className="halo-gold w-[900px] h-[460px] -top-10 left-1/2 -translate-x-1/2" />
        <div className="container-cinematic">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <div className="section-label-dark"><Crown className="w-3 h-3" /> CFIC · Académie des Élus</div>
              <h1 className="heading-cinematic-xl mb-4">
                Université Numérique
                <span className="block text-cinematic-gold">du Royaume</span>
              </h1>
              <p className="font-cormorant italic text-xl md:text-2xl mb-4" style={{ color: 'rgba(245,230,216,0.6)' }}>
                « Vous serez pour moi un royaume de sacrificateurs. »
              </p>
              <p className="font-inter text-base md:text-lg leading-relaxed max-w-xl" style={{ color: 'rgba(245,230,216,0.55)' }}>
                Six niveaux, 120 modules, un seul appel : être transformé et établi comme élu du Royaume.
                Pas une bibliothèque de cours — une académie de transformation.
              </p>
            </motion.div>

            {/* Anneau de progression globale */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="card-cinematic p-6 flex flex-col items-center justify-center min-w-[220px]">
              <div className="relative w-[132px] h-[132px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 132 132">
                  <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                  <circle cx="66" cy="66" r={R} fill="none" stroke="url(#acadGrad)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - prog.pct / 100)} style={{ transition: 'stroke-dashoffset 1s ease' }} />
                  <defs><linearGradient id="acadGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F5E6A7" /><stop offset="100%" stopColor="#D4AF37" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-cinzel font-black text-3xl text-cinematic-gold">{prog.pct}%</span>
                  <span className="font-inter text-[10px]" style={{ color: 'rgba(245,230,216,0.4)' }}>parcours</span>
                </div>
              </div>
              <p className="font-inter text-xs mt-3" style={{ color: 'rgba(245,230,216,0.5)' }}>{prog.completed} / 120 modules</p>
            </motion.div>
          </div>

          {/* Stats étudiant */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { icon: Check, label: 'Modules validés', value: String(validated), color: '#22C55E' },
              { icon: GraduationCap, label: 'Niveaux', value: '1 / 6', color: '#D4AF37' },
              { icon: Clock, label: "Temps d'étude", value: `${prog.studyMinutes} min`, color: '#0EA5E9' },
              { icon: Trophy, label: 'Badges', value: String(prog.badges.length), color: '#EC4899' },
            ].map((s) => (
              <div key={s.label} className="card-cinematic p-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="font-cinzel font-black text-xl text-white">{s.value}</div>
                <div className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LES 6 NIVEAUX */}
      <section className="section-cinematic pt-0">
        <div className="container-cinematic">
          <div className="section-label-dark"><Sparkles className="w-3 h-3" /> Le parcours</div>
          <h2 className="heading-cinematic-lg mb-8">Les 6 Niveaux de l&apos;Académie</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {levels.map((l, i) => {
              const unlocked = levelUnlocked(i)
              const pct = levelPct(l.id)
              return (
                <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.06 }}
                  className="card-cinematic p-5 relative" style={{ opacity: unlocked ? 1 : 0.7 }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-cinzel font-black"
                      style={{ background: `${l.couleur}1F`, border: `1px solid ${l.couleur}40`, color: l.couleur }}>
                      {l.ordre}
                    </div>
                    {unlocked
                      ? <span className="chip-gold">{pct}%</span>
                      : <span className="inline-flex items-center gap-1 text-[10px] font-inter px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(245,230,216,0.4)' }}><Lock className="w-2.5 h-2.5" /> Verrouillé</span>}
                  </div>
                  <h3 className="font-cinzel font-bold text-white text-base leading-tight mb-1">{l.titre}</h3>
                  <p className="font-inter text-xs leading-relaxed mb-3" style={{ color: 'rgba(245,230,216,0.5)' }}>{l.description}</p>
                  <div className="flex items-center justify-between text-[11px] font-inter" style={{ color: 'rgba(245,230,216,0.4)' }}>
                    <span>{l.totalModules} modules</span>
                    {!unlocked && i > 0 && <span>Validez le Niveau {i}</span>}
                  </div>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${l.couleur}, ${l.couleur}aa)` }} />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* NIVEAU 1 — 20 modules */}
          <div className="flex items-center gap-3 mb-5">
            <h3 className="font-cinzel font-bold text-lg text-white">Niveau 1 · Fondements du Royaume</h3>
            <span className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.4)' }}>{validated} / 20 validés</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {niveau1.map((m, i) => (
              <ModuleCard key={m.stepId} m={m} status={prog.statusOf(m.stepId)} delay={i * 0.03} />
            ))}
          </div>
        </div>
      </section>

      {/* TABLEAU DE BORD : Bibliothèque + Passeport + Historique */}
      <section className="section-cinematic pt-0">
        <div className="container-cinematic grid lg:grid-cols-3 gap-6">
          {/* Bibliothèque PDF */}
          <div className="card-cinematic p-6">
            <h3 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4" style={{ color: '#D4AF37' }} /> Bibliothèque du Royaume</h3>
            {library.length === 0 ? (
              <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>Vos manuels apparaîtront ici au fil de votre parcours.</p>
            ) : (
              <div className="space-y-2.5">
                {library.map((b) => (
                  <a key={b.pdf} href={b.pdf} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl group" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                      <FileText className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm font-semibold text-white truncate">{b.titre}</p>
                      <p className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.4)' }}>{b.niveau}</p>
                    </div>
                    <Download className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-y-0.5" style={{ color: 'rgba(245,230,216,0.4)' }} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Passeport du Royaume (badges) */}
          <div className="card-cinematic p-6">
            <h3 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} /> Passeport du Royaume</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              <KingdomBadge label="Né du Royaume" obtained={prog.badges.some((b) => b.label === 'Né du Royaume')} size={84} />
            </div>
            <p className="font-inter text-[11px] text-center mt-4" style={{ color: 'rgba(245,230,216,0.4)' }}>
              {prog.badges.length} badge{prog.badges.length > 1 ? 's' : ''} obtenu{prog.badges.length > 1 ? 's' : ''} · collectez-les en validant les modules
            </p>
          </div>

          {/* Historique d'apprentissage */}
          <div className="card-cinematic p-6">
            <h3 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><History className="w-4 h-4" style={{ color: '#D4AF37' }} /> Historique d&apos;apprentissage</h3>
            {prog.history.length === 0 ? (
              <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>Votre parcours commencera à s&apos;écrire ici.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {prog.history.slice(0, 12).map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs font-inter">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#D4AF37' }} />
                    <span style={{ color: 'rgba(245,230,216,0.7)' }}>{eventLabel(h.type, h.label)}</span>
                    <span className="ml-auto flex-shrink-0" style={{ color: 'rgba(245,230,216,0.3)' }}>{new Date(h.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CERTIFICATIONS & DIPLÔME */}
      <section className="section-cinematic pt-0">
        <div className="container-cinematic">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="font-cinzel font-bold text-lg text-white flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} /> Certificats &amp; Diplôme</h3>
            <Link href="/academie/verifier" className="inline-flex items-center gap-1.5 text-sm font-semibold font-inter" style={{ color: '#D4AF37' }}>
              Vérifier un certificat <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="font-inter text-sm mb-5 max-w-2xl" style={{ color: 'rgba(245,230,216,0.5)' }}>
            Un certificat officiel est décerné à la validation des <span className="text-pearl/80">20 modules</span> d&apos;un niveau.
            Les <span className="text-pearl/80">6 niveaux</span> achevés ouvrent le <span className="text-cinematic-gold font-semibold">Diplôme des Bâtisseurs du Royaume</span>.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {levels.map((l) => {
              const done = levelDone(l.id)
              return (
                <div key={l.id} className="card-cinematic p-5 flex flex-col items-center text-center" style={{ opacity: done ? 1 : 0.85 }}>
                  <AcademySeal variant={done ? 'or' : 'violet'} size={66} />
                  <p className="font-cinzel font-bold text-sm text-white mt-3 leading-tight">Certificat · {l.theme}</p>
                  <p className="font-inter text-[11px] mt-1" style={{ color: done ? '#86EFAC' : 'rgba(245,230,216,0.4)' }}>
                    {done ? 'Obtenu' : `${levelPct(l.id)}% · 20 modules requis`}
                  </p>
                </div>
              )
            })}
            {/* Diplôme suprême */}
            <div className="card-cinematic-gold p-5 flex flex-col items-center text-center sm:col-span-2 lg:col-span-4">
              <AcademySeal variant="or" size={84} />
              <p className="font-cinzel font-black text-base text-cinematic-gold mt-3">Diplôme des Bâtisseurs du Royaume</p>
              <p className="font-inter text-xs mt-1" style={{ color: 'rgba(245,230,216,0.5)' }}>
                Décerné après validation des 6 niveaux de l&apos;Académie · mention selon les résultats.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function eventLabel(type: string, label?: string) {
  switch (type) {
    case 'completed': return 'Module terminé'
    case 'badge': return `Badge obtenu : ${label}`
    case 'pdf': return 'Manuel téléchargé'
    case 'video': return 'Vidéo visionnée'
    default: return 'Module ouvert'
  }
}

function ModuleCard({ m, status, delay }: { m: AcademieModuleView; status: string; delay: number }) {
  const locked = status === 'locked'
  const done = status === 'completed'
  const inner = (
    <div className="card-cinematic overflow-hidden h-full group" style={{ opacity: locked && !m.hasRealContent ? 0.55 : 1 }}>
      <div className="relative h-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.12), #0a0613)' }}>
        {m.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt={m.titre} loading="lazy" decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" style={{ opacity: locked ? 0.5 : 1 }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><span className="font-cinzel text-4xl font-black" style={{ color: 'rgba(212,175,55,0.25)' }}>{m.ordre}</span></div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(5,3,8,0.85) 100%)' }} />
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] font-inter font-bold px-2 py-0.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.4)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.3)' }}>Module {m.ordre}</span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          {done ? <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#22C55E' }}><Check className="w-3.5 h-3.5 text-white" /></span>
            : locked ? <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}><Lock className="w-3 h-3" style={{ color: 'rgba(245,230,216,0.6)' }} /></span>
            : <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.25)', border: '1px solid rgba(212,175,55,0.5)' }}><PlayCircle className="w-4 h-4 text-white" /></span>}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3">
          <h4 className="font-cinzel font-bold text-sm text-white leading-tight line-clamp-1">{m.titre}</h4>
          {m.sousTitre && <p className="font-inter text-[10px] line-clamp-1" style={{ color: 'rgba(245,230,216,0.55)' }}>{m.sousTitre}</p>}
        </div>
      </div>
      <div className="p-3">
        {locked ? (
          <p className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
            {m.ordre === 2 ? 'Débloquez ce module après validation du Module 1' : 'Disponible après le module précédent'}
          </p>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold font-inter group-hover:gap-2 transition-all" style={{ color: '#D4AF37' }}>
            {done ? 'Revoir le module' : status === 'in_progress' ? 'Continuer' : 'Commencer'} <ArrowRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
  // Cliquable seulement si non verrouillé ET contenu réel disponible.
  if (!locked && m.hasRealContent) {
    return <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}><Link href={`/academie/${m.slug}`}>{inner}</Link></motion.div>
  }
  return <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}>{inner}</motion.div>
}
