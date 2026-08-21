'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'scheduled', label: 'Programmé' },
  { value: 'live', label: 'En direct' },
  { value: 'ended', label: 'Terminé' },
  { value: 'published', label: 'Publié' },
]

export default function AdminLivesPage() {
  return (
    <CmsManager
      resource="lives"
      itemLabel="live"
      title={<>Lives & <span className="text-cinematic-gold">Cultes</span></>}
      description="Programmez les diffusions en direct et les cultes (YouTube / vidéo)."
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
