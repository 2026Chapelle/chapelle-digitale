'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

// PODCAST-SPINE — Saisons thématiques (niveau 3). Chaque saison appartient à une
// Série (series_id, ref-select). Table cms_podcast_seasons. Identifiant = numéro
// de saison, unique par série. (Pas de champ date de publication dans le schéma.)
export default function AdminPodcastSeasonsPage() {
  return (
    <CmsManager
      resource="podcast_seasons"
      itemLabel="saison"
      previewable={false}
      title={<>Saisons <span className="text-cinematic-gold">podcast</span></>}
      description="Saisons thématiques d'une série (ex. Saison 1 « La grâce royale m'a localisé »)."
      statusField="status"
      fields={[
        { name: 'series_id', label: 'Série', required: true, type: 'ref-select', refResource: 'podcast_series',
          emptyLabel: '— Choisir une série —',
          refLabel: (r) => `${r.title || 'Sans titre'}${r.editorial_period ? ' · ' + r.editorial_period : ''}${r.status === 'published' ? '' : ' · brouillon'}`,
          placeholder: 'UUID de la série (repli si liste indisponible)' },
        { name: 'season_number', label: 'Numéro de saison', type: 'number', required: true, default: 1,
          help: 'Entier positif, unique au sein de la série (Saison 1, 2, 3…).' },
        { name: 'title', label: 'Titre', placeholder: 'Thème de la saison (facultatif)' },
        { name: 'short_description', label: 'Description courte', hideInTable: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'cover_url', label: 'Couverture', type: 'file', accept: 'image/*', hideInTable: true,
          help: 'Optionnelle — le front utilise un fallback si absente.' },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
