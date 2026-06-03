'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'published', label: 'Publié' }, { value: 'planned', label: 'À venir' }, { value: 'archived', label: 'Archivé' }]

export default function AdminAcademieNiveaux() {
  return (
    <CmsManager
      apiBase="/api/admin/academy" resource="levels" itemLabel="niveau" previewable={false}
      statusField="status" statusColumn="status" publishedValue="published" draftValue="planned"
      eyebrow="Académie des Élus"
      title={<>Gérer les <span className="text-cinematic-gold">Niveaux</span></>}
      description="Les 6 niveaux officiels (Fondements → Bâtisseurs). Requiert la migration academy poussée (db:push)."
      fields={[
        { name: 'ordre', label: 'Ordre', type: 'number', default: 1 },
        { name: 'titre', label: 'Titre', required: true },
        { name: 'theme', label: 'Thème' },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'planned' },
        { name: 'slug', label: 'Slug', hideInTable: true, placeholder: 'fondements-du-royaume' },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'couleur', label: 'Couleur', hideInTable: true, placeholder: '#D4AF37' },
        { name: 'score_min_moyen', label: 'Score min. moyen', type: 'number', hideInTable: true },
      ]}
    />
  )
}
