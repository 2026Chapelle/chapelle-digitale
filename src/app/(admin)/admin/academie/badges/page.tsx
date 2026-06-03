'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'published', label: 'Publié' }, { value: 'planned', label: 'À venir' }, { value: 'archived', label: 'Archivé' }]

export default function AdminAcademieBadges() {
  return (
    <CmsManager
      apiBase="/api/admin/academy" resource="badges" itemLabel="badge" previewable={false}
      statusField="status" statusColumn="status" publishedValue="published" draftValue="planned"
      eyebrow="Académie des Élus"
      title={<>Gérer les <span className="text-cinematic-gold">Badges</span></>}
      description="Catalogue des badges de module (M1 = « Né du Royaume »). Remis automatiquement à la validation du module. Requiert la migration academy poussée."
      fields={[
        { name: 'titre', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug', placeholder: 'ne-du-royaume' },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'image_url', label: 'Image du badge', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'module_id', label: 'Module qui le décerne (id)', hideInTable: true, placeholder: 'uuid du module' },
      ]}
    />
  )
}
