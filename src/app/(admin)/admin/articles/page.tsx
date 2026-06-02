'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminArticlesPage() {
  return (
    <CmsManager
      resource="articles"
      itemLabel="article"
      title={<>Arti<span className="text-cinematic-gold">cles</span></>}
      description="Blog éditorial : rédigez, publiez et gérez les articles de la Citadelle."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug (URL)', placeholder: 'mon-article', hideInTable: true },
        { name: 'excerpt', label: 'Accroche', type: 'textarea', hideInTable: true },
        { name: 'body', label: 'Contenu', type: 'textarea', hideInTable: true },
        { name: 'cover_url', label: 'Image de couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'author', label: 'Auteur', default: 'Équipe pastorale' },
        { name: 'category', label: 'Catégorie', default: 'general' },
        { name: 'tags', label: 'Tags', type: 'tags', hideInTable: true },
        { name: 'featured', label: 'Mis en avant', type: 'boolean', hideInTable: true, default: false },
        { name: 'published_at', label: 'Date de publication', type: 'datetime', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
