'use client'

import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
]

const ACCESS = [
  { value: 'public', label: 'Public — accès libre' },
  { value: 'member', label: 'Membres Citadelle' },
  { value: 'premium', label: 'Premium Enseignements' },
]

export default function AdminEnseignementsPage() {
  return (
    <CmsManager
      resource="teachings"
      itemLabel="enseignement"
      title={<>Enseignements</>}
      description="Prédications et enseignements (vidéo, audio, texte)."
      statusField="status"
      fields={[
        {
          name: 'title',
          label: 'Titre',
          required: true,
        },
        {
          name: 'slug',
          label: 'Slug',
          hideInTable: true,
        },
        {
          name: 'speaker',
          label: 'Orateur',
        },
        {
          name: 'scripture',
          label: 'Texte biblique',
        },

        // Série → Saison. Les deux restent facultatives :
        // un enseignement peut exister de manière autonome.
        {
          name: 'series_id',
          label: 'Série',
          type: 'ref-select',
          refResource: 'teaching_series',
          emptyLabel: '— Aucun rattachement —',
          hideInTable: true,
          clears: ['season_id'],
          refLabel: (r) =>
            `${r.title || 'Sans titre'}${r.status === 'published' ? '' : ' · brouillon'}`,
          placeholder: 'UUID de la série (repli si liste indisponible)',
          help: 'Facultatif. Ex. « École du Royaume ». Changer la série vide automatiquement la saison.',
        },
        {
          name: 'season_id',
          label: 'Saison',
          type: 'ref-select',
          refResource: 'teaching_seasons',
          emptyLabel: '— Aucune saison —',
          hideInTable: true,
          requires: 'series_id',
          refFilter: (r, ed) =>
            r.series_id === ed.series_id,
          refLabel: (r) =>
            `Saison ${r.season_number ?? '?'}${r.title ? ' · ' + r.title : ''}`,
          placeholder: 'Choisir d’abord une série',
          help: 'Facultatif. La liste est filtrée selon la série sélectionnée.',
        },

        {
          name: 'category',
          label: 'Catégorie',
          hideInTable: true,
          help: 'Thème transversal : maturité, foi, prière, leadership, couple…',
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'tags',
          hideInTable: true,
        },

        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          hideInTable: true,
        },
        {
          name: 'body',
          label: 'Contenu',
          type: 'textarea',
          hideInTable: true,
        },

        {
          name: 'video_url',
          label: 'Lien vidéo',
          type: 'url',
          hideInTable: true,
        },
        {
          name: 'audio_url',
          label: 'Lien audio',
          type: 'url',
          hideInTable: true,
        },
        {
          name: 'cover_url',
          label: 'Image (téléverser ou coller une URL)',
          type: 'file',
          accept: 'image/*',
          hideInTable: true,
        },

        {
          name: 'access_level',
          label: 'Accès',
          type: 'select',
          options: ACCESS,
          default: 'public',
          help: 'Public = libre. Membres = membre Citadelle. Premium = membre + droit teachings_premium.',
        },
        {
          name: 'is_featured',
          label: 'À la une',
          type: 'boolean',
          default: false,
        },

        {
          name: 'published_at',
          label: 'Date de publication',
          type: 'datetime',
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