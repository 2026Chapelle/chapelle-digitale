'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminEnseignementsPage() {
  return (
    <CmsManager
      resource="enseignements"
      itemLabel="enseignement"
      title={<>Enseignements</>}
      description="Prédications et enseignements (vidéo, audio, texte)."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug', hideInTable: true },
        { name: 'speaker', label: 'Orateur' },
        { name: 'scripture', label: 'Texte biblique' },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'body', label: 'Contenu', type: 'textarea', hideInTable: true },
        { name: 'video_url', label: 'Lien vidéo', type: 'url', hideInTable: true },
        { name: 'audio_url', label: 'Lien audio', type: 'url', hideInTable: true },
        { name: 'cover_url', label: 'Image (téléverser ou coller une URL)', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'category', label: 'Catégorie', hideInTable: true },
        { name: 'tags', label: 'Tags', type: 'tags', hideInTable: true },
        { name: 'published_at', label: 'Date de publication', type: 'datetime', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
