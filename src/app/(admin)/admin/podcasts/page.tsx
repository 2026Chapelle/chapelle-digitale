'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminPodcastsPage() {
  return (
    <CmsManager
      resource="podcasts"
      itemLabel="podcast"
      title={<>Podcasts</>}
      description="Gérez les épisodes audio et leurs métadonnées."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'audio_url', label: 'Lien audio', type: 'url' },
        { name: 'youtube_url', label: 'Lien YouTube', type: 'url', hideInTable: true },
        { name: 'cover_url', label: 'Image', type: 'url', hideInTable: true },
        { name: 'saison', label: 'Saison', type: 'number', hideInTable: true },
        { name: 'episode', label: 'Épisode', type: 'number' },
        { name: 'duration', label: 'Durée', placeholder: 'ex: 42 min', hideInTable: true },
        { name: 'published_at', label: 'Date de publication', type: 'datetime', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
