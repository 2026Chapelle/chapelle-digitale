'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'scheduled', label: 'Programmé' },
  { value: 'live', label: 'En direct' },
  // LIVE & REPLAY V1 : direct terminé dont l'archive YouTube n'est pas encore consultable (invisible du public).
  { value: 'replay_pending', label: 'Replay en attente' },
  { value: 'ended', label: 'Terminé (replay disponible)' },
  // Programmation YouTube annulée ou supprimée sans jamais avoir été diffusée (invisible du public).
  { value: 'cancelled', label: 'Annulé (jamais diffusé)' },
  { value: 'published', label: 'Publié' },
]

export default function AdminLivesPage() {
  return (
    <CmsManager
      resource="lives"
      itemLabel="live"
      title={<>Lives & <span className="text-cinematic-gold">Cultes</span></>}
      description="Programmez les diffusions en direct et les cultes (YouTube / vidéo). Les directs de la chaîne YouTube autorisée sont synchronisés automatiquement (programmé → en direct → replay)."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'youtube_url', label: 'Lien YouTube', type: 'url' },
        { name: 'video_url', label: 'Lien vidéo', type: 'url', hideInTable: true },
        { name: 'cover_url', label: 'Image de couverture', type: 'url', hideInTable: true },
        { name: 'scheduled_at', label: 'Date / heure', type: 'datetime' },
        { name: 'is_live', label: 'En direct maintenant', type: 'boolean', hideInTable: true, default: false },
        { name: 'platform', label: 'Plateforme', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'scheduled' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
