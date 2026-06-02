'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminPagesPage() {
  return (
    <CmsManager
      resource="pages"
      itemLabel="page"
      title={<>Pages <span className="text-cinematic-gold">éditoriales</span></>}
      description="Créez et publiez les pages du site (slug, SEO, statut)."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug', placeholder: 'ex: notre-histoire', required: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'seo_title', label: 'Titre SEO', hideInTable: true },
        { name: 'seo_description', label: 'Description SEO', type: 'textarea', hideInTable: true },
        { name: 'og_image', label: 'Image OG', type: 'url', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
