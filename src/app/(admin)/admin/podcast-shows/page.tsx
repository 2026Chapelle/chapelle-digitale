'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

// PODCAST-SPINE — Émissions (niveau 1). Conteneur de Séries. Table cms_podcast_shows.
// Aucune donnée créée automatiquement : l'admin saisit les émissions à la main.
export default function AdminPodcastShowsPage() {
  return (
    <CmsManager
      resource="podcast_shows"
      itemLabel="émission"
      previewable={false}
      title={<>Émissions <span className="text-cinematic-gold">podcast</span></>}
      description="Émissions de « La Voix du Royaume » (ex. L'Instant Citadelle). Chaque émission regroupe des séries."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true, placeholder: "ex: L'Instant Citadelle" },
        { name: 'slug', label: 'Slug', required: true, placeholder: 'ex: instant-citadelle',
          help: 'Identifiant d’URL stable et unique (minuscules, tirets). Évitez de le changer après publication.' },
        { name: 'short_description', label: 'Description courte', placeholder: 'Pour les cartes', hideInTable: true },
        { name: 'description', label: 'Description complète', type: 'textarea', hideInTable: true },
        { name: 'cover_url', label: 'Couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
