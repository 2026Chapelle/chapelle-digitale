'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

// PODCAST-0B — modèle éditorial. `access_level` est une donnée éditoriale (badge,
// tri), PAS un verrou de lecture (la RLS laisse lire tout épisode publié).
const ACCESS = [
  { value: 'public', label: 'Public (écoute libre)' },
  { value: 'member', label: 'Membre' },
  { value: 'premium', label: 'Premium' },
]

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
        { name: 'serie', label: 'Émission', placeholder: "ex: L'Instant Citadelle" },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'audio_url', label: 'Lien audio', type: 'url' },
        { name: 'youtube_url', label: 'Lien YouTube', type: 'url', hideInTable: true },
        { name: 'cover_url', label: 'Image', type: 'url', hideInTable: true },
        { name: 'access_level', label: 'Accès', type: 'select', options: ACCESS, default: 'member' },
        {
          name: 'destinations', label: 'Destinations', type: 'tags', hideInTable: true,
          placeholder: 'catalog, home_instant, home_premium, featured',
        },
        { name: 'is_featured', label: 'À la une', type: 'boolean', default: false },
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
