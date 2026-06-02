'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Vidéo' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDF' },
  { value: 'youtube', label: 'YouTube' },
]
const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminMediasPage() {
  return (
    <CmsManager
      resource="media"
      itemLabel="média"
      title={<>Média<span className="text-cinematic-gold">thèque</span></>}
      description="Bibliothèque de médias : images, vidéos, audio, PDF, YouTube."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'type', label: 'Type', type: 'select', options: TYPES, default: 'image' },
        { name: 'url', label: 'Fichier (upload) / lien', type: 'file', required: true, accept: 'image/*,video/*,audio/*,application/pdf' },
        { name: 'thumbnail_url', label: 'Vignette', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'category', label: 'Catégorie', default: 'general' },
        { name: 'alt', label: 'Texte alternatif', hideInTable: true },
        { name: 'platform', label: 'Plateforme', hideInTable: true },
        { name: 'tags', label: 'Tags', type: 'tags', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
