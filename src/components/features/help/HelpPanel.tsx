'use client'
import Link from 'next/link'
import { Target, Clock, ListChecks, AlertTriangle, ArrowRight } from 'lucide-react'
import type { Guide } from '@/lib/help/guides'

/** Panneau d'un guide complet (titre, objectif, quand, étapes, erreurs, lien). */
export function HelpPanel({ guide, highlight = false }: { guide: Guide; highlight?: boolean }) {
  return (
    <article
      id={`guide-${guide.id}`}
      className="card-cinematic p-5 scroll-mt-28"
      style={highlight ? { borderColor: 'rgba(212,175,55,0.45)' } : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-inter mb-1" style={{ color: '#D4AF37' }}>{guide.category}</div>
          <h3 className="font-cinzel text-base font-bold text-pearl">{guide.title}</h3>
        </div>
      </div>

      <Block icon={Target} label="Objectif"><p className="text-sm text-pearl/65 font-inter">{guide.objectif}</p></Block>
      <Block icon={Clock} label="Quand l'utiliser"><p className="text-sm text-pearl/65 font-inter">{guide.quand}</p></Block>
      <Block icon={ListChecks} label="Étapes">
        <ol className="space-y-1.5">
          {guide.etapes.map((e, i) => (
            <li key={i} className="flex gap-2 text-sm text-pearl/65 font-inter">
              <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{i + 1}</span>
              <span>{e}</span>
            </li>
          ))}
        </ol>
      </Block>
      <Block icon={AlertTriangle} label="Erreurs fréquentes">
        <ul className="space-y-1">
          {guide.erreurs.map((e, i) => (
            <li key={i} className="flex gap-2 text-sm text-pearl/55 font-inter"><span className="text-danger/70">•</span><span>{e}</span></li>
          ))}
        </ul>
      </Block>

      <Link href={guide.href} className="inline-flex items-center gap-1.5 text-xs font-inter font-semibold mt-1" style={{ color: '#D4AF37' }}>
        Ouvrir la page concernée <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </article>
  )
}

function Block({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
        <span className="text-[11px] uppercase tracking-wider font-inter font-semibold text-pearl/40">{label}</span>
      </div>
      {children}
    </div>
  )
}
