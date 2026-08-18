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

// PODCAST-SPINE — typologie d'épisode (migration 20260818120000).
const EPISODE_TYPES = [
  { value: 'standard', label: 'Épisode standard' },
  { value: 'special', label: 'Édition spéciale' },
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
        // ── Rattachement éditorial (PODCAST-SPINE) — chaîne dépendante ────────
        // Émission → Série (filtrée par émission) → Saison (filtrée par série).
        // Legacy : laisser vide ⇒ l'épisode retombe sur le champ « Émission (legacy) ».
        {
          name: 'show_id', label: 'Émission', type: 'ref-select', refResource: 'podcast_shows',
          emptyLabel: '— Aucune (legacy) —', hideInTable: true, clears: ['series_id', 'season_id'],
          refLabel: (r) => `${r.title || 'Sans titre'}${r.status === 'published' ? '' : ' · brouillon'}`,
          placeholder: 'UUID de l’émission (repli si liste indisponible)',
          help: 'Rattache l’épisode à une émission du nouveau modèle. Vide = compat legacy (champ « Émission (legacy) »).',
        },
        {
          name: 'series_id', label: 'Série', type: 'ref-select', refResource: 'podcast_series',
          emptyLabel: '— Choisir une série —', hideInTable: true, clears: ['season_id'], requires: 'show_id',
          refFilter: (r, ed) => r.show_id === ed.show_id,
          refLabel: (r) => `${r.title || 'Sans titre'}${r.status === 'published' ? '' : ' · brouillon'}`,
          placeholder: 'Choisir d’abord une émission',
          help: 'Filtrée par l’émission sélectionnée (activée après choix d’une émission).',
        },
        {
          name: 'season_id', label: 'Saison', type: 'ref-select', refResource: 'podcast_seasons',
          emptyLabel: '— Choisir une saison —', hideInTable: true, requires: 'series_id',
          refFilter: (r, ed) => r.series_id === ed.series_id,
          refLabel: (r) => `Saison ${r.season_number ?? '?'}${r.title ? ' · ' + r.title : ''}`,
          placeholder: 'Choisir d’abord une série',
          help: 'Filtrée par la série sélectionnée (activée après choix d’une série).',
        },
        {
          name: 'episode_type', label: 'Type d’épisode', type: 'select', options: EPISODE_TYPES, default: 'standard',
          help: 'Édition spéciale = format éditorial mis en valeur. La durée reste libre (aucune contrainte).',
        },
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
        { name: 'is_featured', label: 'À la une (/podcast)', type: 'boolean', default: false },
        // ── Champs éditoriaux optionnels (PODCAST-SPINE) ─────────────────────
        { name: 'a_retenir', label: 'À retenir', type: 'textarea', hideInTable: true,
          placeholder: 'Phrase courte à retenir (facultatif)' },
        { name: 'prayer_text', label: "Prière de l'épisode", type: 'textarea', hideInTable: true,
          placeholder: 'Facultatif' },
        { name: 'declaration_text', label: 'Déclaration du jour', type: 'textarea', hideInTable: true,
          placeholder: 'Facultatif' },
        { name: 'saison', label: 'Saison (nº legacy)', type: 'number', hideInTable: true,
          help: 'Ancien numéro libre. Le rattachement officiel se fait via la Saison ci-dessus.' },
        { name: 'episode', label: 'Épisode', type: 'number' },
        { name: 'duration', label: 'Durée', placeholder: 'ex: 42 min', hideInTable: true },
        { name: 'published_at', label: 'Date de publication', type: 'datetime', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
        // ── Legacy / avancé ──────────────────────────────────────────────────
        { name: 'serie', label: 'Émission (legacy, texte)', placeholder: "ex: L'Instant Citadelle", hideInTable: true,
          help: 'Ancien champ texte, conservé pour compatibilité. Utilisé seulement si aucune Émission relationnelle n’est choisie.' },
        {
          // Emplacements éditoriaux avancés (clés techniques) : catalog = catalogue /podcast ;
          // home_premium = Accueil Premium ; featured = rail « À la une » de /podcast.
          // NB : « L'Instant Citadelle » (home_instant) se gère via la case ci-dessus.
          name: 'destinations', label: 'Destinations (avancé)', type: 'tags', hideInTable: true,
          placeholder: 'catalog · home_premium · featured',
        },
      ]}
    />
  )
}
