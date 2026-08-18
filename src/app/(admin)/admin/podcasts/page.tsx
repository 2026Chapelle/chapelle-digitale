'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

// PODCAST-0B — modèle éditorial. `access_level` est une donnée éditoriale (badge,
// tri), PAS un verrou de lecture (la RLS laisse lire tout épisode publié).
const ACCESS = [
  { value: 'public', label: 'Public (écoute libre)' },
  { value: 'member', label: 'Membre' },
  { value: 'premium', label: 'Premium' },
]

export default function AdminPodcastsPage() {
  return (
    <CmsManager
      resource="podcasts"
      itemLabel="podcast"
      title={<>Podcasts</>}
      description="Gérez les épisodes audio et leurs métadonnées."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'serie', label: 'Émission', placeholder: "ex: L'Instant Citadelle" },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'audio_url', label: 'Lien audio', type: 'url' },
        { name: 'youtube_url', label: 'Lien YouTube', type: 'url', hideInTable: true },
        { name: 'cover_url', label: 'Image', type: 'url', hideInTable: true },
        { name: 'access_level', label: 'Accès', type: 'select', options: ACCESS, default: 'member' },
        {
          // Case dédiée : désigne cet épisode comme « L'Instant Citadelle » (aperçu gratuit
          // accueil). Mappée serveur ↔ destination home_instant, garde-fou Premium + slot
          // unique appliqués côté API. N'altère JAMAIS access_level.
          name: 'is_home_instant', label: "L'Instant Citadelle — écoute gratuite sur l'accueil",
          type: 'boolean', default: false, hideInTable: true,
          help: "Cet épisode pourra être écouté gratuitement depuis la carte L'Instant Citadelle de l'accueil. Son accès normal dans /podcast reste inchangé. Emplacement UNIQUE : l'activer remplace l'épisode actuellement désigné. (Un épisode Premium ne peut pas être choisi.)",
        },
        {
          // Emplacements éditoriaux avancés (clés techniques) : catalog = catalogue /podcast ;
          // home_premium = Accueil Premium ; featured = rail « À la une » de /podcast.
          // NB : « L'Instant Citadelle » (home_instant) se gère via la case ci-dessus.
          name: 'destinations', label: 'Destinations (avancé)', type: 'tags', hideInTable: true,
          placeholder: 'catalog · home_premium · featured',
        },
        { name: 'is_featured', label: 'À la une (/podcast)', type: 'boolean', default: false },
        { name: 'saison', label: 'Saison', type: 'number', hideInTable: true },
        { name: 'episode', label: 'Épisode', type: 'number' },
        { name: 'duration', label: 'Durée', placeholder: 'ex: 42 min', hideInTable: true },
        { name: 'published_at', label: 'Date de publication', type: 'datetime', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
