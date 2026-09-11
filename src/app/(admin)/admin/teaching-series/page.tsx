'use client'

import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
]

export default function AdminTeachingSeriesPage() {
  return (
    <CmsManager
      resource="teaching_series"
      itemLabel="série d’enseignement"
      previewable={false}
      title={
        <>
          Séries <span className="text-cinematic-gold">d’enseignements</span>
        </>
      }
      description="Collections éditoriales d’enseignements, par exemple « École du Royaume »."
      statusField="status"
      fields={[
        {
          name: 'title',
          label: 'Titre',
          required: true,
          placeholder: 'ex: École du Royaume',
        },
        {
          name: 'slug',
          label: 'Slug',
          required: true,
          placeholder: 'ex: ecole-du-royaume',
          help: 'Identifiant public unique de la série.',
        },
        {
          name: 'short_description',
          label: 'Description courte',
          hideInTable: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          hideInTable: true,
        },
        {
          name: 'cover_url',
          label: 'Couverture',
          type: 'file',
          accept: 'image/*',
          hideInTable: true,
        },
        {
          name: 'status',
          label: 'Statut',
          type: 'select',
          options: STATUS,
          default: 'draft',
          hideInTable: true,
        },
        {
          name: 'sort_order',
          label: 'Ordre',
          type: 'number',
          hideInTable: true,
          default: 0,
        },
      ]}
    />
  )
}