'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { GraduationCap, Layers, BookOpen, Award, FileText, Video, Image as ImageIcon, ExternalLink, Database, Lock, ListChecks, Users, ScrollText } from 'lucide-react'
import { getLevels, getLevelModules } from '@/lib/academie/student'

/**
 * Administration de l'Académie des Élus — vue d'ensemble.
 *
 * Lecture de la STRUCTURE depuis le registry (src/lib/parcours) → toujours
 * disponible, même sans base. Le CRUD complet (création/édition de modules,
 * upload PDF/vidéo, quiz, badges, certificats, suivi étudiants, statistiques)
 * s'active une fois la migration `academy` poussée (db:push) et les endpoints
 * /api/admin/academie branchés. Aucune donnée fictive.
 */
export default function AdminAcademiePage() {
  const levels = useMemo(() => getLevels(), [])
  const niveau1 = useMemo(() => getLevelModules('acad-fondements'), [])
  const totalModules = levels.reduce((n, l) => n + l.totalModules, 0)
  const published = niveau1.filter((m) => m.hasRealContent).length

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-label mb-0">Administration</div>
        </div>
        <h1 className="font-cinzel font-black text-pearl mb-1" style={{ fontSize: 'clamp(1.6rem,3vw,2.3rem)' }}>
          Académie des Élus <span className="text-cinematic-gold">— Gestion</span>
        </h1>
        <p className="font-inter text-sm text-pearl/50 mb-6 max-w-2xl">
          Structure officielle : 6 niveaux × 20 modules. Le contenu réel et la progression vivent en base (schéma <code className="text-gold/80">academy</code>).
        </p>

        {/* Bandeau activation DB */}
        <div className="card-cinematic p-4 mb-6 flex items-start gap-3">
          <Database className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-inter text-sm text-pearl/80 font-semibold">Édition complète après migration</p>
            <p className="font-inter text-xs text-pearl/50 mt-0.5">
              Poussez <code className="text-gold/80">supabase/migrations/…_academy.sql</code> (<code>db:push</code>) puis branchez
              <code className="text-gold/80"> /api/admin/academie</code> pour activer : création/édition de modules, upload PDF/vidéo/couverture,
              quiz officiels, badges, certificats, diplômes, suivi étudiants et statistiques.
            </p>
          </div>
        </div>

        {/* Gestionnaires */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { href: '/admin/academie/niveaux', label: 'Niveaux', icon: Layers },
            { href: '/admin/academie/modules', label: 'Modules', icon: BookOpen },
            { href: '/admin/academie/quiz', label: 'Quiz', icon: ListChecks },
            { href: '/admin/academie/badges', label: 'Badges', icon: Award },
            { href: '/admin/academie/etudiants', label: 'Étudiants', icon: Users },
            { href: '/academie/verifier', label: 'Vérifier', icon: ScrollText },
          ].map((m) => (
            <Link key={m.href} href={m.href} className="card-cinematic p-4 flex flex-col items-center gap-2 text-center hover:border-gold/30 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                <m.icon className="w-5 h-5 text-gold" />
              </div>
              <span className="font-inter text-xs font-semibold text-pearl/80">{m.label}</span>
            </Link>
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Layers, label: 'Niveaux', value: String(levels.length), color: '#D4AF37' },
            { icon: BookOpen, label: 'Modules', value: String(totalModules), color: '#0EA5E9' },
            { icon: GraduationCap, label: 'Modules publiés', value: String(published), color: '#22C55E' },
            { icon: Award, label: 'Badges', value: '1', color: '#8B5CF6' },
          ].map((s) => (
            <div key={s.label} className="card-cinematic p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="font-cinzel font-black text-xl text-pearl">{s.value}</div>
              <div className="font-inter text-[11px] text-pearl/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Niveaux */}
        <h2 className="font-cinzel font-bold text-pearl mb-3">Niveaux</h2>
        <div className="card-cinematic overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead><tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
              <th className="px-4 py-3 w-12">#</th><th className="px-4 py-3">Niveau</th><th className="px-4 py-3">Thème</th><th className="px-4 py-3 text-right">Modules</th>
            </tr></thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.id} className="border-b border-white/[0.03]">
                  <td className="px-4 py-3 font-cinzel font-black" style={{ color: l.couleur }}>{l.ordre}</td>
                  <td className="px-4 py-3 text-pearl/85 font-semibold">{l.titre}</td>
                  <td className="px-4 py-3 text-pearl/50">{l.theme}</td>
                  <td className="px-4 py-3 text-right text-pearl/60">{l.totalModules}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Niveau 1 — modules + ressources réelles */}
        <h2 className="font-cinzel font-bold text-pearl mb-3">Niveau 1 — Fondements du Royaume · ressources</h2>
        <div className="card-cinematic overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
              <th className="px-4 py-3 w-12">#</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Ressources</th>
            </tr></thead>
            <tbody>
              {niveau1.map((m) => (
                <tr key={m.stepId} className="border-b border-white/[0.03]">
                  <td className="px-4 py-3 text-pearl/40">{m.ordre}</td>
                  <td className="px-4 py-3"><span className="text-pearl/85 font-semibold">{m.titre}</span>{m.sousTitre && <span className="block text-[11px] text-pearl/40">{m.sousTitre}</span>}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={m.hasRealContent ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : { background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}>
                      {m.hasRealContent ? (m.ordre === 1 ? 'Publié' : 'Verrouillé') : 'Structure'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-pearl/40">
                      <span title="Manuel PDF" className="inline-flex items-center gap-1">{m.pdf ? <a href={m.pdf} target="_blank" rel="noreferrer" className="text-gold/80 inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /><ExternalLink className="w-3 h-3" /></a> : <FileText className="w-3.5 h-3.5 opacity-30" />}</span>
                      <span title="Couverture" className="inline-flex">{m.cover ? <ImageIcon className="w-3.5 h-3.5 text-gold/70" /> : <ImageIcon className="w-3.5 h-3.5 opacity-30" />}</span>
                      <span title="Vidéo" className="inline-flex">{m.videoUrl ? <Video className="w-3.5 h-3.5 text-gold/70" /> : <Video className="w-3.5 h-3.5 opacity-30" />}</span>
                      {!m.hasRealContent && <Lock className="w-3 h-3 opacity-40" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link href="/member/dashboard/formations" className="btn-glass-cinematic inline-flex text-sm">Voir dans Mes Formations <ExternalLink className="w-4 h-4" /></Link>
        </div>
      </div>
    </div>
  )
}
