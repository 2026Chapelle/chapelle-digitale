'use client'

import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
]

export default function AdminTeachingSeasonsPage() {
  return (
    <CmsManager
      resource="teaching_seasons"
      itemLabel="saison d’enseignement"
      previewable={false}
      title={
        <>
          Saisons <span className="text-cinematic-gold">d’enseignements</span>
        </>
      }
      description="Saisons rattachées aux séries d’enseignements."
      statusField="status"
      fields={[
        {
          name: 'series_id',
          label: 'Série',
          required: true,
          type: 'ref-select',
          refResource: 'teaching_series',
          emptyLabel: '— Choisir une série —',
          hideInTable: true,
          refLabel: (r) =>
            `${r.title || 'Sans titre'}${r.status === 'published' ? '' : ' · brouillon'}`,
          placeholder: 'UUID de la série (repli si liste indisponible)',
        },
        {
          name: 'season_number',
          label: 'Numéro de saison',
          type: 'number',
          required: true,
          default: 1,
          help: 'Entier positif et unique au sein de la série.',
        },
        {
          name: 'title',
          label: 'Titre',
          placeholder: 'ex: Les fondements du Royaume',
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