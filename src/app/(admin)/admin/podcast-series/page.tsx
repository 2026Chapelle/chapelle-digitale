'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

// PODCAST-SPINE — Séries mensuelles (niveau 2). Chaque série appartient à une
// Émission (show_id, ref-select). Table cms_podcast_series.
export default function AdminPodcastSeriesPage() {
  return (
    <CmsManager
      resource="podcast_series"
      itemLabel="série"
      previewable={false}
      title={<>Séries <span className="text-cinematic-gold">podcast</span></>}
      description="Séries mensuelles d'une émission (ex. « La grâce royale m'a localisé »). Chaque série regroupe des saisons."
      statusField="status"
      fields={[
        { name: 'show_id', label: 'Émission', required: true, type: 'ref-select', refResource: 'podcast_shows',
          emptyLabel: '— Choisir une émission —',
          refLabel: (r) => `${r.title || 'Sans titre'}${r.status === 'published' ? '' : ' · brouillon'}`,
          placeholder: 'UUID de l’émission (repli si liste indisponible)' },
        { name: 'title', label: 'Titre', required: true, placeholder: "ex: La grâce royale m'a localisé" },
        { name: 'slug', label: 'Slug', required: true, placeholder: 'ex: grace-royale-localise',
          help: 'Unique au sein de l’émission (deux émissions peuvent réutiliser le même slug).' },
        { name: 'short_description', label: 'Description courte', hideInTable: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'cover_url', label: 'Couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'editorial_period', label: 'Période éditoriale', placeholder: 'ex: 2026-08', hideInTable: true,
          help: 'Repère interne (ex. mois de diffusion). Non affiché publiquement automatiquement.' },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
