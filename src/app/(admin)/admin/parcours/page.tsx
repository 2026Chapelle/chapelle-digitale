'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ChevronRight } from 'lucide-react'
import { CmsManager } from '@/components/features/admin/CmsManager'
import { ParcoursFormationsManager } from '@/components/features/admin/ParcoursFormationsManager'

/** Bannière vers la file de validation pastorale (Phase 3C) avec compteur live. */
function ValidationBanner() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/journey-review-queue', { credentials: 'same-origin' })
      .then((r) => r.json()).then((j) => { if (!cancelled && j.ok) setCount(j.data.pendingCount ?? 0) })
      .catch(() => { /* noop */ })
    return () => { cancelled = true }
  }, [])
  return (
    <Link href="/admin/parcours/validation"
      className="flex items-center justify-between gap-3 p-4 rounded-2xl mb-6 transition-all hover:-translate-y-0.5"
      style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.09), rgba(75,0,130,0.09))', border: '1px solid rgba(212,175,55,0.22)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.14)' }}>
          <ShieldCheck className="w-5 h-5 text-gold" />
        </div>
        <div className="min-w-0">
          <div className="font-inter text-sm font-bold text-white">Validation pastorale des parcours</div>
          <div className="text-[11px] text-white/50 truncate">Reconnaître les changements de croissance et de statut communautaire — tracé nominativement.</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {count !== null && count > 0 && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.16)', color: '#F59E0B' }}>
            {count} en attente
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-gold/60" />
      </div>
    </Link>
  )
}

const CATEGORIES = [
  { value: 'conversion', label: 'Nouveau converti' },
  { value: 'priere', label: 'Vie de prière' },
  { value: 'saint_esprit', label: 'Saint-Esprit' },
  { value: 'discipulat', label: 'Discipulat' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'ministere', label: 'Ministère' },
  { value: 'famille', label: 'Mariage & Famille' },
  { value: 'finances', label: 'Finances du Royaume' },
]
const ETAPES = [
  { value: 'visiteur', label: 'Visiteur' },
  { value: 'converti', label: 'Converti' },
  { value: 'membre', label: 'Membre' },
  { value: 'disciple', label: 'Disciple' },
  { value: 'serviteur', label: 'Serviteur' },
  { value: 'responsable', label: 'Responsable' },
  { value: 'envoye', label: 'Envoyé' },
]
const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminParcoursPage() {
  return (
    <>
    <ValidationBanner />
    <CmsManager
      apiBase="/api/admin/lms"
      resource="parcours"
      previewable={true}
      itemLabel="parcours"
      title={<>Parcours de <span className="text-cinematic-gold">transformation</span></>}
      description="Parcours du tunnel Visiteur → Envoyé. Regroupez plusieurs formations par étape spirituelle."
      statusField="status"
      fields={[
        { name: 'titre', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug (URL)', required: true, placeholder: 'vie-de-priere' },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'categorie', label: 'Catégorie', type: 'select', options: CATEGORIES, default: 'discipulat' },
        { name: 'etape_tunnel', label: 'Étape du tunnel', type: 'select', options: ETAPES, default: 'membre' },
        { name: 'cover_url', label: 'Image de couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'langue', label: 'Langue', default: 'fr', hideInTable: true },
        { name: 'ordre', label: 'Ordre', type: 'number', default: 0 },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
      ]}
    />
    <ParcoursFormationsManager />
    </>
  )
}
