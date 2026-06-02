'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'submitted', label: 'En attente' },
  { value: 'approved', label: 'Approuvé' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'published', label: 'Publié' },
]

export default function AdminTemoignagesPage() {
  return (
    <CmsManager
      resource="testimonies"
      itemLabel="témoignage"
      title={<>Témoignages</>}
      description="Modérez, approuvez et mettez en avant les témoignages."
      statusField="status"
      fields={[
        { name: 'author_name', label: 'Auteur', default: 'Anonyme' },
        { name: 'location', label: 'Ville / pays', hideInTable: true },
        { name: 'title', label: 'Titre' },
        { name: 'body', label: 'Témoignage', type: 'textarea', required: true },
        { name: 'avatar_url', label: 'Photo', type: 'url', hideInTable: true },
        { name: 'video_url', label: 'Vidéo', type: 'url', hideInTable: true },
        { name: 'rating', label: 'Note (1-5)', type: 'number', hideInTable: true },
        { name: 'is_anonymous', label: 'Anonyme', type: 'boolean', hideInTable: true, default: false },
        { name: 'featured', label: 'Mis en avant', type: 'boolean', default: false },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'submitted' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
