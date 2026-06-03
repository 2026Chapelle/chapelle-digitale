'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown, Check, Lock, Award, ScrollText, GraduationCap, History, ShieldCheck } from 'lucide-react'
import { getLevels, getLevelModules } from '@/lib/academie/student'
import { useAcademyProgress } from '@/components/academie/useAcademyProgress'
import { KingdomBadge } from '@/components/academie/KingdomBadge'
import { AcademySeal } from '@/components/academie/AcademySeal'
import { listCredentials } from '@/lib/academie/credentials'

export default function PasseportPage() {
  const prog = useAcademyProgress()
  const levels = useMemo(() => getLevels(), [])
  const creds = useMemo(() => (prog.ready ? listCredentials() : []), [prog.ready, prog.completed])
  const certs = creds.filter((c) => c.type === 'certificate')
  const diploma = creds.find((c) => c.type === 'diploma')

  const levelDone = (id: string) => getLevelModules(id).every((m) => prog.isCompleted(m.stepId))
  const niveau1Done = getLevelModules('acad-fondements').filter((m) => prog.isCompleted(m.stepId)).length

  return (
    <div className="min-h-screen bg-charbon pt-28 pb-20">
      <div className="container-cinematic max-w-4xl">
        <Link href="/member/dashboard/formations" className="inline-flex items-center gap-1.5 font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> Académie des Élus
        </Link>

        {/* En-tête passeport */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-cinematic-gold p-6 md:p-8 mb-6 flex flex-col sm:flex-row items-center gap-6">
          <AcademySeal variant="violet" size={96} />
          <div className="flex-1 text-center sm:text-left">
            <div className="section-label-dark"><Crown className="w-3 h-3" /> Passeport du Royaume</div>
            <h1 className="font-cinzel font-black text-2xl md:text-3xl text-white">Mon parcours d&apos;élu</h1>
            <p className="font-inter text-sm mt-1" style={{ color: 'rgba(245,230,216,0.55)' }}>
              {prog.completed} / 120 modules · {certs.length} certificat{certs.length > 1 ? 's' : ''} · {prog.badges.length} badge{prog.badges.length > 1 ? 's' : ''} · {prog.studyMinutes} min d&apos;étude
            </p>
          </div>
          <div className="text-center">
            <div className="font-cinzel font-black text-4xl text-cinematic-gold">{prog.pct}%</div>
            <div className="font-inter text-[10px]" style={{ color: 'rgba(245,230,216,0.4)' }}>progression</div>
          </div>
        </motion.div>

        {/* Badges */}
        <section className="mb-6">
          <h2 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><Award className="w-4 h-4" style={{ color: '#D4AF37' }} /> Mes badges</h2>
          <div className="card-cinematic p-6 flex flex-wrap gap-6 justify-center sm:justify-start">
            <KingdomBadge label="Né du Royaume" obtained={prog.badges.some((b) => b.label === 'Né du Royaume')} size={88} />
          </div>
        </section>

        {/* Niveaux */}
        <section className="mb-6">
          <h2 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><GraduationCap className="w-4 h-4" style={{ color: '#D4AF37' }} /> Mes niveaux</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {levels.map((l, i) => {
              const done = levelDone(l.id)
              const current = i === 0 && !done
              return (
                <div key={l.id} className="card-cinematic p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-cinzel font-black text-xs"
                    style={{ background: `${l.couleur}1F`, border: `1px solid ${l.couleur}40`, color: l.couleur }}>
                    {done ? <Check className="w-4 h-4" /> : i === 0 ? l.ordre : <Lock className="w-3.5 h-3.5" style={{ color: 'rgba(245,230,216,0.4)' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-cinzel font-bold text-sm text-white truncate">{l.titre.replace(/^Niveau \d+ · /, '')}</p>
                    <p className="font-inter text-[11px]" style={{ color: done ? '#86EFAC' : 'rgba(245,230,216,0.4)' }}>
                      {done ? 'Validé' : current ? `${niveau1Done}/20 modules` : 'Verrouillé'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Certificats & Diplôme */}
        <section className="mb-6">
          <h2 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><ScrollText className="w-4 h-4" style={{ color: '#D4AF37' }} /> Certificats &amp; Diplôme</h2>
          {certs.length === 0 && !diploma ? (
            <div className="card-cinematic p-6 text-center">
              <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>
                Vos certificats de niveau apparaîtront ici à la validation des 20 modules d&apos;un niveau.
              </p>
              <Link href="/academie/certificat/apercu-niveau" className="btn-glass-cinematic inline-flex mt-3 text-sm">Voir le modèle officiel</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {certs.map((c) => (
                <Link key={c.code} href={`/academie/certificat/${c.code}`} className="card-cinematic p-4 flex items-center gap-3 group">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-cinzel font-bold text-sm text-white truncate">Certificat · {c.title}</p>
                    <p className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.4)' }}>{c.code} · {new Date(c.issuedAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="font-inter text-xs font-semibold" style={{ color: '#D4AF37' }}>Voir / Imprimer</span>
                </Link>
              ))}
              {diploma && (
                <Link href={`/academie/certificat/${diploma.code}`} className="card-cinematic-gold p-4 flex items-center gap-3">
                  <Crown className="w-5 h-5 flex-shrink-0" style={{ color: '#F5E6A7' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-cinzel font-bold text-sm text-white">{diploma.title}</p>
                    <p className="font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.5)' }}>{diploma.code} · Mention {diploma.mention}</p>
                  </div>
                  <span className="font-inter text-xs font-semibold" style={{ color: '#F5E6A7' }}>Voir / Imprimer</span>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Historique */}
        <section>
          <h2 className="font-cinzel font-bold text-white flex items-center gap-2 mb-4"><History className="w-4 h-4" style={{ color: '#D4AF37' }} /> Historique permanent</h2>
          <div className="card-cinematic p-5">
            {prog.history.length === 0 ? (
              <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.4)' }}>Votre parcours commencera à s&apos;écrire ici.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {prog.history.slice(0, 20).map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs font-inter">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#D4AF37' }} />
                    <span style={{ color: 'rgba(245,230,216,0.7)' }}>
                      {h.type === 'completed' ? 'Module terminé' : h.type === 'badge' ? `Badge : ${h.label}` : h.type === 'pdf' ? 'Manuel téléchargé' : h.type === 'video' ? 'Vidéo visionnée' : 'Module ouvert'}
                    </span>
                    <span className="ml-auto flex-shrink-0" style={{ color: 'rgba(245,230,216,0.3)' }}>{new Date(h.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
