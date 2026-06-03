'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Crown, Lock, Check, ArrowRight, PlayCircle, GraduationCap, ScrollText } from 'lucide-react'
import { getLevels, getLevelModules } from '@/lib/academie/student'
import { useAcademyProgress } from '@/components/academie/useAcademyProgress'
import { isIntegrationDone, isLevelUnlocked } from '@/lib/academie/gating'
import { useAuth } from '@/components/providers/AuthProvider'

/**
 * Académie des Élus — intégrée dans « Mes Formations ».
 * Verrouillée tant que le parcours d'intégration n'est pas terminé ; déblocage
 * SÉQUENTIEL des 6 niveaux. Connectée au statut du membre (pas de 2e système).
 */
export function AcademieFormationBlock() {
  const { profile } = useAuth()
  const prog = useAcademyProgress()
  const levels = useMemo(() => getLevels(), [])
  const integrationDone = isIntegrationDone(profile as any)
  const [openLevel, setOpenLevel] = useState<string>('acad-fondements')

  const levelValidated = (id: string) => getLevelModules(id).every((m) => prog.isCompleted(m.stepId))
  const levelPct = (id: string) => {
    const mods = getLevelModules(id)
    return Math.round((mods.filter((m) => prog.isCompleted(m.stepId)).length / mods.length) * 100)
  }
  const unlockedAt = (i: number) => isLevelUnlocked(i, integrationDone, i > 0 ? levelValidated(levels[i - 1].id) : false)

  const openModules = useMemo(() => getLevelModules(openLevel), [openLevel])
  const openIndex = levels.findIndex((l) => l.id === openLevel)
  const openUnlocked = unlockedAt(openIndex)

  return (
    <div className="card-cinematic p-6 mb-10" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.16)', border: '1px solid rgba(124,58,237,0.4)' }}>
            <Crown className="w-5 h-5" style={{ color: '#A855F7' }} />
          </div>
          <div>
            <h2 className="font-cinzel font-bold text-pearl text-lg leading-tight">Académie des Élus</h2>
            <p className="font-inter text-xs text-pearl/45">Le parcours de formation du CFIC · 6 niveaux × 20 modules</p>
          </div>
        </div>
        <Link href="/academie/passeport" className="inline-flex items-center gap-1.5 text-sm font-inter text-gold/80 hover:text-gold">
          <ScrollText className="w-4 h-4" /> Mon passeport
        </Link>
      </div>

      {/* Verrou intégration */}
      {!integrationDone ? (
        <div className="mt-5 rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(212,175,55,0.3)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Lock className="w-6 h-6" style={{ color: 'rgba(245,230,216,0.5)' }} />
          </div>
          <p className="font-cinzel font-bold text-pearl mb-1">Académie verrouillée</p>
          <p className="font-inter text-sm text-pearl/55 max-w-md mx-auto mb-4">
            L&apos;Académie des Élus se débloque lorsque votre <span className="text-pearl/80">parcours d&apos;intégration</span> est terminé.
            Avancez dans votre parcours de croissance pour ouvrir le Niveau 1.
          </p>
          <Link href="/member/dashboard/parcours" className="btn-gold-cinematic inline-flex text-sm">
            <GraduationCap className="w-4 h-4" /> Voir Mon Parcours
          </Link>
        </div>
      ) : (
        <>
          {/* 6 niveaux */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5 mb-5">
            {levels.map((l, i) => {
              const unlocked = unlockedAt(i)
              const validated = levelValidated(l.id)
              const isOpen = l.id === openLevel
              return (
                <button key={l.id} onClick={() => unlocked && setOpenLevel(l.id)} disabled={!unlocked}
                  className="text-left rounded-2xl p-4 transition-all disabled:cursor-not-allowed"
                  style={{
                    background: isOpen ? `${l.couleur}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isOpen ? `${l.couleur}45` : 'rgba(255,255,255,0.07)'}`,
                    opacity: unlocked ? 1 : 0.6,
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center font-cinzel font-black text-xs" style={{ background: `${l.couleur}1F`, border: `1px solid ${l.couleur}40`, color: l.couleur }}>
                      {validated ? <Check className="w-4 h-4" /> : unlocked ? l.ordre : <Lock className="w-3.5 h-3.5" style={{ color: 'rgba(245,230,216,0.4)' }} />}
                    </span>
                    <span className="font-inter text-[10px]" style={{ color: validated ? '#86EFAC' : 'rgba(245,230,216,0.4)' }}>
                      {validated ? 'Validé' : unlocked ? `${levelPct(l.id)}%` : 'Verrouillé'}
                    </span>
                  </div>
                  <p className="font-cinzel font-bold text-sm text-pearl leading-tight">{l.titre.replace(/^Niveau \d+ · /, `Niveau ${l.ordre} · `)}</p>
                  <p className="font-inter text-[11px] text-pearl/40 mt-0.5">{l.totalModules} modules</p>
                </button>
              )
            })}
          </div>

          {/* Modules du niveau ouvert */}
          <div className="border-t border-white/5 pt-4">
            <p className="font-cinzel text-sm font-bold text-pearl mb-3">{levels[openIndex]?.titre} — modules</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {openModules.map((m) => {
                const st = openUnlocked ? prog.statusOf(m.stepId) : 'locked'
                const done = st === 'completed'
                const clickable = st !== 'locked' && m.hasRealContent
                const tile = (
                  <div className="rounded-xl p-3 h-full flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: st === 'locked' ? 0.6 : 1 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-inter text-[10px] text-pearl/40">Module {m.ordre}</span>
                      {done ? <Check className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                        : st === 'locked' ? <Lock className="w-3 h-3" style={{ color: 'rgba(245,230,216,0.4)' }} />
                        : <PlayCircle className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />}
                    </div>
                    <p className="font-inter text-xs font-semibold text-pearl/85 leading-tight line-clamp-2">{m.titre}</p>
                    {clickable && <span className="font-inter text-[10px] text-gold/80 mt-auto pt-1.5 inline-flex items-center gap-0.5">{done ? 'Revoir' : 'Ouvrir'} <ArrowRight className="w-3 h-3" /></span>}
                  </div>
                )
                return clickable
                  ? <Link key={m.stepId} href={`/academie/${m.slug}`}>{tile}</Link>
                  : <div key={m.stepId}>{tile}</div>
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
